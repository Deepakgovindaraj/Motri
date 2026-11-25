import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authRateLimiter } from '../../middleware/rateLimit.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  forgotPassword,
  googleAuth,
  login,
  logout,
  me,
  refresh,
  register,
  resetPassword,
} from './auth.controller';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.validation';

const router = Router();

router.post('/register', authRateLimiter, validate({ body: registerSchema }), register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), login);
router.post('/google', authRateLimiter, googleAuth);
router.post('/refresh', validate({ body: refreshSchema }), refresh);
router.post('/logout', logout);
router.post('/forgot-password', authRateLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
router.post('/reset-password', authRateLimiter, validate({ body: resetPasswordSchema }), resetPassword);
router.get('/me', authenticate, me);

export default router;
