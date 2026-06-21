/**
 * useAdminAuth hook
 * Manages admin authentication state
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminTokenStore, adminUserStore, type AdminUser } from './adminStorage';

interface UseAdminAuthReturn {
  admin: AdminUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const token = adminTokenStore.get();
    const user = adminUserStore.get();

    if (token && user) {
      setAdmin(user);
    }
    setIsLoading(false);
  }, []);

  // Login handler
  const login = useCallback((token: string, user: AdminUser) => {
    adminTokenStore.set(token);
    adminUserStore.set(user);
    setAdmin(user);
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    adminTokenStore.clear();
    adminUserStore.clear();
    setAdmin(null);
  }, []);

  // Check if admin has specific permission
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!admin) return false;
      return admin.permissions.includes(permission);
    },
    [admin]
  );

  // Check if admin has specific role
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!admin) return false;
      return admin.roles.includes(role);
    },
    [admin]
  );

  return {
    admin,
    isLoggedIn: !!admin,
    isLoading,
    login,
    logout,
    hasPermission,
    hasRole,
  };
}
