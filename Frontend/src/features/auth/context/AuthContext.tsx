import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, StoredUser } from '@/shared/types';
import { hashPassword, verifyPassword } from '@/shared/lib/hash';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_KEY = 'mospams_users';
const SESSION_KEY = 'mospams_user';

async function ensureSeedUsers(): Promise<StoredUser[]> {
  const raw = localStorage.getItem(USERS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as StoredUser[];
    } catch {
      // fall through to seed
    }
  }
  const defaultHash = await hashPassword('password');
  const seed: StoredUser[] = [
    { id: '1', name: 'Admin User', email: 'admin@mospams.com', role: 'Admin', status: 'Active', lastActive: new Date().toISOString(), passwordHash: defaultHash },
    { id: '2', name: 'Staff User', email: 'staff@mospams.com', role: 'Staff', status: 'Active', lastActive: new Date().toISOString(), passwordHash: defaultHash },
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(seed));
  return seed;
}

function readStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureSeedUsers().then(() => setReady(true));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const users = readStoredUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.status === 'Active');
    if (!found) return false;
    const ok = await verifyPassword(password, found.passwordHash);
    if (!ok) return false;
    const session: User = {
      id: found.id, name: found.name, email: found.email, role: found.role,
      status: found.status, lastActive: new Date().toISOString(),
    };
    setUser(session);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // touch lastActive
    const updated = users.map(u => u.id === found.id ? { ...u, lastActive: session.lastActive } : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
