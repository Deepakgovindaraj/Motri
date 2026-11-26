import { NextFunction, Response, Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { Notification } from '../../models';
import { AppError } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';

const router = Router();
router.use(authenticate);

const idParamSchema = z.object({
  id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid notification ID'),
});

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const [items, unreadCount] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(30),
      Notification.countDocuments({ userId, isRead: false }),
    ]);
    sendSuccess(res, items, 'Notifications retrieved', 200, { unreadCount });
  } catch (error) {
    next(error);
  }
});

router.patch('/read-all', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany({ userId: req.user!.id, isRead: false }, { $set: { isRead: true } });
    sendSuccess(res, { updated: true }, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/:id/read',
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const updated = await Notification.findOneAndUpdate(
        { _id: String(req.params.id), userId: req.user!.id },
        { $set: { isRead: true } },
        { new: true },
      );
      if (!updated) {
        throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
      }
      sendSuccess(res, updated, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  },
);

export default router;
