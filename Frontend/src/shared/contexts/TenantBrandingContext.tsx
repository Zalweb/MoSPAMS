import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { currentHostMode } from '@/shared/lib/hostMode';

export interface TenantBranding {
  shopId: number;
  shopName: string;
  subdomain: string | null;
  customDomain: string | null;
  domainStatus: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  socialMedia: { facebook: string | null; instagram: string | null };
  businessHours: Record<string, unknown> | null;
}

interface TenantBootstrapState {
  ready: boolean;
  statusCode: number | null;
  error: string | null;
  branding: TenantBranding | null;
  refreshBranding: () => Promise<void>;
}

const TenantBrandingContext = createContext<TenantBootstrapState | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;

function applyBranding(branding: TenantBranding) {
  const root = document.documentElement;
  
  // Set tenant colors
  root.style.setProperty('--tenant-primary', branding.primaryColor || '#3B82F6');
  root.style.setProperty('--tenant-secondary', branding.secondaryColor || '#10B981');
  
  // Convert hex to RGB for dashboard colors
  const primaryRgb = hexToRgb(branding.primaryColor || '#3B82F6');
  const secondaryRgb = hexToRgb(branding.secondaryColor || '#10B981');
  
  // Set dashboard color variables
  root.style.setProperty('--color-primary-rgb', primaryRgb);
  root.style.setProperty('--color-secondary-rgb', secondaryRgb);
  
  // Also update HSL format for Tailwind
  const primaryHsl = hexToHsl(branding.primaryColor || '#3B82F6');
  const secondaryHsl = hexToHsl(branding.secondaryColor || '#10B981');
  root.style.setProperty('--color-primary', primaryHsl);
  root.style.setProperty('--color-secondary', secondaryHsl);
  
  document.title = `${branding.shopName} | MoSPAMS`;

  let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.setAttribute('name', 'theme-color');
    document.head.appendChild(themeMeta);
  }
  themeMeta.setAttribute('content', branding.primaryColor || '#3B82F6');

  const href = branding.logoUrl || '/favicon.ico';
  let iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!iconLink) {
    iconLink = document.createElement('link');
    iconLink.setAttribute('rel', 'icon');
    document.head.appendChild(iconLink);
  }
  iconLink.setAttribute('href', href);
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `${r} ${g} ${b}`;
}

// Helper function to convert hex to HSL
function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lPercent = Math.round(l * 100);
  
  return `${h} ${s}% ${lPercent}%`;
}

async function fetchBrandingOnce(signal: AbortSignal): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/shop/info`, {
    signal,
    headers: {
      Accept: 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
  });
}

async function fetchWithRetry(attempt = 0): Promise<{ data: TenantBranding } | { status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetchBrandingOnce(controller.signal);
    clearTimeout(timer);

    if (!response.ok) {
      return { status: response.status };
    }

    const payload = await response.json() as { data: TenantBranding };
    return payload;
  } catch {
    clearTimeout(timer);
    if (attempt < MAX_RETRIES) {
      return fetchWithRetry(attempt + 1);
    }
    // Network/timeout exhausted — signal fallback
    return { status: 0 };
  }
}

export function TenantBrandingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<TenantBootstrapState, 'refreshBranding'>>({
    ready: true,
    statusCode: null,
    error: null,
    branding: null,
  });

  const activeRef = useRef(true);

  const loadBranding = useCallback(async () => {
    const result = await fetchWithRetry();

    if (!activeRef.current) return;

    if ('data' in result) {
      applyBranding(result.data);
      setState({ ready: true, statusCode: null, error: null, branding: result.data });
      return;
    }

    if (result.status === 404) {
      setState({ ready: false, statusCode: 404, error: 'Shop not found.', branding: null });
      return;
    }

    // 5xx, timeout, or network failure — stay optimistic with defaults
    setState(prev => ({ ...prev, ready: true, statusCode: null, error: null }));
  }, []);

  useEffect(() => {
    activeRef.current = true;

    const hostMode = currentHostMode();
    if (hostMode === 'platform' || hostMode === 'public') {
      // No fetch needed — resolve instantly
      return () => { activeRef.current = false; };
    }

    void loadBranding();

    return () => { activeRef.current = false; };
  }, [loadBranding]);

  const refreshBranding = useCallback(async () => {
    await loadBranding();
  }, [loadBranding]);

  const value = useMemo<TenantBootstrapState>(
    () => ({ ...state, refreshBranding }),
    [state, refreshBranding],
  );

  return (
    <TenantBrandingContext.Provider value={value}>
      {children}
    </TenantBrandingContext.Provider>
  );
}

export function useTenantBranding() {
  const value = useContext(TenantBrandingContext);
  if (!value) {
    throw new Error('useTenantBranding must be used inside TenantBrandingProvider');
  }
  return value;
}
