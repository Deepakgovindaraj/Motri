import {
  ApiResponse,
  CostPerKmResponse,
  DashboardAnalytics,
  MileageAnalyticsResponse,
  PeriodReportsResponse,
  VehicleComparisonItem,
} from '../types';
import { apiClient } from './apiClient';

export const analyticsService = {
  async getDashboard(): Promise<DashboardAnalytics> {
    const res = await apiClient.get<ApiResponse<DashboardAnalytics>>('/analytics/dashboard');
    return res.data.data;
  },

  async getMonthly(params: { year?: number; vehicleId?: string } = {}): Promise<PeriodReportsResponse> {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined),
    );
    const res = await apiClient.get<ApiResponse<PeriodReportsResponse>>('/analytics/monthly', {
      params: cleanParams,
    });
    return res.data.data;
  },

  async getMileage(vehicleId?: string): Promise<MileageAnalyticsResponse> {
    const res = await apiClient.get<ApiResponse<MileageAnalyticsResponse>>('/analytics/mileage', {
      params: vehicleId ? { vehicleId } : undefined,
    });
    return res.data.data;
  },

  async getCostPerKm(vehicleId?: string): Promise<CostPerKmResponse> {
    const res = await apiClient.get<ApiResponse<CostPerKmResponse>>('/analytics/cost-per-km', {
      params: vehicleId ? { vehicleId } : undefined,
    });
    return res.data.data;
  },

  async getComparison(): Promise<VehicleComparisonItem[]> {
    const res = await apiClient.get<ApiResponse<VehicleComparisonItem[]>>('/analytics/comparison');
    return res.data.data;
  },
};
