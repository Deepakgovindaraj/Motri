import mongoose from 'mongoose';
import { z } from 'zod';

const vehicleTypeEnum = z.enum(['Bike', 'Scooter', 'Car', 'Electric vehicle', 'Other']);
const fuelTypeEnum = z.enum(['Petrol', 'Diesel', 'CNG', 'EV charging', 'Hybrid', 'Other']);

export const vehicleIdParamSchema = z.object({
  id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid vehicle ID'),
});

export const createVehicleSchema = z.object({
  vehicleName: z.string().trim().min(1, 'Vehicle name is required').max(100),
  vehicleType: vehicleTypeEnum,
  registrationNumber: z.string().trim().min(2, 'Registration number is required').max(30).toUpperCase(),
  brand: z.string().trim().min(1, 'Brand is required').max(60),
  model: z.string().trim().min(1, 'Model is required').max(60),
  manufacturingYear: z.coerce
    .number()
    .int()
    .min(1950, 'Year must be 1950 or later')
    .max(new Date().getFullYear() + 1, 'Manufacturing year cannot be in the distant future'),
  fuelType: fuelTypeEnum,
  tankCapacity: z.coerce.number().min(0).optional(),
  expectedMileage: z.coerce.number().min(0).optional(),
  currentOdometer: z.coerce.number().min(0).default(0),
  purchaseDate: z.coerce.date().optional(),
  vehicleImage: z.string().url().or(z.literal('')).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const listVehiclesQuerySchema = z.object({
  q: z.string().trim().optional(),
  vehicleType: vehicleTypeEnum.optional(),
  fuelType: fuelTypeEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'vehicleName', 'currentOdometer', 'manufacturingYear']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
