import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { User, UserPreference } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const ACCESS_TOKEN_KEY = 'vehixa_access_token';
const REFRESH_TOKEN_KEY = 'vehixa_refresh_token';
const CACHED_USER_KEY = 'vehixa_cached_user';
const CACHED_PREFS_KEY = 'vehixa_cached_prefs';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  getCachedProfile: (): { user: User | null; preferences: UserPreference | null } => {
    try {
      const userRaw = localStorage.getItem(CACHED_USER_KEY);
      const prefsRaw = localStorage.getItem(CACHED_PREFS_KEY);
      return {
        user: userRaw ? (JSON.parse(userRaw) as User) : null,
        preferences: prefsRaw ? (JSON.parse(prefsRaw) as UserPreference) : null,
      };
    } catch {
      return { user: null, preferences: null };
    }
  },
  setCachedProfile: (user: User, preferences: UserPreference | null) => {
    try {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
      if (preferences) {
        localStorage.setItem(CACHED_PREFS_KEY, JSON.stringify(preferences));
      }
    } catch {
      // Ignore storage quota errors
    }
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(CACHED_USER_KEY);
    localStorage.removeItem(CACHED_PREFS_KEY);
  },
};

export function isAuthRejectionError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function performSerializedRefresh(failedToken?: string): Promise<string> {
  const runRefresh = async (): Promise<string> => {
    // Another tab or in-flight request may have already rotated tokens
    const latestAccess = tokenStorage.getAccessToken();
    if (latestAccess && failedToken && latestAccess !== failedToken) {
      return latestAccess;
    }

    const refreshToken = tokenStorage.getRefreshToken();
    const res = await axios.post<{
      data: { accessToken: string; refreshToken: string };
    }>(
      `${API_BASE_URL}/auth/refresh`,
      refreshToken ? { refreshToken } : {},
      { withCredentials: true },
    );

    const { accessToken, refreshToken: newRefresh } = res.data.data;
    tokenStorage.setTokens(accessToken, newRefresh);
    return accessToken;
  };

  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('vehixa_token_refresh', runRefresh);
  }
  return runRefresh();
}

export async function refreshAccessToken(failedToken?: string): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performSerializedRefresh(failedToken).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      const authHeader = originalRequest.headers?.Authorization;
      const failedToken =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : undefined;

      originalRequest._retry = true;
      try {
        const newAccessToken = await refreshAccessToken(failedToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Only wipe persistent session if server explicitly rejected refresh credentials
        if (isAuthRejectionError(refreshError)) {
          tokenStorage.clearTokens();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
