import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '../types';
import { getAccessToken, setAccessToken, clearAccessToken, refreshAccessToken } from '../services/tokenStore';

const LOGIN_API_URL = '/api/auth/login';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;

  logout: () => void;
  isLoading: boolean;
  updateUserSession: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Boot: the access token lives only in memory, so every page load restores
    // the session silently via the httpOnly refresh cookie. Legacy localStorage
    // tokens (pre-rotation) are dropped and never sent again.
    try {
      localStorage.removeItem('tranle_token');
    } catch { /* ignore */ }
    let cancelled = false;
    (async () => {
      if (await refreshAccessToken()) {
        if (!cancelled) {
          try {
            const u = localStorage.getItem('tranle_user');
            if (u) setUser(JSON.parse(u));
          } catch { /* ignore */ }
        }
      } else if (!cancelled) {
        try {
          localStorage.removeItem('tranle_user');
        } catch { /* ignore */ }
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.' };
      }
      queryClient.clear();
      setUser(data.user);
      // Access token stays in memory only; the refresh token arrives as httpOnly cookie.
      setAccessToken(typeof data.token === 'string' ? data.token : null);
      localStorage.setItem('tranle_user', JSON.stringify(data.user));
      return { success: true };
    } catch (e) {
      console.error('Login failed:', e);
      return { success: false, error: 'Đã xảy ra lỗi kết nối. Vui lòng thử lại.' };
    }
  };

  const logout = () => {
    queryClient.clear();
    setUser(null);
    clearAccessToken();
    localStorage.removeItem('tranle_user');
    // Revoke the refresh session server-side (fire-and-forget; cookie clears regardless).
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  };



  const updateUserSession = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('tranle_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, updateUserSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
