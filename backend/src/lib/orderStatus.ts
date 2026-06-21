/**
 * Order status management utilities
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

export interface OrderStatusInfo {
  status: OrderStatus;
  label: {
    id: string;
    zh: string;
    en: string;
  };
}

export const ORDER_STATUS_MAP: Record<OrderStatus, OrderStatusInfo> = {
  [OrderStatus.PENDING_PAYMENT]: {
    status: OrderStatus.PENDING_PAYMENT,
    label: {
      id: 'Menunggu Pembayaran',
      zh: '待付款',
      en: 'Pending Payment',
    },
  },
  [OrderStatus.PENDING_REVIEW]: {
    status: OrderStatus.PENDING_REVIEW,
    label: {
      id: 'Menunggu Tinjauan Bukti',
      zh: '待审核凭证',
      en: 'Pending Proof Review',
    },
  },
  [OrderStatus.APPROVED]: {
    status: OrderStatus.APPROVED,
    label: {
      id: 'Disetujui - Menunggu Pengiriman',
      zh: '已审核待发货',
      en: 'Approved - Awaiting Shipment',
    },
  },
  [OrderStatus.SHIPPED]: {
    status: OrderStatus.SHIPPED,
    label: {
      id: 'Sudah Dikirim',
      zh: '已发货',
      en: 'Shipped',
    },
  },
  [OrderStatus.COMPLETED]: {
    status: OrderStatus.COMPLETED,
    label: {
      id: 'Selesai',
      zh: '已完成',
      en: 'Completed',
    },
  },
  [OrderStatus.REJECTED]: {
    status: OrderStatus.REJECTED,
    label: {
      id: 'Bukti Ditolak',
      zh: '凭证驳回',
      en: 'Proof Rejected',
    },
  },
  [OrderStatus.CANCELLED]: {
    status: OrderStatus.CANCELLED,
    label: {
      id: 'Dibatalkan',
      zh: '已取消',
      en: 'Cancelled',
    },
  },
};

/**
 * Valid state transitions
 * Key: current status
 * Value: array of valid next statuses
 */
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PENDING_REVIEW, // Upload payment proof
    OrderStatus.CANCELLED,      // User cancels
  ],
  [OrderStatus.PENDING_REVIEW]: [
    OrderStatus.APPROVED,  // Admin approves
    OrderStatus.REJECTED,  // Admin rejects proof
  ],
  [OrderStatus.APPROVED]: [
    OrderStatus.SHIPPED,   // Admin ships
  ],
  [OrderStatus.SHIPPED]: [
    OrderStatus.COMPLETED, // User confirms receipt
  ],
  [OrderStatus.COMPLETED]: [], // Terminal state
  [OrderStatus.REJECTED]: [
    OrderStatus.PENDING_REVIEW, // User re-uploads proof
    OrderStatus.CANCELLED,      // User cancels
  ],
  [OrderStatus.CANCELLED]: [], // Terminal state
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  const validNext = VALID_TRANSITIONS[from];
  return validNext.includes(to);
}

/**
 * Get status display label
 */
export function getStatusLabel(status: OrderStatus, locale: 'id' | 'zh' | 'en' = 'id'): string {
  return ORDER_STATUS_MAP[status]?.label[locale] || status;
}
