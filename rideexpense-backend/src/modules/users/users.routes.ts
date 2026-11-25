import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { getProfile, updateProfile } from './users.controller';
import { updateProfileSchema } from './users.validation';

const router = Router();

router.use(authenticate);
router.get('/me', getProfile);
router.put('/me', validate({ body: updateProfileSchema }), updateProfile);

export default router;
