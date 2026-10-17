import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, pass?: string) => Promise<AppUser>;
  loginWithGoogle: (email?: string, name?: string, photo?: string) => Promise<AppUser>;
  logout: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const current = await authService.getCurrentUser();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleStorageChange = () => {
      refreshUser();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loginWithGoogle = async (email?: string, name?: string, photo?: string) => {
    setLoading(true);
    try {
      const loggedUser = await authService.loginWithGoogle(email, name, photo);
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass?: string) => {
    setLoading(true);
    try {
      const loggedUser = pass
        ? await authService.loginWithCredentials(email, pass)
        : await authService.loginWithGoogle(email);
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      try {
        sessionStorage.removeItem('admin_open_groups');
        sessionStorage.removeItem('admin_open_subnavs');
        sessionStorage.removeItem('admin_sidebar_scroll');
      } catch {}
      // Replace history entry to prevent back-button navigation into protected panels
      window.location.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    // SuperAdmin role bypasses all permissions
    if (user.roleId === 'role-superadmin') return true;
    return user.permissions?.includes(permissionCode) || false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, hasPermission, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
