import { ApiResponse, AppNotification } from '../types';
import { apiClient } from './apiClient';

export const notificationService = {
  async list(): Promise<{ items: AppNotification[]; unreadCount: number }> {
    const res = await apiClient.get<ApiResponse<AppNotification[]>>('/notifications');
    return {
      items: res.data.data,
      unreadCount: res.data.meta?.unreadCount ?? 0,
    };
  },

  async markRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },
};
