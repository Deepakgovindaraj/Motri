import { FilterQuery } from 'mongoose';
import {
  AuditLog,
  FuelLog,
  OdometerReading,
  Trip,
  TripLocation,
  TripPurpose,
  Vehicle,
} from '../../models';
import { ITrip } from '../../models/Trip';
import { calculateMileage, calculateTripDistance, decimalToNumber } from '../../utils/calculations';
import { AppError } from '../../utils/errors';
import {
  AddTripLocationsInput,
  CompleteTripInput,
  CreateTripInput,
  ListTripsQuery,
  UpdateTripInput,
} from './trips.validation';

const MAX_ACCEPTABLE_ACCURACY_METERS = 100;
const MAX_PLAUSIBLE_SPEED_KMH = 300;

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function listTripPurposes(userId: string) {
  return TripPurpose.find({
    $or: [{ isSystem: true }, { userId }],
  }).sort({ isSystem: -1, name: 1 });
}

export async function createTrip(userId: string, input: CreateTripInput) {
  const vehicle = await Vehicle.findOne({ _id: input.vehicleId, userId });
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
  }

  if (input.trackingType === 'manual') {
    const startOdo = input.startOdometer!;
    const endOdo = input.endOdometer!;
    const distance = calculateTripDistance(startOdo, endOdo);
    const startTime = input.startTime ?? new Date();
    const endTime =
      input.endTime ??
      (input.duration ? new Date(startTime.getTime() + input.duration * 60000) : startTime);

    const trip = await Trip.create({
      userId,
      vehicleId: vehicle._id,
      trackingType: 'manual',
      startLocation: input.startLocation,
      endLocation: input.endLocation,
      startOdometer: startOdo,
      endOdometer: endOdo,
      distance,
      duration: input.duration ?? 0,
      purpose: input.purpose,
      notes: input.notes,
      startTime,
      endTime,
      status: 'completed',
    });

    if (endOdo > vehicle.currentOdometer) {
      vehicle.currentOdometer = endOdo;
      await vehicle.save();
      await OdometerReading.create({
        userId,
        vehicleId: vehicle._id,
        reading: endOdo,
        source: 'trip',
        referenceId: trip._id,
        recordedAt: endTime,
      });
    }

    await AuditLog.create({
      userId,
      action: 'TRIP_CREATED',
      resourceType: 'Trip',
      resourceId: trip._id.toString(),
      metadata: { trackingType: 'manual', distance },
    });

    return trip.populate('vehicleId', 'vehicleName registrationNumber vehicleType');
  }

  // GPS-tracked ride starts in_progress
  const startTime = input.startTime ?? new Date();
  const trip = await Trip.create({
    userId,
    vehicleId: vehicle._id,
    trackingType: 'gps',
    startLocation: input.startLocation,
    startOdometer: vehicle.currentOdometer,
    distance: 0,
    duration: 0,
    purpose: input.purpose,
    notes: input.notes,
    startTime,
    status: 'in_progress',
  });

  await AuditLog.create({
    userId,
    action: 'GPS_TRIP_STARTED',
    resourceType: 'Trip',
    resourceId: trip._id.toString(),
  });

  return trip.populate('vehicleId', 'vehicleName registrationNumber vehicleType');
}

export async function listTrips(userId: string, query: ListTripsQuery) {
  const filter: FilterQuery<ITrip> = { userId };

  if (query.vehicleId) filter.vehicleId = query.vehicleId;
  if (query.trackingType) filter.trackingType = query.trackingType;
  if (query.status) filter.status = query.status;
  if (query.purpose) filter.purpose = query.purpose;
  if (query.startDate || query.endDate) {
    filter.startTime = {
      ...(query.startDate ? { $gte: query.startDate } : {}),
      ...(query.endDate ? { $lte: query.endDate } : {}),
    };
  }
  if (query.q) {
    const regex = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ startLocation: regex }, { endLocation: regex }, { purpose: regex }, { notes: regex }];
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Trip.find(filter)
      .populate('vehicleId', 'vehicleName registrationNumber vehicleType')
      .sort({ startTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Trip.countDocuments(filter),
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

export async function getTripById(userId: string, tripId: string) {
  const trip = await Trip.findOne({ _id: tripId, userId }).populate(
    'vehicleId',
    'vehicleName registrationNumber vehicleType currentOdometer',
  );
  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP_NOT_FOUND');
  }

  const locations =
    trip.trackingType === 'gps'
      ? await TripLocation.find({ tripId: trip._id, userId }).sort({ recordedAt: 1 })
      : [];

  return { trip, locations };
}

export async function updateTrip(userId: string, tripId: string, input: UpdateTripInput) {
  const trip = await Trip.findOne({ _id: tripId, userId });
  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP_NOT_FOUND');
  }

  const nextStartOdo = input.startOdometer ?? trip.startOdometer;
  const nextEndOdo = input.endOdometer ?? trip.endOdometer;

  if (nextStartOdo !== undefined && nextEndOdo !== undefined) {
    if (nextEndOdo < nextStartOdo) {
      throw new AppError(
        'Ending odometer cannot be less than starting odometer',
        400,
        'INVALID_ODOMETER_RANGE',
      );
    }
    if (trip.trackingType === 'manual') {
      trip.distance = calculateTripDistance(nextStartOdo, nextEndOdo);
    }
  }

  Object.assign(trip, input);
  await trip.save();

  return trip.populate('vehicleId', 'vehicleName registrationNumber vehicleType');
}

