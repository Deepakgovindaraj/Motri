import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { createMaintenanceExpenseSchema } from '../expenses/expenses.validation';
import { create, list, reminders, remove } from './maintenance.controller';
import { listMaintenanceQuerySchema, maintenanceIdParamSchema } from './maintenance.service';

const router = Router();

router.use(authenticate);

router.get('/reminders', reminders);
router.get('/', validate({ query: listMaintenanceQuerySchema }), list);
router.post('/', validate({ body: createMaintenanceExpenseSchema }), create);
router.delete('/:id', validate({ params: maintenanceIdParamSchema }), remove);

export default router;
