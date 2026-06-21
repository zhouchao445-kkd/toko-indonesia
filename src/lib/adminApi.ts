/**
 * Admin API client
 * Handles authenticated requests to backend API for admin panel
 */

import { adminTokenStore, adminUserStore } from './adminStorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export class AdminApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.data = data;
  }
}

interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Make authenticated API request
 */
export async function adminApiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...restOptions } = options;

  const headers: HeadersInit = {
    ...customHeaders,
  };

  // Add authorization header if not skipped
  if (!skipAuth) {
    const token = adminTokenStore.get();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  // Add JSON content type if body is present and no content-type set
  if (restOptions.body && !(headers as Record<string, string>)['Content-Type']) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...restOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 - unauthorized
    if (response.status === 401) {
      adminTokenStore.clear();
      adminUserStore.clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
      throw new AdminApiError('Unauthorized', 401);
    }

    // Handle 403 - forbidden
    if (response.status === 403) {
      throw new AdminApiError('Permission denied', 403);
    }

    // Parse response
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
      throw new AdminApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AdminApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AdminApiError('Request timeout', 408);
    }

    throw new AdminApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

/**
 * Upload file with FormData
 */
export async function adminApiUpload<T = unknown>(
  path: string,
  formData: FormData
): Promise<T> {
  const token = adminTokenStore.get();
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type, let browser set it with boundary
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 - unauthorized
    if (response.status === 401) {
      adminTokenStore.clear();
      adminUserStore.clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
      throw new AdminApiError('Unauthorized', 401);
    }

    // Handle 403 - forbidden
    if (response.status === 403) {
      throw new AdminApiError('Permission denied', 403);
    }

    // Parse response
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Upload failed with status ${response.status}`;
      throw new AdminApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AdminApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AdminApiError('Upload timeout', 408);
    }

    throw new AdminApiError(
      error instanceof Error ? error.message : 'Upload failed',
      0
    );
  }
}

/**
 * Admin API object with convenience methods
 */
export const adminApi = {
  get: <T = unknown>(path: string) => adminApiFetch<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    adminApiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown) =>
    adminApiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string) => adminApiFetch<T>(path, { method: 'DELETE' }),
  upload: adminApiUpload,
};

export default adminApi;
