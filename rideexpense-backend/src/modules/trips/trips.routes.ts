import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  complete,
  create,
  getById,
  getPurposes,
  list,
  recordLocations,
  remove,
  update,
} from './trips.controller';
import {
  addTripLocationsSchema,
  completeTripSchema,
  createTripSchema,
  listTripsQuerySchema,
  tripIdParamSchema,
  updateTripSchema,
} from './trips.validation';

const router = Router();

router.use(authenticate);

router.get('/purposes', getPurposes);
router.post('/', validate({ body: createTripSchema }), create);
router.get('/', validate({ query: listTripsQuerySchema }), list);
router.get('/:id', validate({ params: tripIdParamSchema }), getById);
router.put('/:id', validate({ params: tripIdParamSchema, body: updateTripSchema }), update);
router.delete('/:id', validate({ params: tripIdParamSchema }), remove);
router.post(
  '/:id/locations',
  validate({ params: tripIdParamSchema, body: addTripLocationsSchema }),
  recordLocations,
);
router.post(
  '/:id/complete',
  validate({ params: tripIdParamSchema, body: completeTripSchema }),
  complete,
);

export default router;
