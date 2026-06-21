'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Package, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { apiFetch } from '@/lib/api-client';
import { formatIDR } from '@/lib/api';
import { StatusBadge } from '@/components/order/StatusBadge';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: string;
  created_at: string;
  items: Array<{
    id: string;
    quantity: number;
    products: {
      id: string;
      name: string;
      main_image: string | null;
    };
  }>;
}

const STATUS_TABS = [
  'all',
  'pending_payment',
  'pending_review',
  'approved',
  'shipped',
  'completed',
  'cancelled',
];

function OrdersContent() {
  const t = useTranslations('order');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const url = activeTab === 'all' ? '/api/orders' : `/api/orders?status=${activeTab}`;
    apiFetch<{ success: boolean; data: Order[] }>(url)
      .then((data) => {
        if (data.success) setOrders(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap min-h-[44px] transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-accent'
            }`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">{t('empty')}</h2>
          <p className="text-muted-foreground mb-6">{t('empty.subtitle')}</p>
          <Link href="/products">
            <Button className="min-h-[44px]">{t('empty.cta')}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <div className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm text-muted-foreground">{t('orderNumber')}</span>
                    <span className="font-mono font-medium ml-2">{order.order_number}</span>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="flex gap-3 mb-3">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="h-16 w-16 rounded-md bg-muted overflow-hidden shrink-0">
                      {item.products.main_image ? (
                        <img src={item.products.main_image} alt={item.products.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center text-sm text-muted-foreground">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-bold text-primary">{formatIDR(Number(order.total_amount))}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AuthGuard>
      <OrdersContent />
    </AuthGuard>
  );
}
