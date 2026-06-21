/**
 * Frontend order status utilities
 * Mirrors backend OrderStatus enum with i18n support
 */

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export const ALL_ORDER_STATUSES = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PENDING_REVIEW,
  OrderStatus.APPROVED,
  OrderStatus.SHIPPED,
  OrderStatus.COMPLETED,
  OrderStatus.REJECTED,
  OrderStatus.CANCELLED,
] as const;

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PENDING_REVIEW, OrderStatus.CANCELLED],
  [OrderStatus.PENDING_REVIEW]: [OrderStatus.APPROVED, OrderStatus.REJECTED],
  [OrderStatus.APPROVED]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.REJECTED]: [OrderStatus.PENDING_REVIEW, OrderStatus.CANCELLED],
  [OrderStatus.CANCELLED]: [],
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Status color mapping for UI badges
 */
export const STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_PAYMENT]: 'bg-gray-100 text-gray-800',
  [OrderStatus.PENDING_REVIEW]: 'bg-yellow-100 text-yellow-800',
  [OrderStatus.APPROVED]: 'bg-blue-100 text-blue-800',
  [OrderStatus.SHIPPED]: 'bg-purple-100 text-purple-800',
  [OrderStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [OrderStatus.REJECTED]: 'bg-red-100 text-red-800',
  [OrderStatus.CANCELLED]: 'bg-gray-100 text-gray-500',
};

/**
 * i18n key mapping for status labels
 */
export const STATUS_I18N_KEYS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_PAYMENT]: 'pending_payment',
  [OrderStatus.PENDING_REVIEW]: 'pending_review',
  [OrderStatus.APPROVED]: 'approved',
  [OrderStatus.SHIPPED]: 'shipped',
  [OrderStatus.COMPLETED]: 'completed',
  [OrderStatus.REJECTED]: 'rejected',
  [OrderStatus.CANCELLED]: 'cancelled',
};
