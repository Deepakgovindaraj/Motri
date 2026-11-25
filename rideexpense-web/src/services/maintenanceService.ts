import {
  ApiResponse,
  MaintenanceRecord,
  MaintenanceReminder,
  PaginationMeta,
  PaymentMethod,
  ServiceType,
} from '../types';
import { apiClient } from './apiClient';

export const maintenanceService = {
  async list(params: {
    vehicleId?: string;
    serviceType?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: MaintenanceRecord[]; pagination: PaginationMeta }> {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined),
    );
    const res = await apiClient.get<ApiResponse<MaintenanceRecord[]>>('/maintenance', {
      params: cleanParams,
    });
    return {
      items: res.data.data,
      pagination: res.data.meta?.pagination ?? {
        total: res.data.data.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    };
  },

  async getReminders(): Promise<MaintenanceReminder[]> {
    const res = await apiClient.get<ApiResponse<MaintenanceReminder[]>>('/maintenance/reminders');
    return res.data.data;
  },

  async create(payload: {
    vehicleId: string;
    serviceType: ServiceType;
    amount: number;
    serviceDate?: string;
    odometer: number;
    nextServiceDate?: string;
    nextServiceOdometer?: number;
    notes?: string;
    paymentMethod: PaymentMethod;
  }) {
    const res = await apiClient.post('/maintenance', payload);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/maintenance/${id}`);
  },
};
