type ApiMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const TOKEN_STORAGE_KEY = 'mospams_auth_token';

// Rehydrate from localStorage so the token survives page refreshes.
let authToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;

const REQUEST_HOST = typeof window !== 'undefined' ? window.location.host : null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
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
      'ngrok-skip-browser-warning': 'true',
      ...(REQUEST_HOST ? { 'X-Tenant-Host': REQUEST_HOST } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      // Don't set Content-Type for FormData - browser will set it with boundary
      ...(body === undefined || isFormData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `API request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (typeof payload?.message === 'string') message = payload.message;
    } catch {
      // Keep the default error when the backend does not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
