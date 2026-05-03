export type HostMode = 'platform' | 'public' | 'tenant';

const PLATFORM_HOSTS = (import.meta.env.VITE_PLATFORM_ADMIN_HOSTS ?? 'admin.mospams.local,admin.mospams.shop')
  .split(',')
  .map((host: string) => normalizeHost(host))
  .filter(Boolean);

const PUBLIC_HOSTS = (import.meta.env.VITE_PUBLIC_HOSTS ?? 'mospams.local,mospams.shop')
  .split(',')
  .map((host: string) => normalizeHost(host))
  .filter(Boolean);

export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().split(':')[0];
}

export function isPlatformHost(host: string): boolean {
  return PLATFORM_HOSTS.includes(normalizeHost(host));
}

export function isPublicHost(host: string): boolean {
  return PUBLIC_HOSTS.includes(normalizeHost(host));
}

export function detectHostMode(host: string): HostMode {
  if (isPlatformHost(host)) {
    return 'platform';
  }

  if (isPublicHost(host)) {
    return 'public';
  }

  return 'tenant';
}

export function currentHostMode(): HostMode {
  if (typeof window === 'undefined') {
    return 'tenant';
  }

  return detectHostMode(window.location.host);
}
