'use client';

import { useTranslations } from 'next-intl';
import { OrderStatus, STATUS_COLORS, STATUS_I18N_KEYS } from '@/lib/orderStatus';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const t = useTranslations('order');
  const orderStatus = status as OrderStatus;
  const colorClass = STATUS_COLORS[orderStatus] || 'bg-gray-100 text-gray-800';
  const i18nKey = STATUS_I18N_KEYS[orderStatus] || status;

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${colorClass} ${className}`}>
      {t(`status.${i18nKey}` as 'status.pending_payment')}
    </span>
  );
}
