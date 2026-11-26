import { ApiResponse, FuelLog, PaginationMeta, PaymentMethod } from '../types';
import { apiClient } from './apiClient';

export const fuelService = {
  async list(params: {
    vehicleId?: string;
    fuelType?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    items: FuelLog[];
    pagination: PaginationMeta;
    summary: { totalFuelCost: number; totalQuantity: number; averageMileage: number };
  }> {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined),
    );
    const res = await apiClient.get<ApiResponse<FuelLog[]>>('/fuel', { params: cleanParams });
    return {
      items: res.data.data,
      pagination: res.data.meta?.pagination ?? {
        total: res.data.data.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      summary: res.data.meta?.summary ?? {
        totalFuelCost: 0,
        totalQuantity: 0,
        averageMileage: 0,
      },
    };
  },

  async create(payload: {
    vehicleId: string;
    fuelType: 'Petrol' | 'Diesel' | 'CNG' | 'EV charging';
    quantity?: number;
    totalAmount?: number;
    unitPrice: number;
    odometer: number;
    isFullTank: boolean;
    expenseDate?: string;
    paymentMethod: PaymentMethod;
    description?: string;
  }) {
    const res = await apiClient.post('/fuel', payload);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/fuel/${id}`);
  },
};
