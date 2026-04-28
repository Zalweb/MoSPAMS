import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User } from '@/shared/types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@mospams.com', role: 'Admin', status: 'Active', lastActive: new Date().toISOString() },
  { id: '2', name: 'Staff User', email: 'staff@mospams.com', role: 'Staff', status: 'Active', lastActive: new Date().toISOString() },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('mospams_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((email: string, password: string) => {
    const found = DEMO_USERS.find(
      (u) => u.email === email && password === 'password'
    );
    if (found) {
      setUser(found);
      localStorage.setItem('mospams_user', JSON.stringify(found));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('mospams_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
