import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Get full image URL from a relative path.
 * If the path already starts with http(s)://, return it as-is.
 * Otherwise, prepend IMAGE_BASE_URL from .env (defaults to empty string).
 */
export function getFullImageUrl(relativePath: string): string {
  if (!relativePath) return '';

  // Already an absolute URL
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  const baseUrl = process.env.IMAGE_BASE_URL || '';
  
  // If no base URL configured, return relative path as-is
  if (!baseUrl) {
    return relativePath;
  }

  // Ensure no double slashes
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  
  return `${cleanBase}${cleanPath}`;
}
