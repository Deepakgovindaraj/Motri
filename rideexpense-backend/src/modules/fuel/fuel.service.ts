import mongoose, { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { Expense, FuelLog } from '../../models';
import { IFuelLog } from '../../models/FuelLog';
import { calculateMileage, decimalToNumber } from '../../utils/calculations';
import { AppError } from '../../utils/errors';

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

export const fuelIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listFuelQuerySchema = z.object({
  vehicleId: objectIdSchema.optional(),
  fuelType: z.enum(['Petrol', 'Diesel', 'CNG', 'EV charging']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListFuelQuery = z.infer<typeof listFuelQuerySchema>;

export interface FuelLogWithMileage {
  log: unknown;
  mileageKmPerUnit: number | null;
}

export async function listFuelLogs(
  userId: string,
  query: ListFuelQuery,
): Promise<{
  items: Array<Record<string, unknown>>;
  summary: { totalFuelCost: number; totalQuantity: number; averageMileage: number };
  pagination: { total: number; page: number; limit: number; totalPages: number };
}> {
  const filter: FilterQuery<IFuelLog> = { userId };
  if (query.vehicleId) filter.vehicleId = query.vehicleId;
  if (query.fuelType) filter.fuelType = query.fuelType;

  const skip = (query.page - 1) * query.limit;

  const [items, total, allForMileage] = await Promise.all([
    FuelLog.find(filter)
      .populate('vehicleId', 'vehicleName registrationNumber vehicleType')
      .populate('expenseId', 'amount currency paymentMethod expenseDate description')
      .sort({ odometer: -1, createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    FuelLog.countDocuments(filter),
    FuelLog.find(query.vehicleId ? { userId, vehicleId: query.vehicleId } : { userId })
      .populate('expenseId', 'amount')
      .sort({ odometer: 1, createdAt: 1 }),
  ]);

  // Compute full-tank-to-full-tank mileage per vehicle
  const mileageByLogId = new Map<string, number | null>();
  const logsByVehicle = new Map<string, typeof allForMileage>();

  let totalFuelCost = 0;
  let totalQuantity = 0;

  for (const entry of allForMileage) {
    totalQuantity += entry.quantity;
    const exp = entry.expenseId as unknown as { amount?: unknown } | null;
    if (exp && exp.amount !== undefined) {
      totalFuelCost += decimalToNumber(exp.amount as Parameters<typeof decimalToNumber>[0]);
    }
    const vKey = entry.vehicleId.toString();
    const list = logsByVehicle.get(vKey) ?? [];
    list.push(entry);
    logsByVehicle.set(vKey, list);
  }

  let totalDistanceCovered = 0;
  let totalFuelForMileage = 0;

  for (const logs of logsByVehicle.values()) {
    let lastFullTankOdo: number | null = null;
    let accumulatedFuel = 0;

    for (const log of logs) {
      if (lastFullTankOdo === null) {
        if (log.isFullTank) {
          lastFullTankOdo = log.odometer;
          accumulatedFuel = 0;
        }
        mileageByLogId.set(log._id.toString(), null);
        continue;
      }

      accumulatedFuel += log.quantity;
      if (log.isFullTank && log.odometer > lastFullTankOdo && accumulatedFuel > 0) {
        const dist = log.odometer - lastFullTankOdo;
        const mileage = calculateMileage(dist, accumulatedFuel);
        mileageByLogId.set(log._id.toString(), mileage);
        totalDistanceCovered += dist;
        totalFuelForMileage += accumulatedFuel;
        lastFullTankOdo = log.odometer;
        accumulatedFuel = 0;
      } else {
        mileageByLogId.set(log._id.toString(), null);
      }
    }
  }

  const enrichedItems = items.map((item) => ({
    ...item.toJSON(),
    mileageKmPerUnit: mileageByLogId.get(item._id.toString()) ?? null,
  }));

  const averageMileage =
    totalFuelForMileage > 0 ? calculateMileage(totalDistanceCovered, totalFuelForMileage) : 0;

  return {
    items: enrichedItems,
    summary: {
      totalFuelCost: Number(totalFuelCost.toFixed(2)),
      totalQuantity: Number(totalQuantity.toFixed(2)),
      averageMileage,
    },
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function deleteFuelLog(userId: string, fuelLogId: string): Promise<void> {
  const fuelLog = await FuelLog.findOneAndDelete({ _id: fuelLogId, userId });
  if (!fuelLog) {
    throw new AppError('Fuel log not found', 404, 'FUEL_LOG_NOT_FOUND');
  }
  await Expense.deleteOne({ _id: fuelLog.expenseId, userId });
}
