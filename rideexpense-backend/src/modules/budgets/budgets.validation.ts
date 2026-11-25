import mongoose from 'mongoose';
import { z } from 'zod';

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

export const budgetIdParamSchema = z.object({
  id: objectIdSchema,
});

export const createBudgetSchema = z
  .object({
    categoryId: objectIdSchema.optional(),
    categorySlug: z.string().trim().min(1).optional(),
    vehicleId: objectIdSchema.optional(),
    amount: z.coerce.number().positive('Budget amount must be greater than 0'),
    period: z.enum(['monthly', 'weekly', 'annual', 'custom']).default('monthly'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    alertThresholds: z.array(z.number().min(1).max(100)).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export const updateBudgetSchema = z
  .object({
    categoryId: objectIdSchema.nullable().optional(),
    vehicleId: objectIdSchema.nullable().optional(),
    amount: z.coerce.number().positive('Budget amount must be greater than 0').optional(),
    period: z.enum(['monthly', 'weekly', 'annual', 'custom']).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) return data.endDate >= data.startDate;
      return true;
    },
    { message: 'End date must be on or after start date', path: ['endDate'] },
  );

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
