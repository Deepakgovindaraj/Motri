import mongoose, { Document, Schema } from 'mongoose';

export interface IBudget extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId;
  vehicleId?: mongoose.Types.ObjectId;
  amount: mongoose.Types.Decimal128;
  period: 'monthly' | 'weekly' | 'annual' | 'custom';
  startDate: Date;
  endDate: Date;
  alertThresholds: number[];
  createdAt: Date;
  updatedAt: Date;
}

const budgetSchema = new Schema<IBudget>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    period: {
      type: String,
      enum: ['monthly', 'weekly', 'annual', 'custom'],
      default: 'monthly',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    alertThresholds: {
      type: [Number],
      default: [75, 90, 100],
    },
  },
  {
    collection: 'budgets',
    timestamps: true,
  },
);

budgetSchema.index({ userId: 1, startDate: 1, endDate: 1 });

budgetSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    if (obj.amount && typeof (obj.amount as { toString: () => string }).toString === 'function') {
      obj.amount = Number((obj.amount as { toString: () => string }).toString());
    }
    delete obj.__v;
    return obj;
  },
});

export const Budget = mongoose.model<IBudget>('Budget', budgetSchema);
