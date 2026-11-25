import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPreference extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  currency: string;
  distanceUnit: 'km' | 'mi';
  fuelUnit: 'L' | 'kWh' | 'kg';
  theme: 'light' | 'dark' | 'system';
  pushNotificationsEnabled: boolean;
  budgetAlertThresholdPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

const userPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
      maxlength: 5,
    },
    distanceUnit: {
      type: String,
      enum: ['km', 'mi'],
      default: 'km',
    },
    fuelUnit: {
      type: String,
      enum: ['L', 'kWh', 'kg'],
      default: 'L',
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    pushNotificationsEnabled: {
      type: Boolean,
      default: true,
    },
    budgetAlertThresholdPercent: {
      type: Number,
      default: 75,
      min: 1,
      max: 100,
    },
  },
  {
    collection: 'userPreferences',
    timestamps: true,
  },
);

export const UserPreference = mongoose.model<IUserPreference>('UserPreference', userPreferenceSchema);
