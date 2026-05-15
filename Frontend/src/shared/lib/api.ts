type ApiMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly data: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const TOKEN_STORAGE_KEY = 'mospams_auth_token';

// Rehydrate from localStorage or sessionStorage so the token survives page refreshes.
let authToken: string | null = null;
if (typeof window !== 'undefined') {
  authToken = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

const REQUEST_HOST = typeof window !== 'undefined' ? window.location.host : null;

export function getAuthToken(): string | null {
  return authToken;
}

export function setAuthToken(token: string | null, remember: boolean = true) {
  authToken = token;
  if (typeof window !== 'undefined') {
    // Clear both first
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);

    if (token) {
      if (remember) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
    }
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, 'GET');
}

export async function apiMutation<T = unknown>(path: string, method: ApiMethod, body?: unknown): Promise<T> {
  return apiRequest<T>(path, method, body);
}

async function apiRequest<T>(path: string, method: ApiMethod | 'GET', body?: unknown): Promise<T> {
  const isFormData = body instanceof FormData;
  
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(REQUEST_HOST ? { 'X-Tenant-Host': REQUEST_HOST } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      // Don't set Content-Type for FormData - browser will set it with boundary
      ...(body === undefined || isFormData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `API request failed (${response.status})`;
    let data: Record<string, unknown> = {};
    try {
      const payload = await response.json();
      if (typeof payload?.message === 'string') message = payload.message;
      if (payload && typeof payload === 'object') data = payload as Record<string, unknown>;
    } catch {
      // Keep the default error when the backend does not return JSON.
    }
    throw new ApiError(message, response.status, data);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
