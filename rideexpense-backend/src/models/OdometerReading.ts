import mongoose, { Document, Schema } from 'mongoose';

export interface IOdometerReading extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  reading: number;
  source: 'vehicle_create' | 'vehicle_update' | 'trip' | 'fuel' | 'maintenance' | 'manual';
  referenceId?: mongoose.Types.ObjectId;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const odometerReadingSchema = new Schema<IOdometerReading>(
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
    reading: {
      type: Number,
      required: true,
      min: 0,
    },
    source: {
      type: String,
      enum: ['vehicle_create', 'vehicle_update', 'trip', 'fuel', 'maintenance', 'manual'],
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'odometerReadings',
    timestamps: true,
  },
);

odometerReadingSchema.index({ vehicleId: 1, recordedAt: -1 });

export const OdometerReading = mongoose.model<IOdometerReading>('OdometerReading', odometerReadingSchema);
