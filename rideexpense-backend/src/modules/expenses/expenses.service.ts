import mongoose, { FilterQuery } from 'mongoose';
import {
  AuditLog,
  Expense,
  ExpenseAttachment,
  ExpenseCategory,
  FuelLog,
  MaintenanceRecord,
  OdometerReading,
  Trip,
  UserPreference,
  Vehicle,
} from '../../models';
import { IExpense } from '../../models/Expense';
import { calculateFuelCost, decimalToNumber, toDecimal128 } from '../../utils/calculations';
import { AppError } from '../../utils/errors';
import { evaluateBudgetAlertsForExpense } from '../budgets/budgets.service';
import {
  CreateExpenseInput,
  CreateFuelExpenseInput,
  CreateMaintenanceExpenseInput,
  ListExpensesQuery,
  UpdateExpenseInput,
} from './expenses.validation';

const SERVICE_TYPE_CATEGORY_SLUG: Record<CreateMaintenanceExpenseInput['serviceType'], string> = {
  Servicing: 'maintenance',
  'Engine oil': 'engine-oil',
  'Tyre replacement': 'tyres',
  'Battery replacement': 'repairs',
  Repairs: 'repairs',
  Insurance: 'insurance',
  Other: 'maintenance',
};

async function getUserCurrency(userId: string): Promise<string> {
  const pref = await UserPreference.findOne({ userId });
  return pref?.currency ?? 'USD';
}

export async function listExpenseCategories() {
  return ExpenseCategory.find({}).sort({ isSystem: -1, name: 1 });
}

