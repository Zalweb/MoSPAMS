import { createContext, useContext, ReactNode } from 'react';
import { useTenantBranding } from './TenantBrandingContext';
import type { ShopBranding } from '@/shared/types/shop';

interface ShopContextValue {
  shop: ShopBranding | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { branding, error, refreshBranding } = useTenantBranding();

  const shop: ShopBranding | null = branding
    ? {
        shopName: branding.shopName,
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
      }
    : null;

  return (
    <ShopContext.Provider value={{ shop, loading: false, error, refetch: refreshBranding }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
