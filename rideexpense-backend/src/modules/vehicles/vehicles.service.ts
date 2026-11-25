import { FilterQuery } from 'mongoose';
import { AuditLog, OdometerReading, Vehicle } from '../../models';
import { IVehicle } from '../../models/Vehicle';
import { AppError } from '../../utils/errors';
import {
  CreateVehicleInput,
  ListVehiclesQuery,
  UpdateVehicleInput,
} from './vehicles.validation';

export async function createVehicle(userId: string, input: CreateVehicleInput): Promise<IVehicle> {
  const existing = await Vehicle.findOne({
    userId,
    registrationNumber: input.registrationNumber.toUpperCase(),
  });
  if (existing) {
    throw new AppError(
      'You already have a vehicle with this registration number',
      409,
      'DUPLICATE_REGISTRATION',
    );
  }

  const vehicle = await Vehicle.create({
    ...input,
    userId,
    vehicleImage: input.vehicleImage || undefined,
  });

  await OdometerReading.create({
    userId,
    vehicleId: vehicle._id,
    reading: vehicle.currentOdometer,
    source: 'vehicle_create',
    referenceId: vehicle._id,
  });

  await AuditLog.create({
    userId,
    action: 'VEHICLE_CREATED',
    resourceType: 'Vehicle',
    resourceId: vehicle._id.toString(),
    metadata: { registrationNumber: vehicle.registrationNumber },
  });

  return vehicle;
}

export async function listVehicles(userId: string, query: ListVehiclesQuery) {
  const filter: FilterQuery<IVehicle> = { userId };

  if (query.vehicleType) {
    filter.vehicleType = query.vehicleType;
  }
  if (query.fuelType) {
    filter.fuelType = query.fuelType;
  }
  if (query.q) {
    const regex = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { vehicleName: regex },
      { registrationNumber: regex },
      { brand: regex },
      { model: regex },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    Vehicle.find(filter)
      .sort({ [query.sortBy]: sortDirection })
      .skip(skip)
      .limit(query.limit),
    Vehicle.countDocuments(filter),
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

export async function getVehicleById(userId: string, vehicleId: string): Promise<IVehicle> {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
  }
  return vehicle;
}

export async function updateVehicle(
  userId: string,
  vehicleId: string,
  input: UpdateVehicleInput,
): Promise<IVehicle> {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
  }

  if (
    input.registrationNumber &&
    input.registrationNumber.toUpperCase() !== vehicle.registrationNumber
  ) {
    const duplicate = await Vehicle.findOne({
      userId,
      registrationNumber: input.registrationNumber.toUpperCase(),
      _id: { $ne: vehicle._id },
    });
    if (duplicate) {
      throw new AppError(
        'Another vehicle already uses this registration number',
        409,
        'DUPLICATE_REGISTRATION',
      );
    }
  }

  const previousOdometer = vehicle.currentOdometer;

  Object.assign(vehicle, {
    ...input,
    ...(input.vehicleImage === '' ? { vehicleImage: undefined } : {}),
  });
  await vehicle.save();

  if (input.currentOdometer !== undefined && input.currentOdometer !== previousOdometer) {
    await OdometerReading.create({
      userId,
      vehicleId: vehicle._id,
      reading: vehicle.currentOdometer,
      source: 'vehicle_update',
      referenceId: vehicle._id,
    });
  }

  await AuditLog.create({
    userId,
    action: 'VEHICLE_UPDATED',
    resourceType: 'Vehicle',
    resourceId: vehicle._id.toString(),
  });

  return vehicle;
}

export async function deleteVehicle(userId: string, vehicleId: string): Promise<void> {
  const vehicle = await Vehicle.findOneAndDelete({ _id: vehicleId, userId });
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
  }

  await OdometerReading.deleteMany({ userId, vehicleId: vehicle._id });

  await AuditLog.create({
    userId,
    action: 'VEHICLE_DELETED',
    resourceType: 'Vehicle',
    resourceId: vehicle._id.toString(),
    metadata: { registrationNumber: vehicle.registrationNumber },
  });
}
