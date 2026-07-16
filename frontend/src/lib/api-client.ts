import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// Access token lives in memory only (cleared on page reload) to limit XSS exposure.
// The refresh token is a single-use rotating opaque token; for this MVP it is kept in
// localStorage since the API returns it in the JSON body rather than an httpOnly cookie.
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('hrms_refresh_token');
}

export function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('hrms_refresh_token', token);
  else localStorage.removeItem('hrms_refresh_token');
}

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
}

let lastRefreshUser: Record<string, unknown> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<RefreshResult>(`${API_URL}/auth/refresh`, { refreshToken });
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    lastRefreshUser = data.user;
    return data.accessToken;
  } catch {
    setAccessToken(null);
    setRefreshToken(null);
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export async function bootstrapSession(): Promise<Record<string, unknown> | null> {
  const token = await performRefresh();
  return token ? lastRefreshUser : null;
}
