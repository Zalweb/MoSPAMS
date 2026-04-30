import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User } from '@/shared/types';
import { apiMutation, setAuthToken } from '@/shared/lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface LoginResponse { token: string; user: User }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiMutation<LoginResponse>('/api/login', 'POST', { email, password });
      setAuthToken(response.token);
      setUser(response.user);
      return true;
    } catch {
      setAuthToken(null);
      setUser(null);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiMutation('/api/logout', 'POST');
    } catch {
      // A failed logout request should still clear this browser session.
    }
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout: () => { void logout(); }, ready: true }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
