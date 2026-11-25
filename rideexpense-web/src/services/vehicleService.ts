import { ApiResponse, FuelType, PaginationMeta, Vehicle, VehiclePayload, VehicleType } from '../types';
import { apiClient } from './apiClient';

export interface VehicleListParams {
  q?: string;
  vehicleType?: VehicleType | '';
  fuelType?: FuelType | '';
  page?: number;
  limit?: number;
}

export const vehicleService = {
  async list(params: VehicleListParams = {}): Promise<{
    items: Vehicle[];
    pagination: PaginationMeta;
  }> {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== '' && value !== undefined),
    );
    const res = await apiClient.get<ApiResponse<Vehicle[]>>('/vehicles', {
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

  async getById(id: string): Promise<Vehicle> {
    const res = await apiClient.get<ApiResponse<Vehicle>>(`/vehicles/${id}`);
    return res.data.data;
  },

  async create(payload: VehiclePayload): Promise<Vehicle> {
    const res = await apiClient.post<ApiResponse<Vehicle>>('/vehicles', payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<VehiclePayload>): Promise<Vehicle> {
    const res = await apiClient.put<ApiResponse<Vehicle>>(`/vehicles/${id}`, payload);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/vehicles/${id}`);
  },
};
