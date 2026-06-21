/**
 * @ecommerce/shared
 * Shared types and utilities for the monorepo
 */

// ============================================
// Common Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
  uptime: number;
}

// ============================================
// Supported Languages
// ============================================

export type Locale = 'id' | 'zh' | 'en';

export const LOCALES: Locale[] = ['id', 'zh', 'en'];
export const DEFAULT_LOCALE: Locale = 'id';

export const LOCALE_NAMES: Record<Locale, string> = {
  id: 'Bahasa Indonesia',
  zh: '中文',
  en: 'English',
};

// ============================================
// Responsive Breakpoints
// ============================================

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 640,
  pc: 1024,
} as const;

// ============================================
// Environment Config
// ============================================

export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  backendUrl: string;
  realtimeUrl: string;
}
