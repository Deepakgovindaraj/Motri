import mongoose, { Document, Schema } from 'mongoose';

export interface IFuelLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  expenseId: mongoose.Types.ObjectId;
  fuelType: 'Petrol' | 'Diesel' | 'CNG' | 'EV charging';
  quantity: number;
  unitPrice: mongoose.Types.Decimal128;
  odometer: number;
  isFullTank: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fuelLogSchema = new Schema<IFuelLog>(
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
    expenseId: {
      type: Schema.Types.ObjectId,
      ref: 'Expense',
      required: true,
      unique: true,
    },
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'CNG', 'EV charging'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    unitPrice: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    odometer: {
      type: Number,
      required: true,
      min: 0,
    },
    isFullTank: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: 'fuelLogs',
    timestamps: true,
  },
);

fuelLogSchema.index({ userId: 1, vehicleId: 1, odometer: -1 });

fuelLogSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    if (
      obj.unitPrice &&
      typeof (obj.unitPrice as { toString: () => string }).toString === 'function'
    ) {
      obj.unitPrice = Number((obj.unitPrice as { toString: () => string }).toString());
    }
    delete obj.__v;
    return obj;
  },
});

export const FuelLog = mongoose.model<IFuelLog>('FuelLog', fuelLogSchema);
