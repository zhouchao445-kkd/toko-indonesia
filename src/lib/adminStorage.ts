/**
 * Admin storage utilities
 * Handles localStorage for admin authentication
 */

const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_USER_KEY = 'admin_user';

export interface AdminUser {
  id: string;
  username: string;
  nickname?: string;
  role: string;
  roles: string[];
  permissions: string[];
}

export const adminTokenStore = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  },
  set: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  },
  clear: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
};

export const adminUserStore = {
  get: (): AdminUser | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(ADMIN_USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as AdminUser;
    } catch {
      return null;
    }
  },
  set: (user: AdminUser): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  },
  clear: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ADMIN_USER_KEY);
  }
};

// Combined adminStorage export for compatibility
export const adminStorage = {
  getToken: adminTokenStore.get,
  setToken: adminTokenStore.set,
  clearToken: adminTokenStore.clear,
  getUser: adminUserStore.get,
  setUser: adminUserStore.set,
  clearUser: adminUserStore.clear,
  clear: () => {
    adminTokenStore.clear();
    adminUserStore.clear();
  }
};
