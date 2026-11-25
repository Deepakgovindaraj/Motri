import mongoose, { Document, Schema } from 'mongoose';

export interface ITripPurpose extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  isSystem: boolean;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tripPurposeSchema = new Schema<ITripPurpose>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    collection: 'tripPurposes',
    timestamps: true,
  },
);

export const TripPurpose = mongoose.model<ITripPurpose>('TripPurpose', tripPurposeSchema);
