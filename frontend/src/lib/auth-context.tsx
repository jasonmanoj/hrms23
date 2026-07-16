'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, bootstrapSession, setAccessToken, setRefreshToken } from './api-client';
import { CurrentUser } from '@/types';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
  isAdminRole: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const restoredUser = await bootstrapSession();
      if (restoredUser) setUser(restoredUser as unknown as CurrentUser);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('hrms_refresh_token') : null;
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } catch {
      // ignore network errors on logout
    }
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const hasPermission = useCallback(
    (module: string, action: string) => {
      if (!user) return false;
      if (user.roleKey === 'SUPER_ADMIN') return true;
      return user.permissions?.includes(`${module}:${action}`) ?? false;
    },
    [user],
  );

  const isAdminRole = useMemo(
    () => !!user && ['SUPER_ADMIN', 'HR_ADMIN', 'HR_EXECUTIVE', 'DEPARTMENT_HEAD', 'REPORTING_MANAGER', 'ATTENDANCE_ADMIN', 'REPORT_VIEWER'].includes(user.roleKey ?? ''),
    [user],
  );

  const value = useMemo(() => ({ user, loading, login, logout, hasPermission, isAdminRole }), [user, loading, login, logout, hasPermission, isAdminRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
