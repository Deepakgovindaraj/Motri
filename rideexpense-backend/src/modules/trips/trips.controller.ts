import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import {
  addTripLocations,
  completeTrip,
  createTrip,
  deleteTrip,
  getTripById,
  listTripPurposes,
  listTrips,
  updateTrip,
} from './trips.service';
import { ListTripsQuery } from './trips.validation';

export async function getPurposes(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const purposes = await listTripPurposes(req.user!.id);
    sendSuccess(res, purposes, 'Trip purposes retrieved');
  } catch (error) {
    next(error);
  }
}

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const trip = await createTrip(req.user!.id, req.body);
    sendSuccess(res, trip, 'Trip created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listTrips(req.user!.id, req.query as unknown as ListTripsQuery);
    sendSuccess(res, result.items, 'Trips retrieved successfully', 200, {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await getTripById(req.user!.id, String(req.params.id));
    sendSuccess(res, data, 'Trip retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const trip = await updateTrip(req.user!.id, String(req.params.id), req.body);
    sendSuccess(res, trip, 'Trip updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteTrip(req.user!.id, String(req.params.id));
    sendSuccess(res, { deleted: true }, 'Trip deleted successfully');
  } catch (error) {
    next(error);
  }
}

export async function recordLocations(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await addTripLocations(req.user!.id, String(req.params.id), req.body);
    sendSuccess(res, result, 'Trip locations processed');
  } catch (error) {
    next(error);
  }
}

export async function complete(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const trip = await completeTrip(req.user!.id, String(req.params.id), req.body);
    sendSuccess(res, trip, 'Trip completed successfully');
  } catch (error) {
    next(error);
  }
}
