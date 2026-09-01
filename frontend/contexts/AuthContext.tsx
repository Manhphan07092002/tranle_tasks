import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  updateUserSession: (updatedUser: User) => void;
  
  // RBAC Helper Properties
  isAdmin: boolean;
  isDirector: boolean;
  isManager: boolean;
  isEmployee: boolean;
  canApprove: boolean;
  hasPermission: (permission: string) => boolean;
  canManageDepartment: (departmentIdOrName?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOGIN_API_URL = '/api/auth/login';

// Helper to decode JWT without external library
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tranle_token') || localStorage.getItem('ctc_token');
    const storedUser = localStorage.getItem('tranle_user') || localStorage.getItem('ctc_user');
    
    if (token && storedUser) {
      const payload = parseJwt(token);
      if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('tranle_user');
          localStorage.removeItem('tranle_token');
          localStorage.removeItem('ctc_user');
          localStorage.removeItem('ctc_token');
        }
      } else {
        localStorage.removeItem('tranle_token');
        localStorage.removeItem('tranle_user');
        localStorage.removeItem('ctc_token');
        localStorage.removeItem('ctc_user');
      }
    } else {
      localStorage.removeItem('tranle_token');
      localStorage.removeItem('tranle_user');
      localStorage.removeItem('ctc_token');
      localStorage.removeItem('ctc_user');
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.' };
      }
      setUser(data.user);
      localStorage.setItem('tranle_token', data.token);
      localStorage.setItem('tranle_user', JSON.stringify(data.user));
      return { success: true };
    } catch (e) {
      console.error('Login failed:', e);
      return { success: false, error: 'Đã xảy ra lỗi kết nối. Vui lòng thử lại.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('tranle_token');
    localStorage.removeItem('tranle_user');
    localStorage.removeItem('ctc_token');
    localStorage.removeItem('ctc_user');
  };

  const updateUserSession = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('tranle_user', JSON.stringify(updatedUser));
  };

  // RBAC Helpers calculation
  const role = user?.role || '';
  const isAdmin = role === 'Admin';
  const isDirector = role === 'Director' || role === 'Giám Đốc';
  const isManager = role === 'Manager' || role === 'Trưởng Phòng' || role === 'Phó Phòng';
  const isEmployee = !isAdmin && !isDirector && !isManager;
  const canApprove = isAdmin || isDirector || isManager;

  const hasPermission = (permission: string): boolean => {
    if (isAdmin) return true;
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const canManageDepartment = (departmentIdOrName?: string): boolean => {
    if (isAdmin || isDirector) return true;
    if (!departmentIdOrName || !user) return false;
    if (isManager) {
      return (
        user.department === departmentIdOrName ||
        user.departmentId === departmentIdOrName
      );
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        updateUserSession,
        isAdmin,
        isDirector,
        isManager,
        isEmployee,
        canApprove,
        hasPermission,
        canManageDepartment,
      }}
    >
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
