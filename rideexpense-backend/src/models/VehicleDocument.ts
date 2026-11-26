import mongoose, { Document, Schema } from 'mongoose';

export type DocumentCategory =
  | 'Insurance'
  | 'Registration'
  | 'Pollution Certificate'
  | 'Licence'
  | 'Warranty'
  | 'Other';

export interface IVehicleDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  vehicleId?: mongoose.Types.ObjectId;
  documentType: DocumentCategory;
  title: string;
  documentNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  fileUrl?: string;
  fileName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleDocumentSchema = new Schema<IVehicleDocument>(
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
      index: true,
    },
    documentType: {
      type: String,
      enum: ['Insurance', 'Registration', 'Pollution Certificate', 'Licence', 'Warranty', 'Other'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    documentNumber: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    issueDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
      index: true,
    },
    fileUrl: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    collection: 'vehicleDocuments',
    timestamps: true,
  },
);

vehicleDocumentSchema.index({ userId: 1, expiryDate: 1 });

export const VehicleDocument = mongoose.model<IVehicleDocument>(
  'VehicleDocument',
  vehicleDocumentSchema,
);
