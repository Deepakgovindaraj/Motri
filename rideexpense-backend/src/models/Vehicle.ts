import mongoose, { HydratedDocument, Schema } from 'mongoose';

export type VehicleType = 'Bike' | 'Scooter' | 'Car' | 'Electric vehicle' | 'Other';
export type FuelType = 'Petrol' | 'Diesel' | 'CNG' | 'EV charging' | 'Hybrid' | 'Other';

export interface IVehicle {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  vehicleName: string;
  vehicleType: VehicleType;
  registrationNumber: string;
  brand: string;
  model: string;
  manufacturingYear: number;
  fuelType: FuelType;
  tankCapacity?: number;
  expectedMileage?: number;
  currentOdometer: number;
  purchaseDate?: Date;
  vehicleImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type VehicleDocument = HydratedDocument<IVehicle>;

const vehicleSchema = new Schema<IVehicle>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehicleName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    vehicleType: {
      type: String,
      required: true,
      enum: ['Bike', 'Scooter', 'Car', 'Electric vehicle', 'Other'],
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    model: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    manufacturingYear: {
      type: Number,
      required: true,
      min: 1950,
      max: 2100,
    },
    fuelType: {
      type: String,
      required: true,
      enum: ['Petrol', 'Diesel', 'CNG', 'EV charging', 'Hybrid', 'Other'],
    },
    tankCapacity: {
      type: Number,
      min: 0,
    },
    expectedMileage: {
      type: Number,
      min: 0,
    },
    currentOdometer: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    purchaseDate: {
      type: Date,
    },
    vehicleImage: {
      type: String,
      trim: true,
    },
  },
  {
    collection: 'vehicles',
    timestamps: true,
  },
);

vehicleSchema.index({ userId: 1, registrationNumber: 1 }, { unique: true });
vehicleSchema.index({ userId: 1, createdAt: -1 });

export const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema);
