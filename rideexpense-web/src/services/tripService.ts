import { ApiResponse, PaginationMeta, Trip, TripLocationPoint } from '../types';
import { apiClient } from './apiClient';

export const tripService = {
  async list(params: {
    q?: string;
    vehicleId?: string;
    trackingType?: 'manual' | 'gps' | '';
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: Trip[]; pagination: PaginationMeta }> {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined),
    );
    const res = await apiClient.get<ApiResponse<Trip[]>>('/trips', { params: cleanParams });
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

  async getById(id: string): Promise<{ trip: Trip; locations: TripLocationPoint[] }> {
    const res = await apiClient.get<ApiResponse<{ trip: Trip; locations: TripLocationPoint[] }>>(
      `/trips/${id}`,
    );
    return res.data.data;
  },

  async createManual(payload: {
    vehicleId: string;
    startLocation?: string;
    endLocation?: string;
    startOdometer: number;
    endOdometer: number;
    purpose?: string;
    duration?: number;
    notes?: string;
    startTime?: string;
  }): Promise<Trip> {
    const res = await apiClient.post<ApiResponse<Trip>>('/trips', {
      ...payload,
      trackingType: 'manual',
    });
    return res.data.data;
  },

  async startGps(payload: {
    vehicleId: string;
    startLocation?: string;
    purpose?: string;
    notes?: string;
  }): Promise<Trip> {
    const res = await apiClient.post<ApiResponse<Trip>>('/trips', {
      ...payload,
      trackingType: 'gps',
    });
    return res.data.data;
  },

  async pushLocations(
    tripId: string,
    locations: TripLocationPoint[],
  ): Promise<{ acceptedCount: number; filteredOutCount: number; totalDistance: number }> {
    const res = await apiClient.post<
      ApiResponse<{ acceptedCount: number; filteredOutCount: number; totalDistance: number }>
    >(`/trips/${tripId}/locations`, { locations });
    return res.data.data;
  },

  async completeGps(
    tripId: string,
    payload: { endLocation?: string; endOdometer?: number; distanceKm?: number; notes?: string },
  ): Promise<Trip> {
    const res = await apiClient.post<ApiResponse<Trip>>(`/trips/${tripId}/complete`, payload);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/trips/${id}`);
  },
};
