import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { create, list, progress, remove, update } from './budgets.controller';
import {
  budgetIdParamSchema,
  createBudgetSchema,
  updateBudgetSchema,
} from './budgets.validation';

const router = Router();

router.use(authenticate);

router.get('/progress', progress);
router.post('/', validate({ body: createBudgetSchema }), create);
router.get('/', list);
router.put('/:id', validate({ params: budgetIdParamSchema, body: updateBudgetSchema }), update);
router.delete('/:id', validate({ params: budgetIdParamSchema }), remove);

export default router;
