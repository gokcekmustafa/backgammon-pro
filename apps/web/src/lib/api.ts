import {
  getAccessToken,
  getRefreshToken,
  setStoredAuth,
  clearStoredAuth,
  getStoredUser,
} from './auth';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes('localhost')) return envUrl;
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

const BASE_URL = getBaseUrl();

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body?: unknown) {
    super(`API Error: ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function attemptRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearStoredAuth();
      return false;
    }

    const data = await res.json();
    const user = getStoredUser();
    if (user) {
      setStoredAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user,
      });
    }
    return true;
  } catch {
    clearStoredAuth();
    return false;
  }
}

export async function api<T = unknown>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options || {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers: { ...headers, ...(fetchOptions.headers as Record<string, string>) },
  });

  if (res.status === 401 && !skipAuth) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      res = await fetch(`${BASE_URL}${path}`, {
        ...fetchOptions,
        headers: { ...headers, ...(fetchOptions.headers as Record<string, string>) },
      });
    } else {
      clearStoredAuth();
      throw new ApiError(401);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }

  return res.json() as Promise<T>;
}
