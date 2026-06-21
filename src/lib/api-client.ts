/**
 * Unified API client for member-facing endpoints
 * Wraps fetch with auth token, error handling, and timeout
 */

import { tokenStore, userStore } from './storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Core fetch wrapper with auth token, timeout, and error handling
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = tokenStore.get();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Add auth token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add Content-Type for JSON bodies (not for FormData)
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401: clear token and redirect to login
    if (response.status === 401) {
      tokenStore.clear();
      userStore.clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/id/login';
      }
      throw new ApiError('Unauthorized', 401, 'unauthorized');
    }

    // Handle 403
    if (response.status === 403) {
      throw new ApiError('Forbidden', 403, 'forbidden');
    }

    // Parse response
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error || data?.message || `Request failed (${response.status})`;
      throw new ApiError(message, response.status, data?.code);
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408, 'timeout');
    }

    throw new ApiError('Network error', 0, 'network_error');
  }
}

/**
 * File upload helper - uses FormData, lets browser set Content-Type with boundary
 */
export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData
): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type - browser will set it with the correct boundary
  });
}
