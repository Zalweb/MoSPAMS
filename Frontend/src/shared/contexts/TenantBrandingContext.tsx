import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { setTenantBootstrapReady } from '@/shared/lib/api';
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
  loading: boolean;
  ready: boolean;
  statusCode: number | null;
  error: string | null;
  branding: TenantBranding | null;
}

const TenantBrandingContext = createContext<TenantBootstrapState | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
function setMetaThemeColor(color: string) {
  let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.setAttribute('name', 'theme-color');
    document.head.appendChild(themeMeta);
  }
  themeMeta.setAttribute('content', color);
}

function setFavicon(iconUrl: string | null) {
  const href = iconUrl || '/favicon.ico';
  let iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!iconLink) {
    iconLink = document.createElement('link');
    iconLink.setAttribute('rel', 'icon');
    document.head.appendChild(iconLink);
  }
  iconLink.setAttribute('href', href);
}

function applyBranding(branding: TenantBranding) {
  const root = document.documentElement;
  root.style.setProperty('--tenant-primary', branding.primaryColor || '#3B82F6');
  root.style.setProperty('--tenant-secondary', branding.secondaryColor || '#10B981');

  document.title = `${branding.shopName} | MoSPAMS`;
  setMetaThemeColor(branding.primaryColor || '#3B82F6');
  setFavicon(branding.logoUrl);
}

export function TenantBrandingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TenantBootstrapState>({
    loading: true,
    ready: false,
    statusCode: null,
    error: null,
    branding: null,
  });

  useEffect(() => {
    let active = true;
    setTenantBootstrapReady(false);

    const hostMode = currentHostMode();
    if (hostMode === 'platform' || hostMode === 'public') {
      setState({
        loading: false,
        ready: true,
        statusCode: null,
        error: null,
        branding: null,
      });
      setTenantBootstrapReady(true);
      return () => {
        active = false;
        setTenantBootstrapReady(false);
      };
    }

    async function loadBranding() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/shop/info`, {
          headers: {
            Accept: 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          if (!active) return;
          
          let errorMessage = 'Tenant bootstrap failed';
          if (typeof payload?.message === 'string') {
            errorMessage = payload.message;
          } else if (response.status === 404) {
            errorMessage = 'Shop not found. Please check the URL or contact support.';
          } else {
            errorMessage = `Tenant bootstrap failed (HTTP ${response.status})`;
          }
          
          setState({
            loading: false,
            ready: false,
            statusCode: response.status,
            error: errorMessage,
            branding: null,
          });
          setTenantBootstrapReady(false);
          return;
        }

        const payload = await response.json() as { data: TenantBranding };
        if (!active) return;

        applyBranding(payload.data);

        setState({
          loading: false,
          ready: true,
          statusCode: null,
          error: null,
          branding: payload.data,
        });
        setTenantBootstrapReady(true);
      } catch (error) {
        if (!active) return;
        setState({
          loading: false,
          ready: false,
          statusCode: null,
          error: error instanceof Error ? error.message : 'Tenant bootstrap failed.',
          branding: null,
        });
        setTenantBootstrapReady(false);
      }
    }

    void loadBranding();

    return () => {
      active = false;
      setTenantBootstrapReady(false);
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return <TenantBrandingContext.Provider value={value}>{children}</TenantBrandingContext.Provider>;
}

export function useTenantBranding() {
  const value = useContext(TenantBrandingContext);
  if (!value) {
    throw new Error('useTenantBranding must be used inside TenantBrandingProvider');
  }
  return value;
}
