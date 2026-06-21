'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShoppingCart, Plus, Minus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { apiFetch } from '@/lib/api-client';
import { formatIDR } from '@/lib/api';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    main_image: string | null;
    price: string;
  };
}

interface CartData {
  items: CartItem[];
  total: string;
  total_count: number;
}

function CartContent() {
  const t = useTranslations('cart');
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const loadCart = useCallback(async () => {
    try {
      const data = await apiFetch<{ success: boolean; data: CartData }>('/api/cart');
      if (data.success) setCart(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCart(); }, [loadCart]);

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleDelete(itemId);
      return;
    }
    if (newQty > 99) return;

    // Debounce API call
    if (debounceTimers.current[itemId]) {
      clearTimeout(debounceTimers.current[itemId]);
    }
    debounceTimers.current[itemId] = setTimeout(async () => {
      try {
        await apiFetch(`/api/cart/${itemId}`, {
          method: 'PUT',
          body: JSON.stringify({ quantity: newQty }),
        });
        await loadCart();
      } catch {
        // ignore
      }
    }, 300);
  };

  const handleDelete = async (itemId: string) => {
    try {
      await apiFetch(`/api/cart/${itemId}`, { method: 'DELETE' });
      await loadCart();
    } catch {
      // ignore
    }
  };

  const handleClear = async () => {
    if (!confirm(t('clear.confirm'))) return;
    try {
      await apiFetch('/api/cart', { method: 'DELETE' });
      await loadCart();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">{t('empty')}</h2>
        <p className="text-muted-foreground mb-6">{t('empty.subtitle')}</p>
        <Link href="/products">
          <Button className="min-h-[44px]">{t('empty.cta')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button variant="outline" size="sm" className="min-h-[44px] text-red-600" onClick={handleClear}>
          <X className="h-4 w-4 mr-1" />
          {t('clear')}
        </Button>
      </div>

      <div className="space-y-3 mb-6">
        {cart.items.map((item) => (
          <div key={item.id} className="flex gap-4 rounded-lg border bg-card p-4">
            <div className="h-20 w-20 rounded-md bg-muted overflow-hidden shrink-0">
              {item.products.main_image ? (
                <img src={item.products.main_image} alt={item.products.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  <ShoppingCart className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{item.products.name}</h3>
              <p className="text-primary font-bold mt-1">{formatIDR(Number(item.products.price))}</p>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 min-h-[44px] min-w-[44px]"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center font-medium">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 min-h-[44px] min-w-[44px]"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-8 w-8 min-h-[44px] min-w-[44px] text-red-600"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-muted-foreground">{t('total')}</span>
          <span className="text-2xl font-bold text-primary">{formatIDR(Number(cart.total))}</span>
        </div>
        <Button
          className="w-full min-h-[44px]"
          onClick={() => router.push('/checkout')}
        >
          {t('checkout')}
        </Button>
      </div>
    </div>
  );
}

import { useRef } from 'react';

export default function CartPage() {
  return (
    <AuthGuard>
      <CartContent />
    </AuthGuard>
  );
}
