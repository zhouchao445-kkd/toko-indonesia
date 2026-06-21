/**
 * localStorage storage utilities for member auth
 */

export const MEMBER_TOKEN_KEY = 'MEMBER_TOKEN';
export const MEMBER_USER_KEY = 'MEMBER_USER';

export interface MemberUser {
  id: string;
  phone: string;
  nickname: string | null;
  avatar: string | null;
  role: string;
}

export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(MEMBER_TOKEN_KEY);
  },
  set(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MEMBER_TOKEN_KEY, token);
  },
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(MEMBER_TOKEN_KEY);
  },
};

export const userStore = {
  get(): MemberUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(MEMBER_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MemberUser;
    } catch {
      return null;
    }
  },
  set(user: MemberUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MEMBER_USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(MEMBER_USER_KEY);
  },
};
