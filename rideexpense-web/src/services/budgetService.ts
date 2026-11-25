import { ApiResponse, BudgetProgress } from '../types';
import { apiClient } from './apiClient';

export const budgetService = {
  async getProgress(): Promise<BudgetProgress[]> {
    const res = await apiClient.get<ApiResponse<BudgetProgress[]>>('/budgets/progress');
    return res.data.data;
  },

  async create(payload: {
    categoryId?: string;
    vehicleId?: string;
    amount: number;
    period: 'monthly' | 'weekly' | 'annual' | 'custom';
    startDate: string;
    endDate: string;
  }) {
    const res = await apiClient.post('/budgets', payload);
    return res.data.data;
  },

  async update(
    id: string,
    payload: {
      categoryId?: string | null;
      vehicleId?: string | null;
      amount?: number;
      period?: 'monthly' | 'weekly' | 'annual' | 'custom';
      startDate?: string;
      endDate?: string;
    },
  ) {
    const res = await apiClient.put(`/budgets/${id}`, payload);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/budgets/${id}`);
  },
};
