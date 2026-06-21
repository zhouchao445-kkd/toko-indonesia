'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Copy, CreditCard, Clock, CheckCircle, AlertCircle } from 'lucide-react';
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
  shipping_cost: string;
  created_at: string;
  bank_accounts: Array<{
    bank_name: string;
    account_number: string;
    account_holder: string;
  }>;
}

function PaymentContent() {
  const t = useTranslations('payment');
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ success: boolean; data: OrderDetail }>(`/api/orders/${orderId}`)
      .then((data) => {
        if (data.success) setOrder(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCancel = async () => {
    if (!confirm(t('cancelConfirm'))) return;
    setCancelling(true);
    try {
      await apiFetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
      router.push('/orders');
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <div className="text-center mb-8">
        <Clock className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-muted-foreground">{t('orderNumber')}</span>
          <span className="font-mono font-bold">{order.order_number}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Amount */}
      <div className="rounded-lg border bg-card p-6 text-center mb-6">
        <p className="text-sm text-muted-foreground mb-1">{t('amount')}</p>
        <p className="text-3xl font-bold text-primary">{formatIDR(Number(order.total_amount))}</p>
      </div>

      {/* Bank Info */}
      <div className="rounded-lg border bg-card p-4 mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {t('bankInfo')}
        </h2>
        <div className="space-y-3">
          {order.bank_accounts.map((bank, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-md bg-accent/50">
              <div>
                <p className="font-medium">{bank.bank_name}</p>
                <p className="font-mono text-lg">{bank.account_number}</p>
                <p className="text-sm text-muted-foreground">{bank.account_holder}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => handleCopy(bank.account_number)}
              >
                <Copy className="h-4 w-4 mr-1" />
                {copied === bank.account_number ? t('copied') : t('bankCopy')}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 mb-6">
        <div className="flex gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">{t('note.title')}</p>
            <p>{t('note.content')}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Link href={`/orders/${orderId}/upload-proof`}>
          <Button className="w-full min-h-[44px]">
            {t('uploaded')}
          </Button>
        </Link>
        <Link href={`/orders/${orderId}`}>
          <Button variant="outline" className="w-full min-h-[44px]">
            {t('later')}
          </Button>
        </Link>
        <Button variant="ghost" className="w-full min-h-[44px] text-red-600" onClick={handleCancel} disabled={cancelling}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <AuthGuard>
      <PaymentContent />
    </AuthGuard>
  );
}
