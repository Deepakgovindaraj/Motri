import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { env } from '../../config/env';
import {
  AuditLog,
  RefreshToken,
  Subscription,
  SubscriptionPlan,
  User,
  UserPreference,
} from '../../models';
import { AppError } from '../../utils/errors';
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { LoginInput, RegisterInput } from './auth.validation';

interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

async function issueTokens(
  user: { _id: { toString(): string }; email: string; role: 'USER' | 'ADMIN' },
  meta: SessionMeta = {},
): Promise<AuthTokens> {
  const userId = user._id.toString();
  const accessToken = signAccessToken({
    sub: userId,
    email: user.email,
    role: user.role,
  });

  const { token: refreshToken, jti, expiresAt } = signRefreshToken(userId);
  await RefreshToken.create({
    userId,
    tokenHash: hashToken(refreshToken),
    jti,
    expiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterInput, meta: SessionMeta = {}) {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: 'USER',
    isVerified: false,
    emailVerificationTokenHash: hashToken(verificationToken),
  });

  const preferences = await UserPreference.create({
    userId: user._id,
  });

  const freePlan = await SubscriptionPlan.findOne({ code: 'FREE' });
  if (freePlan) {
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 10);
    await Subscription.create({
      userId: user._id,
      planId: freePlan._id,
      status: 'active',
      billingCycle: 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    });
  }

  const tokens = await issueTokens(user, meta);

  await AuditLog.create({
    userId: user._id,
    action: 'USER_REGISTERED',
    resourceType: 'User',
    resourceId: user._id.toString(),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return {
    user: user.toJSON(),
    preferences,
    ...tokens,
  };
}

export async function loginUser(input: LoginInput, meta: SessionMeta = {}) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const preferences =
    (await UserPreference.findOne({ userId: user._id })) ??
    (await UserPreference.create({ userId: user._id }));

  const tokens = await issueTokens(user, meta);

  await AuditLog.create({
    userId: user._id,
    action: 'USER_LOGGED_IN',
    resourceType: 'User',
    resourceId: user._id.toString(),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return {
    user: user.toJSON(),
    preferences,
    ...tokens,
  };
}

export async function rotateRefreshToken(rawToken: string, meta: SessionMeta = {}) {
  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401, 'REFRESH_TOKEN_INVALID');
  }

  const tokenHash = hashToken(rawToken);
  const stored = await RefreshToken.findOne({ tokenHash, jti: payload.jti });

  if (!stored) {
    throw new AppError('Refresh token not recognized', 401, 'REFRESH_TOKEN_INVALID');
  }

  if (stored.revokedAt) {
    // Reuse detected: revoke all active tokens for this user
    await RefreshToken.updateMany(
      { userId: stored.userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    throw new AppError('Refresh token has been revoked', 401, 'REFRESH_TOKEN_REUSED');
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    stored.revokedAt = new Date();
    await stored.save();
    throw new AppError('Refresh token has expired', 401, 'REFRESH_TOKEN_EXPIRED');
  }

  const user = await User.findById(stored.userId);
  if (!user) {
    throw new AppError('User account not found', 401, 'USER_NOT_FOUND');
  }

  const tokens = await issueTokens(user, meta);
  stored.revokedAt = new Date();
  stored.replacedByTokenHash = hashToken(tokens.refreshToken);
  await stored.save();

  return tokens;
}

export async function logoutUser(rawToken?: string, userId?: string): Promise<void> {
  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await RefreshToken.updateOne(
      { tokenHash, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  } else if (userId) {
    await RefreshToken.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email });
  if (!user) {
    // Never reveal email existence
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashToken(rawToken);
  user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
}

export async function resetUserPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt');

  if (!user) {
    throw new AppError('Invalid or expired password reset token', 400, 'INVALID_RESET_TOKEN');
  }

  user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

export async function getCurrentUserProfile(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  const preferences =
    (await UserPreference.findOne({ userId: user._id })) ??
    (await UserPreference.create({ userId: user._id }));

  return {
    user: user.toJSON(),
    preferences,
  };
}
