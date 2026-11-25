import { NextFunction, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import {
  getCostPerKmAnalytics,
  getDashboardAnalytics,
  getMileageAnalytics,
  getMonthlyAndPeriodReports,
  getVehicleComparisonAnalytics,
} from './analytics.service';

export const analyticsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  vehicleId: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid vehicleId')
    .optional(),
});

export async function dashboard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await getDashboardAnalytics(req.user!.id);
    sendSuccess(res, data, 'Dashboard analytics retrieved');
  } catch (error) {
    next(error);
  }
}

export async function monthly(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const vehicleId = req.query.vehicleId ? String(req.query.vehicleId) : undefined;
    const data = await getMonthlyAndPeriodReports(req.user!.id, year, vehicleId);
    sendSuccess(res, data, 'Monthly and periodic reports retrieved');
  } catch (error) {
    next(error);
  }
}

export async function mileage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const vehicleId = req.query.vehicleId ? String(req.query.vehicleId) : undefined;
    const data = await getMileageAnalytics(req.user!.id, vehicleId);
    sendSuccess(res, data, 'Mileage analytics retrieved');
  } catch (error) {
    next(error);
  }
}

export async function costPerKm(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const vehicleId = req.query.vehicleId ? String(req.query.vehicleId) : undefined;
    const data = await getCostPerKmAnalytics(req.user!.id, vehicleId);
    sendSuccess(res, data, 'Cost per kilometre analytics retrieved');
  } catch (error) {
    next(error);
  }
}

export async function comparison(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await getVehicleComparisonAnalytics(req.user!.id);
    sendSuccess(res, data, 'Vehicle comparison retrieved');
  } catch (error) {
    next(error);
  }
}
