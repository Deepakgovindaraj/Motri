import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { User, UserPreference } from '../../models';
import { AppError } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import { UpdateProfileInput } from './users.validation';

export async function getProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    const preferences =
      (await UserPreference.findOne({ userId: user._id })) ??
      (await UserPreference.create({ userId: user._id }));

    sendSuccess(res, { user: user.toJSON(), preferences }, 'User profile retrieved');
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as UpdateProfileInput;
    const user = await User.findById(req.user!.id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (body.name !== undefined) user.name = body.name;
    if (body.profileImage !== undefined) user.profileImage = body.profileImage || undefined;
    await user.save();

    let preferences = await UserPreference.findOne({ userId: user._id });
    if (!preferences) {
      preferences = await UserPreference.create({ userId: user._id, ...(body.preferences ?? {}) });
    } else if (body.preferences) {
      Object.assign(preferences, body.preferences);
      await preferences.save();
    }

    sendSuccess(res, { user: user.toJSON(), preferences }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
}
