import mongoose from 'mongoose';
import {
  AuditLog,
  Budget,
  Expense,
  ExpenseCategory,
  Notification,
  Vehicle,
} from '../../models';
import { decimalToNumber, toDecimal128 } from '../../utils/calculations';
import { AppError } from '../../utils/errors';
import { CreateBudgetInput, UpdateBudgetInput } from './budgets.validation';

export type BudgetAlertLevel = 'ok' | 'warning_75' | 'critical_90' | 'exceeded_100';

export interface BudgetProgressItem {
  _id: string;
  period: string;
  startDate: Date;
  endDate: Date;
  category: { _id: string; name: string; slug: string; color: string } | null;
  vehicle: { _id: string; vehicleName: string; registrationNumber: string } | null;
  totalBudget: number;
  amountSpent: number;
  remainingBudget: number;
  spendingPercentage: number;
  alertLevel: BudgetAlertLevel;
  triggeredThreshold: number | null;
}

function classifyBudgetAlert(percentage: number): {
  alertLevel: BudgetAlertLevel;
  triggeredThreshold: number | null;
} {
  if (percentage >= 100) return { alertLevel: 'exceeded_100', triggeredThreshold: 100 };
  if (percentage >= 90) return { alertLevel: 'critical_90', triggeredThreshold: 90 };
  if (percentage >= 75) return { alertLevel: 'warning_75', triggeredThreshold: 75 };
  return { alertLevel: 'ok', triggeredThreshold: null };
}

