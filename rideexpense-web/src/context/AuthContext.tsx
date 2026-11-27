import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { isAuthRejectionError, tokenStorage } from '../services/apiClient';
import { authService } from '../services/authService';
import { User, UserPreference } from '../types';

interface AuthContextValue {
  user: User | null;
  preferences: UserPreference | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialCache = tokenStorage.getCachedProfile();
  const hasStoredCreds = Boolean(
    tokenStorage.getAccessToken() || tokenStorage.getRefreshToken(),
  );

  const [user, setUser] = useState<User | null>(
    hasStoredCreds ? initialCache.user : null,
  );
  const [preferences, setPreferences] = useState<UserPreference | null>(
    hasStoredCreds ? initialCache.preferences : null,
  );
  // If we already have cached user + tokens, show workspace right away without a login flash
  const [isLoading, setIsLoading] = useState<boolean>(!(hasStoredCreds && initialCache.user));

  const refreshProfile = useCallback(async () => {
    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();

    try {
      if (!accessToken && refreshToken) {
        await authService.refreshSession();
      } else if (!accessToken && !refreshToken) {
        // Also check HttpOnly refresh cookie if user only had a cookie session
        try {
          await authService.refreshSession();
        } catch {
          tokenStorage.clearTokens();
          setUser(null);
          setPreferences(null);
          setIsLoading(false);
          return;
        }
      }

      const data = await authService.getMe();
      setUser(data.user);
      setPreferences(data.preferences);
    } catch (err) {
      if (isAuthRejectionError(err)) {
        tokenStorage.clearTokens();
        setUser(null);
        setPreferences(null);
      } else {
        // Keep cached session on network offline, timeouts, or 5xx errors so the user isn't signed out
        const cached = tokenStorage.getCachedProfile();
        if (cached.user && (tokenStorage.getAccessToken() || tokenStorage.getRefreshToken())) {
          setUser(cached.user);
          setPreferences(cached.preferences);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  // Keep auth state synchronized if user explicitly signs out in another browser tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'vehixa_access_token' && !e.newValue && !tokenStorage.getRefreshToken()) {
        setUser(null);
        setPreferences(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authService.login({ email, password });
    setUser(data.user);
    setPreferences(data.preferences);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await authService.register({ name, email, password });
    setUser(data.user);
    setPreferences(data.preferences);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setPreferences(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
