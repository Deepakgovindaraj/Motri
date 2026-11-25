import mongoose, { Document, Schema } from 'mongoose';

export interface ITripLocation extends Document {
  _id: mongoose.Types.ObjectId;
  tripId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  recordedAt: Date;
}

const tripLocationSchema = new Schema<ITripLocation>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    accuracy: {
      type: Number,
      min: 0,
    },
    speed: {
      type: Number,
      min: 0,
    },
    recordedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: 'tripLocations',
    timestamps: true,
  },
);

tripLocationSchema.index({ tripId: 1, recordedAt: 1 });

export const TripLocation = mongoose.model<ITripLocation>('TripLocation', tripLocationSchema);