export async function createBudget(userId: string, input: CreateBudgetInput) {
  let resolvedCategoryId = input.categoryId;

  if (!resolvedCategoryId && input.categorySlug) {
    const cat = await ExpenseCategory.findOne({ slug: input.categorySlug.toLowerCase() });
    if (!cat) throw new AppError('Expense category not found', 404, 'CATEGORY_NOT_FOUND');
    resolvedCategoryId = cat._id.toString();
  } else if (resolvedCategoryId) {
    const cat = await ExpenseCategory.findById(resolvedCategoryId);
    if (!cat) throw new AppError('Expense category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  if (input.vehicleId) {
    const vehicle = await Vehicle.findOne({ _id: input.vehicleId, userId });
    if (!vehicle) throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
  }

  const budget = await Budget.create({
    userId,
    categoryId: resolvedCategoryId,
    vehicleId: input.vehicleId,
    amount: toDecimal128(input.amount),
    period: input.period,
    startDate: input.startDate,
    endDate: input.endDate,
    alertThresholds: input.alertThresholds ?? [75, 90, 100],
  });

  await AuditLog.create({
    userId,
    action: 'BUDGET_CREATED',
    resourceType: 'Budget',
    resourceId: budget._id.toString(),
    metadata: { amount: input.amount, period: input.period },
  });

  return budget.populate([
    { path: 'categoryId', select: 'name slug color icon' },
    { path: 'vehicleId', select: 'vehicleName registrationNumber vehicleType' },
  ]);
}

export async function listBudgets(userId: string) {
  return Budget.find({ userId })
    .populate('categoryId', 'name slug color icon')
    .populate('vehicleId', 'vehicleName registrationNumber vehicleType')
    .sort({ startDate: -1, createdAt: -1 });
}

export async function updateBudget(userId: string, budgetId: string, input: UpdateBudgetInput) {
  const budget = await Budget.findOne({ _id: budgetId, userId });
  if (!budget) throw new AppError('Budget not found', 404, 'BUDGET_NOT_FOUND');

  if (input.vehicleId) {
    const vehicle = await Vehicle.findOne({ _id: input.vehicleId, userId });
    if (!vehicle) throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
    budget.vehicleId = vehicle._id;
  } else if (input.vehicleId === null) {
    budget.vehicleId = undefined;
  }

  if (input.categoryId) {
    const category = await ExpenseCategory.findById(input.categoryId);
    if (!category) throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    budget.categoryId = category._id;
  } else if (input.categoryId === null) {
    budget.categoryId = undefined;
  }

  if (input.amount !== undefined) budget.amount = toDecimal128(input.amount);
  if (input.period !== undefined) budget.period = input.period;
  if (input.startDate !== undefined) budget.startDate = input.startDate;
  if (input.endDate !== undefined) budget.endDate = input.endDate;

  if (budget.endDate < budget.startDate) {
    throw new AppError('End date must be on or after start date', 400, 'INVALID_DATE_RANGE');
  }

  await budget.save();

  return budget.populate([
    { path: 'categoryId', select: 'name slug color icon' },
    { path: 'vehicleId', select: 'vehicleName registrationNumber vehicleType' },
  ]);
}

export async function deleteBudget(userId: string, budgetId: string): Promise<void> {
  const deleted = await Budget.findOneAndDelete({ _id: budgetId, userId });
  if (!deleted) throw new AppError('Budget not found', 404, 'BUDGET_NOT_FOUND');
}

export async function getBudgetsProgress(userId: string): Promise<BudgetProgressItem[]> {
  const budgets = await Budget.find({ userId })
    .populate('categoryId', 'name slug color')
    .populate('vehicleId', 'vehicleName registrationNumber')
    .sort({ startDate: -1, createdAt: -1 });

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const progressList = await Promise.all(
    budgets.map(async (budget) => {
      const cat = budget.categoryId as unknown as {
        _id: mongoose.Types.ObjectId;
        name: string;
        slug: string;
        color: string;
      } | null;
      const veh = budget.vehicleId as unknown as {
        _id: mongoose.Types.ObjectId;
        vehicleName: string;
        registrationNumber: string;
      } | null;

      const matchStage: Record<string, unknown> = {
        userId: userObjectId,
        expenseDate: { $gte: budget.startDate, $lte: budget.endDate },
      };
      if (cat?._id) matchStage.categoryId = cat._id;
      if (veh?._id) matchStage.vehicleId = veh._id;

      const agg = await Expense.aggregate<{ _id: null; spent: unknown }>([
        { $match: matchStage },
        { $group: { _id: null, spent: { $sum: '$amount' } } },
      ]);

      const totalBudget = decimalToNumber(budget.amount);
      const amountSpent = agg[0]
        ? Number(
            decimalToNumber(agg[0].spent as Parameters<typeof decimalToNumber>[0]).toFixed(2),
          )
        : 0;
      const remainingBudget = Number((totalBudget - amountSpent).toFixed(2));
      const spendingPercentage =
        totalBudget > 0 ? Number(((amountSpent / totalBudget) * 100).toFixed(1)) : 0;
      const { alertLevel, triggeredThreshold } = classifyBudgetAlert(spendingPercentage);

      return {
        _id: budget._id.toString(),
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        category: cat
          ? { _id: cat._id.toString(), name: cat.name, slug: cat.slug, color: cat.color }
          : null,
        vehicle: veh
          ? {
              _id: veh._id.toString(),
              vehicleName: veh.vehicleName,
              registrationNumber: veh.registrationNumber,
            }
          : null,
        totalBudget,
        amountSpent,
        remainingBudget,
        spendingPercentage,
        alertLevel,
        triggeredThreshold,
      };
    }),
  );

  return progressList;
}

export async function evaluateBudgetAlertsForExpense(
  userId: string,
  expenseDate: Date,
  vehicleId: string,
  categoryId: string,
): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const matchingBudgets = await Budget.find({
    userId: userObjectId,
    startDate: { $lte: expenseDate },
    endDate: { $gte: expenseDate },
    $and: [
      { $or: [{ vehicleId: { $exists: false } }, { vehicleId: null }, { vehicleId }] },
      { $or: [{ categoryId: { $exists: false } }, { categoryId: null }, { categoryId }] },
    ],
  });

  for (const budget of matchingBudgets) {
    const matchStage: Record<string, unknown> = {
      userId: userObjectId,
      expenseDate: { $gte: budget.startDate, $lte: budget.endDate },
    };
    if (budget.vehicleId) matchStage.vehicleId = budget.vehicleId;
    if (budget.categoryId) matchStage.categoryId = budget.categoryId;

    const agg = await Expense.aggregate<{ _id: null; spent: unknown }>([
      { $match: matchStage },
      { $group: { _id: null, spent: { $sum: '$amount' } } },
    ]);

    const totalBudget = decimalToNumber(budget.amount);
    const spent = agg[0]
      ? decimalToNumber(agg[0].spent as Parameters<typeof decimalToNumber>[0])
      : 0;
    const pct = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;

    const thresholds = [...(budget.alertThresholds || [75, 90, 100])].sort((a, b) => b - a);
    const crossed = thresholds.find((t) => pct >= t);
    if (!crossed) continue;

    const existingAlert = await Notification.findOne({
      userId: userObjectId,
      type: 'budget_alert',
      'metadata.budgetId': budget._id.toString(),
      'metadata.threshold': crossed,
    });

    if (!existingAlert) {
      await Notification.create({
        userId: userObjectId,
        type: 'budget_alert',
        title: `Budget Alert: ${crossed}% reached`,
        body: `Spending has reached ${pct.toFixed(1)}% (${spent.toFixed(2)} of ${totalBudget.toFixed(2)}) for your ${budget.period} budget.`,
        metadata: {
          budgetId: budget._id.toString(),
          threshold: crossed,
          spendingPercentage: Number(pct.toFixed(1)),
        },
      });
    }
  }
}
