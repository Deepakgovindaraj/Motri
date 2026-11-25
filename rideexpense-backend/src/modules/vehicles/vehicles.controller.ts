import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import {
  createVehicle,
  deleteVehicle,
  getVehicleById,
  listVehicles,
  updateVehicle,
} from './vehicles.service';
import { ListVehiclesQuery } from './vehicles.validation';

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const vehicle = await createVehicle(req.user!.id, req.body);
    sendSuccess(res, vehicle, 'Vehicle created successfully', 201);
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
    const result = await listVehicles(req.user!.id, req.query as unknown as ListVehiclesQuery);
    sendSuccess(res, result.items, 'Vehicles retrieved successfully', 200, {
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
    const vehicle = await getVehicleById(req.user!.id, String(req.params.id));
    sendSuccess(res, vehicle, 'Vehicle retrieved successfully');
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
    const vehicle = await updateVehicle(req.user!.id, String(req.params.id), req.body);
    sendSuccess(res, vehicle, 'Vehicle updated successfully');
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
    await deleteVehicle(req.user!.id, String(req.params.id));
    sendSuccess(res, { deleted: true }, 'Vehicle deleted successfully');
  } catch (error) {
    next(error);
  }
}
