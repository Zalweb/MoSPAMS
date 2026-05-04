import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, GoogleData } from '@/shared/types';
import { apiGet, apiMutation, setAuthToken } from '@/shared/lib/api';
import { normalizeRole } from '@/shared/lib/roles';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  googleLogin: (credential: string) => Promise<{ needsRegistration: true; googleData: GoogleData } | { needsRegistration: false }>;
  googleRegister: (payload: {
    google_id: string;
    name: string;
    email: string;
    phone?: string;
    password: string;
    requested_role: 'customer' | 'staff' | 'mechanic';
  }) => Promise<boolean>;
  logout: () => void;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface LoginResponse { token: string; user: User }
interface GoogleLoginResponse {
  needs_registration?: true;
  google_data?: GoogleData;
  token?: string;
  user?: User;
}

function normalizeUserRole(user: User): User {
  const normalizedRole = normalizeRole(user.role);
  return normalizedRole ? { ...user, role: normalizedRole } : user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    apiGet<{ user: User }>('/api/me')
      .then(response => setUser(normalizeUserRole(response.user)))
      .catch(() => {
        setAuthToken(null);
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiMutation<LoginResponse>('/api/login', 'POST', { email, password });
      setAuthToken(response.token);
      setUser(normalizeUserRole(response.user));
      return { success: true };
    } catch (error) {
      setAuthToken(null);
      setUser(null);
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
      if (response.token && response.user) {
        setAuthToken(response.token);
        setUser(normalizeUserRole(response.user));
      }
      return { needsRegistration: false as const };
    } catch {
      return { needsRegistration: false as const };
    }
  }, []);

  const googleRegister = useCallback(async (payload: {
    google_id: string;
    name: string;
    email: string;
    phone?: string;
    password: string;
    requested_role: 'customer' | 'staff' | 'mechanic';
  }) => {
    try {
      const response = await apiMutation<LoginResponse>('/api/auth/google/register', 'POST', payload);
      setAuthToken(response.token);
      setUser(normalizeUserRole(response.user));
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    try {
      await apiMutation('/api/logout', 'POST');
    } catch {
      // ignore — local session already cleared above
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      googleLogin,
      googleRegister,
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
