import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  analyticsQuerySchema,
  comparison,
  costPerKm,
  dashboard,
  mileage,
  monthly,
} from './analytics.controller';

const router = Router();

router.use(authenticate);

router.get('/dashboard', dashboard);
router.get('/monthly', validate({ query: analyticsQuerySchema }), monthly);
router.get('/mileage', validate({ query: analyticsQuerySchema }), mileage);
router.get('/cost-per-km', validate({ query: analyticsQuerySchema }), costPerKm);
router.get('/comparison', comparison);

export default router;
