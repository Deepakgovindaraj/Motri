import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { createMaintenanceExpense } from '../expenses/expenses.service';
import {
  deleteMaintenanceRecord,
  getMaintenanceReminders,
  listMaintenanceRecords,
  ListMaintenanceQuery,
} from './maintenance.service';

export async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listMaintenanceRecords(
      req.user!.id,
      req.query as unknown as ListMaintenanceQuery,
    );
    sendSuccess(res, result.items, 'Maintenance records retrieved successfully', 200, {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function reminders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await getMaintenanceReminders(req.user!.id);
    sendSuccess(res, data, 'Maintenance reminders retrieved');
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
    const result = await createMaintenanceExpense(req.user!.id, req.body);
    sendSuccess(res, result, 'Maintenance record created successfully', 201);
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
    await deleteMaintenanceRecord(req.user!.id, String(req.params.id));
    sendSuccess(res, { deleted: true }, 'Maintenance record deleted successfully');
  } catch (error) {
    next(error);
  }
}
