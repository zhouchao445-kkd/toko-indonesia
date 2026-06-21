'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MapPin, Truck, CreditCard, Package, Clock, CheckCircle, XCircle, AlertCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { apiFetch } from '@/lib/api-client';
import { formatIDR } from '@/lib/api';
import { StatusBadge } from '@/components/order/StatusBadge';

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  total_amount: string;
  subtotal: string;
  shipping_cost: string;
  discount_amount: string;
  remark: string | null;
  created_at: string;
  updated_at: string;
  address: {
    name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
  };
  shipping_method: {
    name: string;
    tracking_number: string | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: string;
    subtotal: string;
    products: {
      id: string;
      name: string;
      main_image: string | null;
    };
  }>;
  payment_proof: {
    id: string;
    file_path: string;
    amount: string;
    status: string;
    reject_reason: string | null;
  } | null;
  status_history: Array<{
    status: string;
    created_at: string;
  }>;
}

const STATUS_TIMELINE: Record<string, { icon: typeof Clock; color: string }> = {
  pending_payment: { icon: Clock, color: 'text-yellow-500' },
  pending_review: { icon: Clock, color: 'text-blue-500' },
  approved: { icon: CheckCircle, color: 'text-green-500' },
  shipped: { icon: Truck, color: 'text-purple-500' },
  completed: { icon: CheckCircle, color: 'text-green-600' },
  rejected: { icon: XCircle, color: 'text-red-500' },
  cancelled: { icon: XCircle, color: 'text-gray-500' },
};

function OrderDetailContent() {
  const t = useTranslations('order');
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    apiFetch<{ success: boolean; data: OrderDetail }>(`/api/orders/${orderId}`)
      .then((data) => {
        if (data.success) setOrder(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleCancel = async () => {
    if (!confirm(t('cancelConfirm'))) return;
    setCancelling(true);
    try {
      await apiFetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
      // Reload order
      const data = await apiFetch<{ success: boolean; data: OrderDetail }>(`/api/orders/${orderId}`);
      if (data.success) setOrder(data.data);
    } catch {
      // ignore
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">{t('notFound')}</p>
      </div>
    );
  }

  const showPayAction = order.status === 'pending_payment' || order.status === 'rejected';
  const showUploadAction = order.status === 'pending_payment' || order.status === 'rejected';
  const showTracking = order.status === 'shipped' && order.shipping_method.tracking_number;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('detail.title')}</h1>
          <p className="text-sm text-muted-foreground font-mono">{order.order_number}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Status Timeline */}
      <div className="rounded-lg border bg-card p-4 mb-6">
        <h2 className="font-bold mb-4">{t('detail.timeline')}</h2>
        <div className="space-y-3">
          {order.status_history.map((h, i) => {
            const info = STATUS_TIMELINE[h.status] || STATUS_TIMELINE.pending_payment;
            const Icon = info.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full bg-muted flex items-center justify-center ${info.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t(`status.${h.status}`)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Items */}
      <div className="rounded-lg border bg-card p-4 mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t('detail.items')}
        </h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="h-16 w-16 rounded-md bg-muted overflow-hidden shrink-0">
                {item.products.main_image ? (
                  <img src={item.products.main_image} alt={item.products.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.products.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatIDR(Number(item.price))} x {item.quantity}
                </p>
              </div>
              <p className="font-medium shrink-0">{formatIDR(Number(item.subtotal))}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Address */}
      <div className="rounded-lg border bg-card p-4 mb-6">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {t('detail.address')}
        </h2>
        <p className="text-sm">
          <span className="font-medium">{order.address.name}</span>
          <span className="text-muted-foreground ml-2">{order.address.phone}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {order.address.detail}, {order.address.district}, {order.address.city}, {order.address.province}
        </p>
      </div>

      {/* Shipping */}
      <div className="rounded-lg border bg-card p-4 mb-6">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Truck className="h-5 w-5" />
          {t('detail.shipping')}
        </h2>
        <p className="text-sm">{order.shipping_method.name}</p>
        {showTracking && (
          <p className="text-sm mt-1">
            <span className="text-muted-foreground">{t('detail.trackingNumber')}:</span>
            <span className="font-mono ml-1">{order.shipping_method.tracking_number}</span>
          </p>
        )}
      </div>

      {/* Payment Proof */}
      {order.payment_proof && (
        <div className="rounded-lg border bg-card p-4 mb-6">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('detail.proof')}
          </h2>
          <div className="flex gap-4">
            <img
              src={order.payment_proof.file_path}
              alt="Payment proof"
              className="h-24 w-24 rounded-md object-cover"
            />
            <div>
              <p className="text-sm">
                <span className="text-muted-foreground">{t('detail.proofAmount')}:</span>
                <span className="font-medium ml-1">{formatIDR(Number(order.payment_proof.amount))}</span>
              </p>
              <StatusBadge status={order.payment_proof.status} />
              {order.payment_proof.status === 'rejected' && order.payment_proof.reject_reason && (
                <div className="mt-2 flex gap-1 items-start">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{order.payment_proof.reject_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Amount Summary */}
      <div className="rounded-lg border bg-card p-4 mb-6">
        <h2 className="font-bold mb-3">{t('detail.amountSummary')}</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('detail.subtotal')}</span>
            <span>{formatIDR(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{t('detail.shippingCost')}</span>
            <span>{formatIDR(Number(order.shipping_cost))}</span>
          </div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>{t('detail.discount')}</span>
              <span>-{formatIDR(Number(order.discount_amount))}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>{t('detail.total')}</span>
            <span className="text-primary">{formatIDR(Number(order.total_amount))}</span>
          </div>
        </div>
      </div>

      {/* Remark */}
      {order.remark && (
        <div className="rounded-lg border bg-card p-4 mb-6">
          <h2 className="font-bold mb-2">{t('detail.remark')}</h2>
          <p className="text-sm text-muted-foreground">{order.remark}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {showPayAction && (
          <div className="flex gap-3">
            <Link href={`/orders/${orderId}/payment`} className="flex-1">
              <Button className="w-full min-h-[44px]">{t('actions.pay')}</Button>
            </Link>
            <Link href={`/orders/${orderId}/upload-proof`} className="flex-1">
              <Button variant="outline" className="w-full min-h-[44px]">
                <Upload className="h-4 w-4 mr-1" />
                {t('actions.upload')}
              </Button>
            </Link>
          </div>
        )}
        {showPayAction && (
          <Button variant="ghost" className="w-full min-h-[44px] text-red-600" onClick={handleCancel} disabled={cancelling}>
            {t('actions.cancel')}
          </Button>
        )}
        <Link href="/orders">
          <Button variant="outline" className="w-full min-h-[44px]">{t('actions.backToList')}</Button>
        </Link>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <AuthGuard>
      <OrderDetailContent />
    </AuthGuard>
  );
}
