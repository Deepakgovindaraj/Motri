import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  description: string;
  monthlyPrice: mongoose.Types.Decimal128;
  annualPrice: mongoose.Types.Decimal128;
  currency: string;
  maxVehicles: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    monthlyPrice: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    annualPrice: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    maxVehicles: {
      type: Number,
      required: true,
      min: 1,
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: 'subscriptionPlans',
    timestamps: true,
  },
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>(
  'SubscriptionPlan',
  subscriptionPlanSchema,
);
