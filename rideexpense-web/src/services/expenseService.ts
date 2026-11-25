import { ApiResponse, Expense, ExpenseCategory, PaginationMeta, PaymentMethod } from '../types';
import { apiClient } from './apiClient';

export const expenseService = {
  async getCategories(): Promise<ExpenseCategory[]> {
    const res = await apiClient.get<ApiResponse<ExpenseCategory[]>>('/expenses/categories');
    return res.data.data;
  },

  async list(params: {
    q?: string;
    vehicleId?: string;
    categoryId?: string;
    paymentMethod?: PaymentMethod | '';
    startDate?: string;
    endDate?: string;
    sortBy?: 'expenseDate' | 'amount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: Expense[]; totalAmount: number; pagination: PaginationMeta }> {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined),
    );
    const res = await apiClient.get<ApiResponse<Expense[]>>('/expenses', { params: cleanParams });
    return {
      items: res.data.data,
      totalAmount: res.data.meta?.totalAmount ?? 0,
      pagination: res.data.meta?.pagination ?? {
        total: res.data.data.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    };
  },

  async create(payload: {
    vehicleId: string;
    categoryId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    description?: string;
    expenseDate?: string;
    attachmentUrl?: string;
  }): Promise<Expense> {
    const res = await apiClient.post<ApiResponse<Expense>>('/expenses', payload);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/expenses/${id}`);
  },
};
