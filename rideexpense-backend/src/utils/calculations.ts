import mongoose from 'mongoose';

export function toDecimal128(value: number | string): mongoose.Types.Decimal128 {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) {
    throw new Error('Invalid numeric value for Decimal128');
  }
  return mongoose.Types.Decimal128.fromString(num.toFixed(2));
}

export function decimalToNumber(value: mongoose.Types.Decimal128 | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return Number(value.toString());
}

export function calculateTripDistance(startOdometer: number, endOdometer: number): number {
  if (endOdometer < startOdometer) {
    throw new Error('Ending odometer cannot be less than starting odometer');
  }
  return Number((endOdometer - startOdometer).toFixed(2));
}

export function calculateFuelCost(quantity: number, unitPrice: number): number {
  return Number((quantity * unitPrice).toFixed(2));
}

export function calculateMileage(distanceKm: number, fuelConsumed: number): number {
  if (fuelConsumed <= 0) return 0;
  return Number((distanceKm / fuelConsumed).toFixed(2));
}
