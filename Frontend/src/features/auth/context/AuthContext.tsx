import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Account, Membership, PendingShopJoin, TenantShopSummary, User, GoogleData } from '@/shared/types';
import { apiGet, apiMutation, getAuthToken, setAuthToken, ApiError } from '@/shared/lib/api';
import { normalizeRole } from '@/shared/lib/roles';

interface AuthContextType {
  user: User | null;
  account: Account | null;
  membership: Membership | null;
  pendingJoin: PendingShopJoin | null;
  login: (email: string, password: string, remember?: boolean) => Promise<{ success: true } | { success: false; error?: string } | { needsMembership: true } | { requiresVerification: true; email: string }>;
  googleLogin: (credential: string) => Promise<{ needsRegistration: true; googleData: GoogleData } | { needsMembership: true } | { needsRegistration: false }>;
  googleRegister: (payload: {
    google_id: string;
    name: string;
    email: string;
    phone?: string;
    password: string;
    requested_role: 'customer' | 'staff' | 'mechanic';
    tenant_host?: string;
  }) => Promise<{ ok: true; token: string } | { ok: false; error: string }>;
  joinShop: (joinToken: string, tenantHost?: string) => Promise<{ success: true } | { success: false; error: string }>;
  clearPendingJoin: () => void;
  refreshUser: () => Promise<User>;
  logout: () => void;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthResponse {
  token?: string;
  user?: User;
  account?: Account | null;
  membership?: Membership | null;
  needs_membership?: true;
  allowed_join_role?: 'Customer';
  join_token?: string;
  shop?: TenantShopSummary;
}
interface GoogleLoginResponse {
  needs_registration?: true;
  google_data?: GoogleData;
  needs_membership?: true;
  allowed_join_role?: 'Customer';
  join_token?: string;
  shop?: TenantShopSummary;
  token?: string;
  user?: User;
  account?: Account | null;
  membership?: Membership | null;
}

function normalizeUserRole(user: User): User {
  const normalizedRole = normalizeRole(user.role);
  return normalizedRole ? { ...user, role: normalizedRole } : user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [pendingJoin, setPendingJoin] = useState<PendingShopJoin | null>(null);
  const [ready, setReady] = useState(false);
  const [shouldRemember, setShouldRemember] = useState(true);

  const clearPendingJoin = useCallback(() => setPendingJoin(null), []);

  const applyAuthResponse = useCallback((response: AuthResponse, remember: boolean = true) => {
    if (!response.token || !response.user) return;

    setAuthToken(response.token, remember);
    setUser(normalizeUserRole(response.user));
    setAccount(response.account ?? null);
    setMembership(response.membership ?? null);
    setPendingJoin(null);
  }, []);

  const applyPendingJoin = useCallback((response: AuthResponse, remember: boolean = true) => {
    if (!response.needs_membership || !response.join_token || !response.shop) return;

    setAuthToken(null, remember);
    setUser(null);
    setMembership(null);
    setAccount(null);
    setPendingJoin({
      joinToken: response.join_token,
      allowedJoinRole: response.allowed_join_role ?? 'Customer',
      account: response.account ?? null,
      shop: response.shop,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await apiGet<{ user: User; account?: Account | null; membership?: Membership | null }>('/api/me');
    const normalizedUser = normalizeUserRole(response.user);
    setUser(normalizedUser);
    setAccount(response.account ?? null);
    setMembership(response.membership ?? null);
    setPendingJoin(null);
    return normalizedUser;
  }, []);

  useEffect(() => {
    if (!getAuthToken()) {
      setUser(null);
      setAccount(null);
      setMembership(null);
      setPendingJoin(null);
      setReady(true);
      return;
    }

    refreshUser()
      .catch(() => {
        setAuthToken(null);
        setUser(null);
        setAccount(null);
        setMembership(null);
        setPendingJoin(null);
      })
      .finally(() => setReady(true));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string, remember: boolean = true) => {
    try {
      setShouldRemember(remember);
      const response = await apiMutation<AuthResponse>('/api/login', 'POST', { email, password, remember });
      if (response.needs_membership) {
        applyPendingJoin(response, remember);
        return { needsMembership: true as const };
      }
      applyAuthResponse(response, remember);
      return { success: true as const };
    } catch (error) {
      setAuthToken(null);
      setUser(null);
      setAccount(null);
      setMembership(null);
      setPendingJoin(null);
      if (error instanceof ApiError && error.status === 403 && error.data.requiresVerification) {
        return { requiresVerification: true as const, email: error.data.email as string };
      }
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED') || errorMessage.includes('NetworkError')) {
        return { success: false, error: 'Internal Server Error. Please check your connection.' };
      }
      return { success: false, error: errorMessage };
    }
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    try {
      const response = await apiMutation<GoogleLoginResponse>('/api/auth/google', 'POST', { credential });
      if (response.needs_registration && response.google_data) {
        return { needsRegistration: true as const, googleData: response.google_data };
      }
      if (response.needs_membership) {
        applyPendingJoin(response, true); // Google login usually remembers
        return { needsMembership: true as const };
      }
      applyAuthResponse(response, true);
      return { needsRegistration: false as const };
    } catch {
      return { needsRegistration: false as const };
    }
  }, [applyAuthResponse, applyPendingJoin]);

  const googleRegister = useCallback(async (payload: {
    google_id: string;
    name: string;
    email: string;
    phone?: string;
    password: string;
    requested_role: 'customer' | 'staff' | 'mechanic';
    tenant_host?: string;
  }) => {
    try {
      const response = await apiMutation<AuthResponse>('/api/auth/google/register', 'POST', payload);
      applyAuthResponse(response, true);
      return { ok: true as const, token: response.token as string };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      return { ok: false as const, error: message };
    }
  }, [applyAuthResponse]);

  const joinShop = useCallback(async (joinToken: string, tenantHost?: string) => {
    try {
      const response = await apiMutation<AuthResponse>('/api/join-shop', 'POST', {
        join_token: joinToken,
        tenant_host: tenantHost,
      });
      applyAuthResponse(response, shouldRemember);
      return { success: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to join this shop.';
      return { success: false as const, error: message };
    }
  }, [applyAuthResponse]);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    setAccount(null);
    setMembership(null);
    setPendingJoin(null);
    try {
      await apiMutation('/api/logout', 'POST');
    } catch {
      // ignore — local session already cleared above
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      account,
      membership,
      pendingJoin,
      login,
      googleLogin,
      googleRegister,
      joinShop,
      clearPendingJoin,
      refreshUser,
      logout: () => { void logout(); },
      ready,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
