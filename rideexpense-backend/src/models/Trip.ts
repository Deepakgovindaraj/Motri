import mongoose, { Document, Schema } from 'mongoose';

export interface ITrip extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  trackingType: 'manual' | 'gps';
  startLocation?: string;
  endLocation?: string;
  startOdometer?: number;
  endOdometer?: number;
  distance: number;
  duration: number;
  purpose?: string;
  purposeId?: mongoose.Types.ObjectId;
  notes?: string;
  startTime: Date;
  endTime?: Date;
  status: 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const tripSchema = new Schema<ITrip>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    trackingType: {
      type: String,
      enum: ['manual', 'gps'],
      required: true,
    },
    startLocation: {
      type: String,
      trim: true,
    },
    endLocation: {
      type: String,
      trim: true,
    },
    startOdometer: {
      type: Number,
      min: 0,
    },
    endOdometer: {
      type: Number,
      min: 0,
    },
    distance: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    duration: {
      type: Number,
      min: 0,
      default: 0,
    },
    purpose: {
      type: String,
      trim: true,
    },
    purposeId: {
      type: Schema.Types.ObjectId,
      ref: 'TripPurpose',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'cancelled'],
      default: 'completed',
    },
  },
  {
    collection: 'trips',
    timestamps: true,
  },
);

tripSchema.index({ userId: 1, startTime: -1 });
tripSchema.index({ userId: 1, vehicleId: 1, startTime: -1 });

export const Trip = mongoose.model<ITrip>('Trip', tripSchema);
