import mongoose, { Document, Schema } from 'mongoose';

export interface IExpenseCategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  icon: string;
  color: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const expenseCategorySchema = new Schema<IExpenseCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    icon: {
      type: String,
      default: 'receipt',
    },
    color: {
      type: String,
      default: '#2563EB',
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: 'expenseCategories',
    timestamps: true,
  },
);

export const ExpenseCategory = mongoose.model<IExpenseCategory>('ExpenseCategory', expenseCategorySchema);
