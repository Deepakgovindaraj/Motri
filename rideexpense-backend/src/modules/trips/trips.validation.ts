import mongoose from 'mongoose';
import { z } from 'zod';

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

export const tripIdParamSchema = z.object({
  id: objectIdSchema,
});

export const createTripSchema = z
  .object({
    vehicleId: objectIdSchema,
    trackingType: z.enum(['manual', 'gps']).default('manual'),
    startLocation: z.string().trim().max(200).optional(),
    endLocation: z.string().trim().max(200).optional(),
    startOdometer: z.coerce.number().min(0).optional(),
    endOdometer: z.coerce.number().min(0).optional(),
    purpose: z.string().trim().max(80).optional(),
    duration: z.coerce.number().min(0).optional(),
    notes: z.string().trim().max(1000).optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.trackingType === 'manual') {
      if (data.startOdometer === undefined || data.endOdometer === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Starting and ending odometer readings are required for manual trips',
          path: ['endOdometer'],
        });
      } else if (data.endOdometer < data.startOdometer) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ending odometer cannot be less than starting odometer',
          path: ['endOdometer'],
        });
      }
    }
  });

export const updateTripSchema = z
  .object({
    startLocation: z.string().trim().max(200).optional(),
    endLocation: z.string().trim().max(200).optional(),
    startOdometer: z.coerce.number().min(0).optional(),
    endOdometer: z.coerce.number().min(0).optional(),
    purpose: z.string().trim().max(80).optional(),
    duration: z.coerce.number().min(0).optional(),
    notes: z.string().trim().max(1000).optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.startOdometer !== undefined &&
      data.endOdometer !== undefined &&
      data.endOdometer < data.startOdometer
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ending odometer cannot be less than starting odometer',
        path: ['endOdometer'],
      });
    }
  });

const locationPointSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(0).optional(),
  speed: z.coerce.number().min(0).optional(),
  recordedAt: z.coerce.date().optional(),
});

export const addTripLocationsSchema = z.object({
  locations: z.array(locationPointSchema).min(1).max(500),
});

export const completeTripSchema = z.object({
  endLocation: z.string().trim().max(200).optional(),
  endTime: z.coerce.date().optional(),
  endOdometer: z.coerce.number().min(0).optional(),
  distanceKm: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const listTripsQuerySchema = z.object({
  q: z.string().trim().optional(),
  vehicleId: objectIdSchema.optional(),
  trackingType: z.enum(['manual', 'gps']).optional(),
  status: z.enum(['in_progress', 'completed', 'cancelled']).optional(),
  purpose: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type AddTripLocationsInput = z.infer<typeof addTripLocationsSchema>;
export type CompleteTripInput = z.infer<typeof completeTripSchema>;
export type ListTripsQuery = z.infer<typeof listTripsQuerySchema>;
