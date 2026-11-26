import { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import {
  getCurrentUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  resetUserPassword,
  rotateRefreshToken,
} from './auth.service';

const REFRESH_COOKIE_NAME = 'vehixa_refresh_token';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await registerUser(req.body, {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, result, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await loginUser(req.body, {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
}

export async function googleAuth(_req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!env.GOOGLE_CLIENT_ID) {
    next(
      new AppError(
        'Google OAuth is not configured on this server. Set GOOGLE_CLIENT_ID in environment variables.',
        501,
        'OAUTH_NOT_CONFIGURED',
      ),
    );
    return;
  }
  next(new AppError('Google ID token verification not yet enabled', 501, 'OAUTH_NOT_IMPLEMENTED'));
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken =
      (req.body?.refreshToken as string | undefined) ||
      (req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined);

    if (!rawToken) {
      throw new AppError('Refresh token is required', 401, 'REFRESH_TOKEN_MISSING');
    }

    const tokens = await rotateRefreshToken(rawToken, {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });
    setRefreshCookie(res, tokens.refreshToken);
    sendSuccess(res, tokens, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
}

export async function logout(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawToken =
      (req.body?.refreshToken as string | undefined) ||
      (req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined);
    await logoutUser(rawToken, req.user?.id);
    clearRefreshCookie(res);
    sendSuccess(res, { loggedOut: true }, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await requestPasswordReset(req.body.email);
    sendSuccess(
      res,
      { requested: true },
      'If an account exists for that email, reset instructions have been generated.',
    );
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await resetUserPassword(req.body.token, req.body.password);
    sendSuccess(res, { reset: true }, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
}

export async function me(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    const profile = await getCurrentUserProfile(req.user.id);
    sendSuccess(res, profile, 'Profile retrieved');
  } catch (error) {
    next(error);
  }
}
