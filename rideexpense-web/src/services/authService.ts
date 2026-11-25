import { ApiResponse, User, UserPreference } from '../types';
import { apiClient, tokenStorage } from './apiClient';

export interface AuthResponseData {
  user: User;
  preferences: UserPreference;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(payload: { name: string; email: string; password: string }): Promise<AuthResponseData> {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/register', payload);
    const data = res.data.data;
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async login(payload: { email: string; password: string }): Promise<AuthResponseData> {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', payload);
    const data = res.data.data;
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async getMe(): Promise<{ user: User; preferences: UserPreference }> {
    const res = await apiClient.get<ApiResponse<{ user: User; preferences: UserPreference }>>('/auth/me');
    return res.data.data;
  },

  async updateProfile(payload: {
    name?: string;
    preferences?: Partial<UserPreference>;
  }): Promise<{ user: User; preferences: UserPreference }> {
    const res = await apiClient.put<ApiResponse<{ user: User; preferences: UserPreference }>>(
      '/users/me',
      payload,
    );
    return res.data.data;
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } finally {
      tokenStorage.clearTokens();
    }
  },
};
