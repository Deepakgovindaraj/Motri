import mongoose, { Document, Schema } from 'mongoose';

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  tripId?: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  amount: mongoose.Types.Decimal128;
  currency: string;
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Wallet' | 'Other';
  description?: string;
  expenseDate: Date;
  attachmentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
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
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
      required: true,
      index: true,
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
      maxlength: 5,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Wallet', 'Other'],
      default: 'Card',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    attachmentUrl: {
      type: String,
      trim: true,
    },
  },
  {
    collection: 'expenses',
    timestamps: true,
  },
);

expenseSchema.index({ userId: 1, expenseDate: -1 });
expenseSchema.index({ userId: 1, vehicleId: 1, expenseDate: -1 });
expenseSchema.index({ userId: 1, categoryId: 1, expenseDate: -1 });

expenseSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    if (obj.amount && typeof (obj.amount as { toString: () => string }).toString === 'function') {
      obj.amount = Number((obj.amount as { toString: () => string }).toString());
    }
    delete obj.__v;
    return obj;
  },
});

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