export async function deleteTrip(userId: string, tripId: string): Promise<void> {
  const trip = await Trip.findOneAndDelete({ _id: tripId, userId });
  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP_NOT_FOUND');
  }

  await TripLocation.deleteMany({ tripId: trip._id, userId });

  await AuditLog.create({
    userId,
    action: 'TRIP_DELETED',
    resourceType: 'Trip',
    resourceId: trip._id.toString(),
  });
}

export async function addTripLocations(
  userId: string,
  tripId: string,
  input: AddTripLocationsInput,
) {
  const trip = await Trip.findOne({ _id: tripId, userId });
  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP_NOT_FOUND');
  }
  if (trip.trackingType !== 'gps') {
    throw new AppError('Locations can only be recorded on GPS trips', 400, 'INVALID_TRIP_TYPE');
  }
  if (trip.status !== 'in_progress') {
    throw new AppError('Cannot record locations on a finished trip', 400, 'TRIP_NOT_ACTIVE');
  }

  const latestSaved = await TripLocation.findOne({ tripId: trip._id, userId }).sort({
    recordedAt: -1,
  });
  let lastPoint: { latitude: number; longitude: number; recordedAt: Date } | null = latestSaved
    ? {
        latitude: latestSaved.latitude,
        longitude: latestSaved.longitude,
        recordedAt: latestSaved.recordedAt,
      }
    : null;

  const acceptedDocs = [];
  let addedDistanceKm = 0;
  let filteredOutCount = 0;

  const sortedPoints = [...input.locations].sort((a, b) => {
    const tA = a.recordedAt ? a.recordedAt.getTime() : Date.now();
    const tB = b.recordedAt ? b.recordedAt.getTime() : Date.now();
    return tA - tB;
  });

  for (const pt of sortedPoints) {
    if (pt.accuracy !== undefined && pt.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
      filteredOutCount += 1;
      continue;
    }

    const recordedAt = pt.recordedAt ?? new Date();

    if (lastPoint) {
      const segmentKm = haversineDistanceKm(
        lastPoint.latitude,
        lastPoint.longitude,
        pt.latitude,
        pt.longitude,
      );
      const elapsedHours = Math.max(
        (recordedAt.getTime() - lastPoint.recordedAt.getTime()) / 3600000,
        1 / 3600,
      );
      const impliedSpeedKmh = segmentKm / elapsedHours;

      if (impliedSpeedKmh > MAX_PLAUSIBLE_SPEED_KMH) {
        filteredOutCount += 1;
        continue;
      }

      addedDistanceKm += segmentKm;
    }

    const doc = {
      tripId: trip._id,
      userId,
      latitude: pt.latitude,
      longitude: pt.longitude,
      accuracy: pt.accuracy,
      speed: pt.speed,
      recordedAt,
    };
    acceptedDocs.push(doc);
    lastPoint = { latitude: doc.latitude, longitude: doc.longitude, recordedAt: doc.recordedAt };
  }

  if (acceptedDocs.length > 0) {
    await TripLocation.insertMany(acceptedDocs);
    trip.distance = Number((trip.distance + addedDistanceKm).toFixed(3));
    await trip.save();
  }

  return {
    acceptedCount: acceptedDocs.length,
    filteredOutCount,
    totalDistance: trip.distance,
  };
}

