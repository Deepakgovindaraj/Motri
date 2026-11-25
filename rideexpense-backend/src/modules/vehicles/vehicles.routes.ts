import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { create, getById, list, remove, update } from './vehicles.controller';
import {
  createVehicleSchema,
  listVehiclesQuerySchema,
  updateVehicleSchema,
  vehicleIdParamSchema,
} from './vehicles.validation';

const router = Router();

router.use(authenticate);

router.post('/', validate({ body: createVehicleSchema }), create);
router.get('/', validate({ query: listVehiclesQuerySchema }), list);
router.get('/:id', validate({ params: vehicleIdParamSchema }), getById);
router.put('/:id', validate({ params: vehicleIdParamSchema, body: updateVehicleSchema }), update);
router.delete('/:id', validate({ params: vehicleIdParamSchema }), remove);

export default router;
