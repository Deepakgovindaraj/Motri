import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { createFuelExpenseSchema } from '../expenses/expenses.validation';
import { create, list, remove } from './fuel.controller';
import { fuelIdParamSchema, listFuelQuerySchema } from './fuel.service';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: listFuelQuerySchema }), list);
router.post('/', validate({ body: createFuelExpenseSchema }), create);
router.delete('/:id', validate({ params: fuelIdParamSchema }), remove);

export default router;
