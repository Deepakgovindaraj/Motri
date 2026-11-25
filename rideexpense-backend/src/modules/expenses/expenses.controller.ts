import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import {
  createExpense,
  createFuelExpense,
  createMaintenanceExpense,
  deleteExpense,
  getExpenseById,
  listExpenseCategories,
  listExpenses,
  updateExpense,
} from './expenses.service';
import { ListExpensesQuery } from './expenses.validation';

export async function getCategories(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await listExpenseCategories();
    sendSuccess(res, categories, 'Expense categories retrieved');
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
    const expense = await createExpense(req.user!.id, req.body);
    sendSuccess(res, expense, 'Expense created successfully', 201);
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
    const result = await listExpenses(req.user!.id, req.query as unknown as ListExpensesQuery);
    sendSuccess(res, result.items, 'Expenses retrieved successfully', 200, {
      pagination: result.pagination,
      totalAmount: result.totalAmount,
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
    const data = await getExpenseById(req.user!.id, String(req.params.id));
    sendSuccess(res, data, 'Expense retrieved successfully');
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
    const expense = await updateExpense(req.user!.id, String(req.params.id), req.body);
    sendSuccess(res, expense, 'Expense updated successfully');
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
    await deleteExpense(req.user!.id, String(req.params.id));
    sendSuccess(res, { deleted: true }, 'Expense deleted successfully');
  } catch (error) {
    next(error);
  }
}

export async function createFuel(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await createFuelExpense(req.user!.id, req.body);
    sendSuccess(res, result, 'Fuel expense recorded successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function createMaintenance(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await createMaintenanceExpense(req.user!.id, req.body);
    sendSuccess(res, result, 'Maintenance expense recorded successfully', 201);
  } catch (error) {
    next(error);
  }
}
