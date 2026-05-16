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

// ─── Color utilities ─────────────────────────────────────────────────────────

function parseHex(hex: string): [number, number, number] {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

// WCAG relative luminance
function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Return white or near-black that meets WCAG AA (4.5:1) against bgHex
function textOnColor(bgHex: string): string {
  const lum = luminance(bgHex);
  const wContrast = (1.05) / (lum + 0.05);
  const bContrast = (lum + 0.05) / (0.05);
  return wContrast >= bContrast ? '#ffffff' : '#111111';
}

// Adjust HSL lightness by delta (-100 to +100)
function shiftLightness(hex: string, delta: number): string {
  const [r, g, b] = parseHex(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  const newL = Math.max(0, Math.min(1, l + delta / 100));
  const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
  const p = 2 * newL - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) { const v = Math.round(newL * 255); return toHex(v, v, v); }
  return toHex(hue2rgb(h + 1 / 3) * 255, hue2rgb(h) * 255, hue2rgb(h - 1 / 3) * 255);
}

// Blend two hex colors at ratio 0–1 (0 = all a, 1 = all b)
function blendHex(a: string, b: string, ratio: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex(ar + (br - ar) * ratio, ag + (bg - ag) * ratio, ab + (bb - ab) * ratio);
}

export function hexToHsl(hex: string): string {
  const [r, g, b] = parseHex(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// ─── Core branding applier ────────────────────────────────────────────────────

function applyBranding(branding: TenantBranding) {
  const root = document.documentElement;
  const primary   = branding.primaryColor   || '#ef4444';
  const secondary = branding.secondaryColor || '#f97316';

  // Luminance-based flags
  const lum        = luminance(primary);
  const isVeryDark = lum < 0.04;
  const isDark     = lum < 0.18;
  const isLight    = lum > 0.65;

  // ── Derived colors ──
  const mixed       = blendHex(primary, secondary, 0.5);
  const textOn      = textOnColor(primary);
  const textOnSec   = textOnColor(secondary);
  const textOnMixed = textOnColor(mixed);

  // Hover: brighten when dark, darken when light
  const hoverShift  = isVeryDark ? 22 : isDark ? 14 : isLight ? -12 : -8;
  const activeShift = isVeryDark ? 32 : isDark ? 22 : isLight ? -18 : -14;
  const primaryHover  = shiftLightness(primary, hoverShift);
  const primaryActive = shiftLightness(primary, activeShift);

  // Slightly lightened surface of mixed gradient end for subtle accents
  const primaryLight = shiftLightness(primary, isVeryDark ? 55 : isDark ? 40 : isLight ? -30 : 30);

  // ── Safe text colors: brand-tinted text guaranteed readable on page backgrounds ──
  // safeTextLight = readable against white (#fff) — WCAG AA needs contrast ≥ 4.5
  const safeTextLight = (() => {
    let color = mixed;
    for (let i = 0; i < 15; i++) {
      const lum = luminance(color);
      if ((1.05) / (lum + 0.05) >= 4.5) break;
      color = shiftLightness(color, -5);
    }
    return color;
  })();
  // safeTextDark = readable against typical dark bg (L ≈ 0.005)
  const safeTextDark = (() => {
    const darkBgLum = 0.005;
    let color = mixed;
    for (let i = 0; i < 15; i++) {
      const lum = luminance(color);
      if ((lum + 0.05) / (darkBgLum + 0.05) >= 4.5) break;
      color = shiftLightness(color, 5);
    }
    return color;
  })();

  // ── RGB values for rgba() usage ──
  const [pr, pg, pb] = parseHex(primary);
  const [sr, sg, sb] = parseHex(secondary);
  const [mr, mg, mb] = parseHex(mixed);

  const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${a})`;

  // Surface opacities — boost slightly if very dark so surfaces stay perceptible
  const surfaceAlpha = isVeryDark ? 0.12 : 0.08;
  const mutedAlpha   = isVeryDark ? 0.20 : 0.14;
  const borderAlpha  = isVeryDark ? 0.30 : 0.22;

  // Gradient strings
  const gradient        = `linear-gradient(135deg, ${primary}, ${secondary})`;
  const gradientSubtle  = `linear-gradient(135deg, ${rgba(pr,pg,pb,surfaceAlpha)}, ${rgba(sr,sg,sb,surfaceAlpha)})`;
  const gradientMuted   = `linear-gradient(135deg, ${rgba(pr,pg,pb,mutedAlpha)}, ${rgba(sr,sg,sb,mutedAlpha)})`;

  // Adaptive shadow using primary color
  const glowShadow = `0 4px 24px ${rgba(pr,pg,pb,0.28)}, 0 1px 6px ${rgba(pr,pg,pb,0.18)}`;

  // ── Set all CSS variables ──
  const set = (k: string, v: string) => root.style.setProperty(k, v);

  // Brand palette
  set('--brand-primary',           primary);
  set('--brand-secondary',         secondary);
  set('--brand-mixed',             mixed);
  set('--brand-primary-hover',     primaryHover);
  set('--brand-primary-active',    primaryActive);
  set('--brand-primary-light',     primaryLight);

  // Text-on-brand (WCAG contrast safe — for text ON brand-colored backgrounds)
  set('--brand-text-on-primary',   textOn);
  set('--brand-text-on-secondary', textOnSec);
  set('--brand-text-on-mixed',     textOnMixed);

  // Brand-tinted text safe for neutral backgrounds (WCAG AA ≥ 4.5:1)
  set('--brand-safe-text',         safeTextLight);   // readable on light bg
  set('--brand-safe-text-dark',    safeTextDark);    // readable on dark bg

  // Surfaces (rgba for opacity control)
  set('--brand-surface',           rgba(pr, pg, pb, surfaceAlpha));
  set('--brand-surface-muted',     rgba(pr, pg, pb, mutedAlpha));
  set('--brand-surface-gradient',  gradientSubtle);
  set('--brand-surface-gradient-muted', gradientMuted);

  // Border & glow
  set('--brand-border',            rgba(pr, pg, pb, borderAlpha));
  set('--brand-glow',              glowShadow);

  // Full gradient (for backgrounds, buttons)
  set('--brand-gradient',          gradient);

  // RGB triples for arbitrary rgba() in components
  set('--brand-primary-rgb',       `${pr} ${pg} ${pb}`);
  set('--brand-secondary-rgb',     `${sr} ${sg} ${sb}`);
  set('--brand-mixed-rgb',         `${mr} ${mg} ${mb}`);

  // ── Backward-compat variables ──
  set('--tenant-primary',          primary);
  set('--tenant-secondary',        secondary);
  set('--color-primary-rgb',       `${pr} ${pg} ${pb}`);
  set('--color-secondary-rgb',     `${sr} ${sg} ${sb}`);
  set('--color-mixed-rgb',         `${mr} ${mg} ${mb}`);
  set('--color-primary',           hexToHsl(primary));
  set('--color-secondary',         hexToHsl(secondary));

  // ── Adaptive sidebar/navbar brightness hints ──
  // When primary is very dark, expose a flag so CSS can apply a subtle lift
  root.setAttribute('data-brand-dark',  isDark     ? 'true' : 'false');
  root.setAttribute('data-brand-light', isLight    ? 'true' : 'false');
  root.setAttribute('data-brand-very-dark', isVeryDark ? 'true' : 'false');

  // ── Meta / favicon ──
  document.title = branding.shopName || 'MoSPAMS';

  let themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.setAttribute('name', 'theme-color');
    document.head.appendChild(themeMeta);
  }
  themeMeta.setAttribute('content', primary);

  const href = branding.logoUrl || '/images/logo.svg';
  let iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!iconLink) {
    iconLink = document.createElement('link');
    iconLink.setAttribute('rel', 'icon');
    document.head.appendChild(iconLink);
  }
  iconLink.setAttribute('href', href);
}

async function fetchBrandingOnce(signal: AbortSignal): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/shop/info`, {
    signal,
    headers: {
      Accept: 'application/json',
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

    // ── Auto-sync branding in the background ──
    
    // 1. Poll every 5 minutes
    const intervalId = setInterval(() => {
      void loadBranding();
    }, 5 * 60 * 1000);

    // 2. Refetch when window regains focus or becomes visible
    const handleFocus = () => void loadBranding();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadBranding();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => { 
      activeRef.current = false; 
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
