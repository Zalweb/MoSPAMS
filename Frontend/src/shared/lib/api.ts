type ApiMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
let authToken: string | null = null;
let tenantBootstrapReady = false;
const REQUEST_HOST = typeof window !== 'undefined' ? window.location.host : null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setTenantBootstrapReady(ready: boolean) {
  tenantBootstrapReady = ready;
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, 'GET');
}

export async function apiMutation<T = unknown>(path: string, method: ApiMethod, body?: unknown): Promise<T> {
  return apiRequest<T>(path, method, body);
}

async function apiRequest<T>(path: string, method: ApiMethod | 'GET', body?: unknown): Promise<T> {
  if (!tenantBootstrapReady && path !== '/api/shop/info') {
    throw new Error('Tenant context is not ready yet.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(REQUEST_HOST ? { 'X-Tenant-Host': REQUEST_HOST } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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
