import mongoose from 'mongoose';
import { z } from 'zod';

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

const paymentMethodEnum = z.enum([
  'Cash',
  'Card',
  'UPI',
  'Bank Transfer',
  'Wallet',
  'Other',
]);

export const expenseIdParamSchema = z.object({
  id: objectIdSchema,
});

export const createExpenseSchema = z
  .object({
    vehicleId: objectIdSchema,
    tripId: objectIdSchema.optional(),
    categoryId: objectIdSchema.optional(),
    categorySlug: z.string().trim().min(1).optional(),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    currency: z.string().trim().min(3).max(5).toUpperCase().optional(),
    paymentMethod: paymentMethodEnum.default('Card'),
    description: z.string().trim().max(500).optional(),
    expenseDate: z.coerce.date().optional(),
    attachmentUrl: z.string().url().or(z.literal('')).optional(),
  })
  .refine((data) => Boolean(data.categoryId || data.categorySlug), {
    message: 'Either categoryId or categorySlug is required',
    path: ['categoryId'],
  });

export const updateExpenseSchema = z.object({
  vehicleId: objectIdSchema.optional(),
  tripId: objectIdSchema.optional(),
  categoryId: objectIdSchema.optional(),
  amount: z.coerce.number().positive('Amount must be greater than 0').optional(),
  currency: z.string().trim().min(3).max(5).toUpperCase().optional(),
  paymentMethod: paymentMethodEnum.optional(),
  description: z.string().trim().max(500).optional(),
  expenseDate: z.coerce.date().optional(),
  attachmentUrl: z.string().url().or(z.literal('')).optional(),
});

export const createFuelExpenseSchema = z.object({
  vehicleId: objectIdSchema,
  fuelType: z.enum(['Petrol', 'Diesel', 'CNG', 'EV charging']),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unitPrice: z.coerce.number().positive('Unit price must be greater than 0'),
  odometer: z.coerce.number().min(0, 'Odometer cannot be negative'),
  isFullTank: z.boolean().default(true),
  expenseDate: z.coerce.date().optional(),
  paymentMethod: paymentMethodEnum.default('Card'),
  description: z.string().trim().max(500).optional(),
  attachmentUrl: z.string().url().or(z.literal('')).optional(),
});

export const createMaintenanceExpenseSchema = z.object({
  vehicleId: objectIdSchema,
  serviceType: z.enum([
    'Servicing',
    'Engine oil',
    'Tyre replacement',
    'Battery replacement',
    'Repairs',
    'Insurance',
    'Other',
  ]),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  serviceDate: z.coerce.date().optional(),
  odometer: z.coerce.number().min(0, 'Odometer cannot be negative'),
  nextServiceDate: z.coerce.date().optional(),
  nextServiceOdometer: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(1000).optional(),
  paymentMethod: paymentMethodEnum.default('Card'),
  attachmentUrl: z.string().url().or(z.literal('')).optional(),
});

export const listExpensesQuerySchema = z.object({
  q: z.string().trim().optional(),
  vehicleId: objectIdSchema.optional(),
  categoryId: objectIdSchema.optional(),
  paymentMethod: paymentMethodEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['expenseDate', 'amount', 'createdAt']).default('expenseDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreateFuelExpenseInput = z.infer<typeof createFuelExpenseSchema>;
export type CreateMaintenanceExpenseInput = z.infer<typeof createMaintenanceExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