export async function completeTrip(
  userId: string,
  tripId: string,
  input: CompleteTripInput,
): Promise<Record<string, unknown>> {
  const trip = await Trip.findOne({ _id: tripId, userId });
  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP_NOT_FOUND');
  }
  if (trip.status === 'completed') {
    throw new AppError('Trip is already completed', 400, 'TRIP_ALREADY_COMPLETED');
  }

  const endTime = input.endTime ?? new Date();
  const durationMinutes = Math.max(
    1,
    Math.round((endTime.getTime() - trip.startTime.getTime()) / 60000),
  );

  const vehicle = await Vehicle.findOne({ _id: trip.vehicleId, userId });
  const startOdo = trip.startOdometer ?? vehicle?.currentOdometer ?? 0;

  let finalDistance = Number(trip.distance.toFixed(2));
  if (input.endOdometer !== undefined && input.endOdometer >= startOdo) {
    finalDistance = Number((input.endOdometer - startOdo).toFixed(2));
  } else if (input.distanceKm !== undefined && input.distanceKm > finalDistance) {
    finalDistance = Number(input.distanceKm.toFixed(2));
  }

  trip.status = 'completed';
  trip.endTime = endTime;
  trip.duration = durationMinutes;
  trip.distance = finalDistance;
  if (input.endLocation !== undefined) trip.endLocation = input.endLocation;
  if (input.notes !== undefined) trip.notes = input.notes;

  if (vehicle) {
    const computedEndOdo =
      input.endOdometer !== undefined && input.endOdometer >= startOdo
        ? input.endOdometer
        : Number((startOdo + finalDistance).toFixed(2));
    trip.startOdometer = startOdo;
    trip.endOdometer = computedEndOdo;

    if (computedEndOdo > vehicle.currentOdometer) {
      vehicle.currentOdometer = computedEndOdo;
      await vehicle.save();
      await OdometerReading.create({
        userId,
        vehicleId: vehicle._id,
        reading: computedEndOdo,
        source: 'trip',
        referenceId: trip._id,
        recordedAt: endTime,
      });
    }
  }

  await trip.save();

  // Compute ride mileage & estimated fuel cost from vehicle's recent fuel logs / expectedMileage
  const fuelLogs = await FuelLog.find({ userId, vehicleId: trip.vehicleId })
    .sort({ odometer: 1, createdAt: 1 });

  let computedMileage = 0;
  let lastFullOdo: number | null = null;
  let accFuel = 0;
  let totalDist = 0;
  let totalFuel = 0;

  for (const log of fuelLogs) {
    if (lastFullOdo === null) {
      if (log.isFullTank) {
        lastFullOdo = log.odometer;
        accFuel = 0;
      }
      continue;
    }
    accFuel += log.quantity;
    if (log.isFullTank && log.odometer > lastFullOdo && accFuel > 0) {
      totalDist += log.odometer - lastFullOdo;
      totalFuel += accFuel;
      lastFullOdo = log.odometer;
      accFuel = 0;
    }
  }

  if (totalFuel > 0) {
    computedMileage = calculateMileage(totalDist, totalFuel);
  } else if (vehicle?.expectedMileage && vehicle.expectedMileage > 0) {
    computedMileage = vehicle.expectedMileage;
  }

  const latestFuelLog = fuelLogs[fuelLogs.length - 1];
  const latestFuelPrice = latestFuelLog ? decimalToNumber(latestFuelLog.unitPrice) : 0;
  const estimatedFuelUsed =
    computedMileage > 0 ? Number((finalDistance / computedMileage).toFixed(3)) : 0;
  const estimatedFuelCost =
    estimatedFuelUsed > 0 && latestFuelPrice > 0
      ? Number((estimatedFuelUsed * latestFuelPrice).toFixed(2))
      : 0;

  await AuditLog.create({
    userId,
    action: 'TRIP_COMPLETED',
    resourceType: 'Trip',
    resourceId: trip._id.toString(),
    metadata: { distance: trip.distance, duration: trip.duration },
  });

  const populated = await trip.populate(
    'vehicleId',
    'vehicleName registrationNumber vehicleType',
  );

  return {
    ...populated.toJSON(),
    rideSummary: {
      distanceKm: trip.distance,
      durationMinutes: trip.duration,
      mileageKmPerUnit: computedMileage,
      estimatedFuelUsed,
      estimatedFuelCost,
      latestFuelPrice,
    },
  };
}
