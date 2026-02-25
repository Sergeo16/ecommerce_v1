'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Role = 'SUPER_ADMIN' | 'SUPPLIER' | 'AFFILIATE' | 'COURIER' | 'CLIENT';

interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Rafraîchit la session ; retourne le nouvel access token ou null si échec */
  refreshUser: () => Promise<string | null>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

async function parseResJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text?.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<string | null> => {
    const refresh = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
    if (!refresh) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return null;
    }
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return null;
      }
      const data = await parseResJson(res);
      const newToken = (data.accessToken as string) ?? null;
      setToken(newToken);
      setUser(data.user);
      if (typeof window !== 'undefined' && newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
        const refresh = data.refreshToken as string | undefined;
        if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
      }
      return newToken;
    } catch {
      setUser(null);
      setToken(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (t) {
      setToken(t);
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseResJson(res);
    if (!res.ok) {
      throw new Error((data.error as string) ?? (data.message as string) ?? 'Connexion échouée');
    }
    setToken(data.accessToken as string);
    setUser(data.user as User);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, data.accessToken as string);
      localStorage.setItem(REFRESH_KEY, (data.refreshToken as string) ?? '');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
