/**
 * Subdomain detection and URL helpers for multi-tenancy
 */

/**
 * Extract subdomain from current hostname
 */
export function getSubdomain(): string | null {
  const hostname = window.location.hostname;
  
  // localhost or mospams.local - no subdomain
  if (hostname === 'localhost' || hostname === 'mospams.local' || hostname === '127.0.0.1') {
    return null;
  }
  
  // Production: *.mospams.shop
  if (hostname.endsWith('.mospams.shop')) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return parts[0]; // e.g., "admin" from "admin.mospams.shop"
    }
  }
  
  return null;
}

/**
 * Check if current site is the public landing page
 */
export function isPublicSite(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'mospams.shop' || 
         hostname === 'www.mospams.shop' ||
         hostname === 'localhost' ||
         hostname === 'mospams.local' ||
         hostname === '127.0.0.1' ||
         hostname.includes('ngrok-free.dev') ||
         hostname.includes('ngrok.app');
}

/**
 * Check if current site is the admin platform
 */
export function isAdminSite(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'admin.mospams.shop' || hostname === 'admin.mospams.local';
}

/**
 * Check if current site is a tenant subdomain
 */
export function isTenantSite(): boolean {
  const subdomain = getSubdomain();
  return subdomain !== null && subdomain !== 'admin' && subdomain !== 'www';
}

/**
 * Get tenant subdomain (null if not a tenant site)
 */
export function getTenantSubdomain(): string | null {
  if (!isTenantSite()) return null;
  return getSubdomain();
}

/**
 * Get admin platform URL
 */
export function getAdminUrl(): string {
  const hostname = window.location.hostname;
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://admin.mospams.local:5173';
  }
  if (hostname === 'mospams.local' || hostname.endsWith('.mospams.local')) {
    return 'http://admin.mospams.local:5173';
  }
  
  // Production
  return 'https://admin.mospams.shop';
}

/**
 * Get public landing page URL
 */
export function getPublicUrl(): string {
  const hostname = window.location.hostname;
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://mospams.local:5173';
  }
  if (hostname.endsWith('.mospams.local')) {
    return 'http://mospams.local:5173';
  }
  
  // Production
  return 'https://mospams.shop';
}
