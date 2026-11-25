import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import {
  createBudget,
  deleteBudget,
  getBudgetsProgress,
  listBudgets,
  updateBudget,
} from './budgets.service';

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const budget = await createBudget(req.user!.id, req.body);
    sendSuccess(res, budget, 'Budget created successfully', 201);
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
    const budgets = await listBudgets(req.user!.id);
    sendSuccess(res, budgets, 'Budgets retrieved successfully');
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
    const budget = await updateBudget(req.user!.id, String(req.params.id), req.body);
    sendSuccess(res, budget, 'Budget updated successfully');
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
    await deleteBudget(req.user!.id, String(req.params.id));
    sendSuccess(res, { deleted: true }, 'Budget deleted successfully');
  } catch (error) {
    next(error);
  }
}

export async function progress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await getBudgetsProgress(req.user!.id);
    sendSuccess(res, items, 'Budget progress retrieved successfully');
  } catch (error) {
    next(error);
  }
}
