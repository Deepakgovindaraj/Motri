import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  profileImage: z.string().url().or(z.literal('')).optional(),
  preferences: z
    .object({
      currency: z.string().trim().min(3).max(5).toUpperCase().optional(),
      distanceUnit: z.enum(['km', 'mi']).optional(),
      fuelUnit: z.enum(['L', 'kWh', 'kg']).optional(),
      theme: z.enum(['light', 'dark', 'system']).optional(),
      pushNotificationsEnabled: z.boolean().optional(),
      budgetAlertThresholdPercent: z.number().min(1).max(100).optional(),
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
