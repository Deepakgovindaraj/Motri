import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { createFuelExpense } from '../expenses/expenses.service';
import { deleteFuelLog, listFuelLogs, ListFuelQuery } from './fuel.service';

export async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listFuelLogs(req.user!.id, req.query as unknown as ListFuelQuery);
    sendSuccess(res, result.items, 'Fuel logs retrieved successfully', 200, {
      pagination: result.pagination,
      summary: result.summary,
    });
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
    const result = await createFuelExpense(req.user!.id, req.body);
    sendSuccess(res, result, 'Fuel log recorded successfully', 201);
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
    await deleteFuelLog(req.user!.id, String(req.params.id));
    sendSuccess(res, { deleted: true }, 'Fuel log deleted successfully');
  } catch (error) {
    next(error);
  }
}