export async function createExpense(userId: string, input: CreateExpenseInput) {
  const vehicle = await Vehicle.findOne({ _id: input.vehicleId, userId });
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
  }

  if (input.tripId) {
    const trip = await Trip.findOne({ _id: input.tripId, userId });
    if (!trip) {
      throw new AppError('Referenced trip not found', 404, 'TRIP_NOT_FOUND');
    }
  }

  const category = input.categoryId
    ? await ExpenseCategory.findById(input.categoryId)
    : await ExpenseCategory.findOne({ slug: input.categorySlug?.toLowerCase() });

  if (!category) {
    throw new AppError('Expense category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  const currency = input.currency ?? (await getUserCurrency(userId));

  const expenseDate = input.expenseDate ?? new Date();
  const expense = await Expense.create({
    userId,
    vehicleId: vehicle._id,
    tripId: input.tripId,
    categoryId: category._id,
    amount: toDecimal128(input.amount),
    currency,
    paymentMethod: input.paymentMethod,
    description: input.description,
    expenseDate,
    attachmentUrl: input.attachmentUrl || undefined,
  });

  await evaluateBudgetAlertsForExpense(
    userId,
    expenseDate,
    vehicle._id.toString(),
    category._id.toString(),
  );

  await AuditLog.create({
    userId,
    action: 'EXPENSE_CREATED',
    resourceType: 'Expense',
    resourceId: expense._id.toString(),
    metadata: { category: category.slug, amount: input.amount },
  });

  return expense.populate([
    { path: 'vehicleId', select: 'vehicleName registrationNumber vehicleType' },
    { path: 'categoryId', select: 'name slug icon color' },
  ]);
}

export async function listExpenses(userId: string, query: ListExpensesQuery) {
  const filter: FilterQuery<IExpense> = { userId: new mongoose.Types.ObjectId(userId) };

  if (query.vehicleId) filter.vehicleId = new mongoose.Types.ObjectId(query.vehicleId);
  if (query.categoryId) filter.categoryId = new mongoose.Types.ObjectId(query.categoryId);
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;

  if (query.startDate || query.endDate) {
    filter.expenseDate = {
      ...(query.startDate ? { $gte: query.startDate } : {}),
      ...(query.endDate ? { $lte: query.endDate } : {}),
    };
  }

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    filter.amount = {
      ...(query.minAmount !== undefined ? { $gte: toDecimal128(query.minAmount) } : {}),
      ...(query.maxAmount !== undefined ? { $lte: toDecimal128(query.maxAmount) } : {}),
    };
  }

  if (query.q) {
    const regex = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.description = regex;
  }

  const skip = (query.page - 1) * query.limit;
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

  const [items, total, summaryAgg] = await Promise.all([
    Expense.find(filter)
      .populate('vehicleId', 'vehicleName registrationNumber vehicleType')
      .populate('categoryId', 'name slug icon color')
      .sort({ [query.sortBy]: sortDirection, createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Expense.countDocuments(filter),
    Expense.aggregate<{ _id: null; totalAmount: unknown }>([
      { $match: filter },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]),
  ]);

  const totalAmount = summaryAgg[0]
    ? decimalToNumber(summaryAgg[0].totalAmount as Parameters<typeof decimalToNumber>[0])
    : 0;

  return {
    items,
    totalAmount,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getExpenseById(userId: string, expenseId: string) {
  const expense = await Expense.findOne({ _id: expenseId, userId }).populate([
    { path: 'vehicleId', select: 'vehicleName registrationNumber vehicleType' },
    { path: 'categoryId', select: 'name slug icon color' },
  ]);
  if (!expense) {
    throw new AppError('Expense not found', 404, 'EXPENSE_NOT_FOUND');
  }

  const [fuelLog, maintenanceRecord] = await Promise.all([
    FuelLog.findOne({ expenseId: expense._id, userId }),
    MaintenanceRecord.findOne({ expenseId: expense._id, userId }),
  ]);

  return {
    expense,
    fuelLog,
    maintenanceRecord,
  };
}

export async function updateExpense(userId: string, expenseId: string, input: UpdateExpenseInput) {
  const expense = await Expense.findOne({ _id: expenseId, userId });
  if (!expense) {
    throw new AppError('Expense not found', 404, 'EXPENSE_NOT_FOUND');
  }

  if (input.vehicleId) {
    const vehicle = await Vehicle.findOne({ _id: input.vehicleId, userId });
    if (!vehicle) throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
    expense.vehicleId = vehicle._id;
  }

  if (input.categoryId) {
    const category = await ExpenseCategory.findById(input.categoryId);
    if (!category) throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    expense.categoryId = category._id;
  }

  if (input.amount !== undefined) expense.amount = toDecimal128(input.amount);
  if (input.currency !== undefined) expense.currency = input.currency;
  if (input.paymentMethod !== undefined) expense.paymentMethod = input.paymentMethod;
  if (input.description !== undefined) expense.description = input.description;
  if (input.expenseDate !== undefined) expense.expenseDate = input.expenseDate;
  if (input.attachmentUrl !== undefined) expense.attachmentUrl = input.attachmentUrl || undefined;

  await expense.save();

  return expense.populate([
    { path: 'vehicleId', select: 'vehicleName registrationNumber vehicleType' },
    { path: 'categoryId', select: 'name slug icon color' },
  ]);
}

export async function deleteExpense(userId: string, expenseId: string): Promise<void> {
  const expense = await Expense.findOneAndDelete({ _id: expenseId, userId });
  if (!expense) {
    throw new AppError('Expense not found', 404, 'EXPENSE_NOT_FOUND');
  }

  await Promise.all([
    FuelLog.deleteMany({ expenseId: expense._id, userId }),
    MaintenanceRecord.deleteMany({ expenseId: expense._id, userId }),
    ExpenseAttachment.deleteMany({ expenseId: expense._id, userId }),
  ]);

  await AuditLog.create({
    userId,
    action: 'EXPENSE_DELETED',
    resourceType: 'Expense',
    resourceId: expense._id.toString(),
  });
}

export async function createFuelExpense(userId: string, input: CreateFuelExpenseInput) {
  const vehicle = await Vehicle.findOne({ _id: input.vehicleId, userId });
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
  }

  const categorySlug = input.fuelType === 'EV charging' ? 'ev-charging' : 'fuel';
  const category = await ExpenseCategory.findOne({ slug: categorySlug });
  if (!category) {
    throw new AppError('Fuel expense category not initialized', 500, 'CATEGORY_MISSING');
  }

  const totalCost = calculateFuelCost(input.quantity, input.unitPrice);
  const currency = await getUserCurrency(userId);
  const expenseDate = input.expenseDate ?? new Date();

  const expense = await Expense.create({
    userId,
    vehicleId: vehicle._id,
    categoryId: category._id,
    amount: toDecimal128(totalCost),
    currency,
    paymentMethod: input.paymentMethod,
    description:
      input.description ||
      `${input.fuelType} (${input.quantity} @ ${input.unitPrice})`,
    expenseDate,
    attachmentUrl: input.attachmentUrl || undefined,
  });

  let fuelLog;
  try {
    fuelLog = await FuelLog.create({
      userId,
      vehicleId: vehicle._id,
      expenseId: expense._id,
      fuelType: input.fuelType,
      quantity: input.quantity,
      unitPrice: toDecimal128(input.unitPrice),
      odometer: input.odometer,
      isFullTank: input.isFullTank,
    });
  } catch (err) {
    await Expense.deleteOne({ _id: expense._id });
    throw err;
  }

  if (input.odometer > vehicle.currentOdometer) {
    vehicle.currentOdometer = input.odometer;
    await vehicle.save();
    await OdometerReading.create({
      userId,
      vehicleId: vehicle._id,
      reading: input.odometer,
      source: 'fuel',
      referenceId: fuelLog._id,
      recordedAt: expenseDate,
    });
  }

  await AuditLog.create({
    userId,
    action: 'FUEL_LOG_CREATED',
    resourceType: 'FuelLog',
    resourceId: fuelLog._id.toString(),
    metadata: { expenseId: expense._id.toString(), totalCost },
  });

  await evaluateBudgetAlertsForExpense(
    userId,
    expenseDate,
    vehicle._id.toString(),
    category._id.toString(),
  );

  await expense.populate([
    { path: 'vehicleId', select: 'vehicleName registrationNumber vehicleType' },
    { path: 'categoryId', select: 'name slug icon color' },
  ]);

  return { expense, fuelLog };
}

export async function createMaintenanceExpense(
  userId: string,
  input: CreateMaintenanceExpenseInput,
) {
  const vehicle = await Vehicle.findOne({ _id: input.vehicleId, userId });
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
  }

  const slug = SERVICE_TYPE_CATEGORY_SLUG[input.serviceType] || 'maintenance';
  const category = await ExpenseCategory.findOne({ slug });
  if (!category) {
    throw new AppError('Maintenance category not initialized', 500, 'CATEGORY_MISSING');
  }

  const currency = await getUserCurrency(userId);
  const serviceDate = input.serviceDate ?? new Date();

  const expense = await Expense.create({
    userId,
    vehicleId: vehicle._id,
    categoryId: category._id,
    amount: toDecimal128(input.amount),
    currency,
    paymentMethod: input.paymentMethod,
    description: input.notes ? `${input.serviceType}: ${input.notes}` : input.serviceType,
    expenseDate: serviceDate,
    attachmentUrl: input.attachmentUrl || undefined,
  });

  let maintenanceRecord;
  try {
    maintenanceRecord = await MaintenanceRecord.create({
      userId,
      vehicleId: vehicle._id,
      expenseId: expense._id,
      serviceType: input.serviceType,
      serviceDate,
      odometer: input.odometer,
      nextServiceDate: input.nextServiceDate,
      nextServiceOdometer: input.nextServiceOdometer,
      notes: input.notes,
    });
  } catch (err) {
    await Expense.deleteOne({ _id: expense._id });
    throw err;
  }

  if (input.odometer > vehicle.currentOdometer) {
    vehicle.currentOdometer = input.odometer;
    await vehicle.save();
    await OdometerReading.create({
      userId,
      vehicleId: vehicle._id,
      reading: input.odometer,
      source: 'maintenance',
      referenceId: maintenanceRecord._id,
      recordedAt: serviceDate,
    });
  }

  await AuditLog.create({
    userId,
    action: 'MAINTENANCE_RECORD_CREATED',
    resourceType: 'MaintenanceRecord',
    resourceId: maintenanceRecord._id.toString(),
    metadata: { expenseId: expense._id.toString(), amount: input.amount },
  });

  await evaluateBudgetAlertsForExpense(
    userId,
    serviceDate,
    vehicle._id.toString(),
    category._id.toString(),
  );

  await expense.populate([
    { path: 'vehicleId', select: 'vehicleName registrationNumber vehicleType' },
    { path: 'categoryId', select: 'name slug icon color' },
  ]);

  return { expense, maintenanceRecord };
}
