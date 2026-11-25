import mongoose, { Document, Schema } from 'mongoose';

export interface IExpenseAttachment extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  expenseId: mongoose.Types.ObjectId;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

const expenseAttachmentSchema = new Schema<IExpenseAttachment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expenseId: {
      type: Schema.Types.ObjectId,
      ref: 'Expense',
      required: true,
      index: true,
    },
    fileKey: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    collection: 'expenseAttachments',
    timestamps: true,
  },
);

export const ExpenseAttachment = mongoose.model<IExpenseAttachment>(
  'ExpenseAttachment',
  expenseAttachmentSchema,
);
