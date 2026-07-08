'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, attemptRefresh } from '@/lib/api';
import {
  getStoredUser,
  setStoredAuth,
  clearStoredAuth,
  setStoredUser,
  type AuthUser,
} from '@/lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    username: string,
    displayName: string,
  ) => Promise<void>;
  guestLogin: (displayName?: string) => Promise<void>;
  logout: () => void;
  updateUser: (updated: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      refreshAccessToken();
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'bp_user') {
        if (e.newValue) {
          try {
            setUser(JSON.parse(e.newValue));
          } catch {
            /* ignore */
          }
        } else {
          setUser(null);
        }
      }
      if (e.key === 'bp_access_token' && !e.newValue) {
        setUser(null);
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  async function refreshAccessToken() {
    try {
      await attemptRefresh();
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }), skipAuth: true },
      );
      const authUser: AuthUser = { ...data.user, type: 'user' };
      setStoredAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: authUser,
      });
      setUser(authUser);
      router.push('/lobby');
    },
    [router],
  );

  const register = useCallback(
    async (email: string, password: string, username: string, displayName: string) => {
      const data = await api<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, username, displayName }),
          skipAuth: true,
        },
      );
      const authUser: AuthUser = { ...data.user, type: 'user' };
      setStoredAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: authUser,
      });
      setUser(authUser);
      router.push('/lobby');
    },
    [router],
  );

  const guestLogin = useCallback(
    async (displayName?: string) => {
      const data = await api<{ accessToken: string; refreshToken: string; guest: AuthUser }>(
        '/auth/guest-login',
        { method: 'POST', body: JSON.stringify({ displayName }), skipAuth: true },
      );
      const authUser: AuthUser = { ...data.guest, type: 'guest' };
      setStoredAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: authUser,
      });
      setUser(authUser);
      router.push('/lobby');
    },
    [router],
  );

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    router.push('/');
  }, [router]);

  const updateUser = useCallback((updated: AuthUser) => {
    setUser(updated);
    setStoredUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        guestLogin,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
