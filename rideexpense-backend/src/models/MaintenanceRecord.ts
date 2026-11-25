import mongoose, { Document, Schema } from 'mongoose';

export interface IMaintenanceRecord extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  expenseId: mongoose.Types.ObjectId;
  serviceType:
    | 'Servicing'
    | 'Engine oil'
    | 'Tyre replacement'
    | 'Battery replacement'
    | 'Repairs'
    | 'Insurance'
    | 'Other';
  serviceDate: Date;
  odometer: number;
  nextServiceDate?: Date;
  nextServiceOdometer?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceRecordSchema = new Schema<IMaintenanceRecord>(
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
    serviceType: {
      type: String,
      enum: [
        'Servicing',
        'Engine oil',
        'Tyre replacement',
        'Battery replacement',
        'Repairs',
        'Insurance',
        'Other',
      ],
      required: true,
    },
    serviceDate: {
      type: Date,
      required: true,
    },
    odometer: {
      type: Number,
      required: true,
      min: 0,
    },
    nextServiceDate: {
      type: Date,
    },
    nextServiceOdometer: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    collection: 'maintenanceRecords',
    timestamps: true,
  },
);

maintenanceRecordSchema.index({ userId: 1, vehicleId: 1, serviceDate: -1 });

export const MaintenanceRecord = mongoose.model<IMaintenanceRecord>(
  'MaintenanceRecord',
  maintenanceRecordSchema,
);
