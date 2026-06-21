import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ── Types ──────────────────────────────────────────────────────────

export interface Settings {
  [key: string]: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url: string;
  sort_order: number;
}

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
}

export interface Popup {
  id: string;
  title: string;
  image_url: string;
  content: string | null;
  link_url: string | null;
  display_frequency: number | null;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  main_image: string;
  price: string;         // formatted "Rp 1.500.000"
  price_raw: number;     // raw number
  sales_count: number;
  view_count: number;
  click_count: number;
  category_id: string | null;
  category_name: string | null;
}

export interface ProductImage {
  id: string;
  image_url: string;
  sort_order: number;
}

export interface ProductParam {
  id: string;
  name: string;
  value: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;         // formatted "Rp 1.500.000"
  price_raw: number;
  main_image: string;
  video_url: string | null;
  stock: number;
  view_count: number;
  click_count: number;
  sales_count: number;
  status: string;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  images: ProductImage[];
  params: ProductParam[];
}

export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ProductListData {
  items: ProductListItem[];
  pagination: PaginationInfo;
}

// ── API Methods ────────────────────────────────────────────────────

// Settings
export async function getSettings(): Promise<{ success: boolean; data: Settings }> {
  const response = await api.get('/api/settings');
  return response.data;
}

// Categories
export async function getCategories(): Promise<{ success: boolean; data: Category[] }> {
  const response = await api.get('/api/categories');
  return response.data;
}

// Banners
export async function getBanners(): Promise<{ success: boolean; data: Banner[] }> {
  const response = await api.get('/api/banners?active=1');
  return response.data;
}

// Popups
export async function getPopups(): Promise<{ success: boolean; data: Popup[] }> {
  const response = await api.get('/api/popups?active=1');
  return response.data;
}

// Products - List
export async function getProducts(params?: {
  category?: string;
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ success: boolean; data: ProductListData }> {
  const response = await api.get('/api/products', { params });
  return response.data;
}

// Products - Hot
export async function getHotProducts(limit: number = 8): Promise<{ success: boolean; data: ProductListItem[] }> {
  const response = await api.get('/api/products/hot', { params: { limit } });
  return response.data;
}

// Products - Detail
export async function getProduct(id: string): Promise<{ success: boolean; data: ProductDetail }> {
  const response = await api.get(`/api/products/${id}`);
  return response.data;
}

// Products - Increment view count
export async function incrementProductView(id: string): Promise<{ success: boolean; data: { view_count: number } }> {
  const response = await api.post(`/api/products/${id}/view`);
  return response.data;
}

// ── Utility ────────────────────────────────────────────────────────

/**
 * Format a number as Indonesian Rupiah (IDR) string.
 * Used as a fallback when the backend doesn't return formatted price.
 */
export function formatIDR(amount: number): string {
  const formatted = amount.toLocaleString('id-ID');
  return `Rp ${formatted}`;
}

export default api;
