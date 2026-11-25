import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  create,
  createFuel,
  createMaintenance,
  getById,
  getCategories,
  list,
  remove,
  update,
} from './expenses.controller';
import {
  createExpenseSchema,
  createFuelExpenseSchema,
  createMaintenanceExpenseSchema,
  expenseIdParamSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from './expenses.validation';

const router = Router();

router.use(authenticate);

router.get('/categories', getCategories);
router.post('/fuel', validate({ body: createFuelExpenseSchema }), createFuel);
router.post(
  '/maintenance',
  validate({ body: createMaintenanceExpenseSchema }),
  createMaintenance,
);
router.post('/', validate({ body: createExpenseSchema }), create);
router.get('/', validate({ query: listExpensesQuerySchema }), list);
router.get('/:id', validate({ params: expenseIdParamSchema }), getById);
router.put('/:id', validate({ params: expenseIdParamSchema, body: updateExpenseSchema }), update);
router.delete('/:id', validate({ params: expenseIdParamSchema }), remove);

export default router;
