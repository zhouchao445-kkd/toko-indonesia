'use client';

import { useState, useEffect, useCallback } from 'react';
import { tokenStore, userStore, type MemberUser } from './storage';

interface UseAuthReturn {
  user: MemberUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (token: string, user: MemberUser) => void;
  logout: () => void;
  refreshUser: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<MemberUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Read from localStorage on mount
    const storedUser = userStore.get();
    const token = tokenStore.get();
    if (storedUser && token) {
      setUser(storedUser);
    }
    setIsLoading(false);

    // Listen for storage events (cross-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'MEMBER_TOKEN' || e.key === 'MEMBER_USER') {
        const updatedUser = userStore.get();
        setUser(updatedUser);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = useCallback((token: string, newUser: MemberUser) => {
    tokenStore.set(token);
    userStore.set(newUser);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    userStore.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => {
    const storedUser = userStore.get();
    setUser(storedUser);
  }, []);

  return {
    user,
    isLoggedIn: !!user && !!tokenStore.get(),
    isLoading,
    login,
    logout,
    refreshUser,
  };
}
