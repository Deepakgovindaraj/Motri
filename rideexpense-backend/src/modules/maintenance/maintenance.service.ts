import mongoose, { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { Expense, MaintenanceRecord } from '../../models';
import { IMaintenanceRecord } from '../../models/MaintenanceRecord';
import { AppError } from '../../utils/errors';

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

export const maintenanceIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listMaintenanceQuerySchema = z.object({
  vehicleId: objectIdSchema.optional(),
  serviceType: z
    .enum([
      'Servicing',
      'Engine oil',
      'Tyre replacement',
      'Battery replacement',
      'Repairs',
      'Insurance',
      'Other',
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListMaintenanceQuery = z.infer<typeof listMaintenanceQuerySchema>;

export async function listMaintenanceRecords(userId: string, query: ListMaintenanceQuery) {
  const filter: FilterQuery<IMaintenanceRecord> = { userId };
  if (query.vehicleId) filter.vehicleId = query.vehicleId;
  if (query.serviceType) filter.serviceType = query.serviceType;

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    MaintenanceRecord.find(filter)
      .populate('vehicleId', 'vehicleName registrationNumber vehicleType currentOdometer')
      .populate('expenseId', 'amount currency paymentMethod expenseDate description')
      .sort({ serviceDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    MaintenanceRecord.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getMaintenanceReminders(userId: string) {
  const records = await MaintenanceRecord.find({
    userId,
    $or: [
      { nextServiceDate: { $exists: true, $ne: null } },
      { nextServiceOdometer: { $exists: true, $ne: null } },
    ],
  })
    .populate('vehicleId', 'vehicleName registrationNumber currentOdometer')
    .sort({ nextServiceDate: 1 });

  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const reminders = records
    .map((record) => {
      const vehicle = record.vehicleId as unknown as {
        _id: string;
        vehicleName: string;
        registrationNumber: string;
        currentOdometer: number;
      } | null;

      if (!vehicle) return null;

      let status: 'overdue' | 'due_soon' | 'scheduled' = 'scheduled';
      const reasons: string[] = [];

      if (record.nextServiceDate) {
        const diffMs = record.nextServiceDate.getTime() - now;
        if (diffMs < 0) {
          status = 'overdue';
          reasons.push('Service date passed');
        } else if (diffMs <= thirtyDaysMs) {
          status = 'due_soon';
          reasons.push('Service due within 30 days');
        }
      }

      if (record.nextServiceOdometer !== undefined) {
        const remainingKm = record.nextServiceOdometer - vehicle.currentOdometer;
        if (remainingKm <= 0) {
          status = 'overdue';
          reasons.push('Odometer target reached');
        } else if (remainingKm <= 1000 && status !== 'overdue') {
          status = 'due_soon';
          reasons.push(`${Math.round(remainingKm)} km remaining`);
        }
      }

      return {
        _id: record._id,
        vehicle,
        serviceType: record.serviceType,
        serviceDate: record.serviceDate,
        nextServiceDate: record.nextServiceDate,
        nextServiceOdometer: record.nextServiceOdometer,
        status,
        reasons,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return reminders;
}

export async function deleteMaintenanceRecord(userId: string, recordId: string): Promise<void> {
  const record = await MaintenanceRecord.findOneAndDelete({ _id: recordId, userId });
  if (!record) {
    throw new AppError('Maintenance record not found', 404, 'MAINTENANCE_RECORD_NOT_FOUND');
  }
  await Expense.deleteOne({ _id: record.expenseId, userId });
}
