'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MapPin, Truck, Ticket, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { apiFetch } from '@/lib/api-client';
import { formatIDR } from '@/lib/api';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  products: { id: string; name: string; main_image: string | null; price: string };
}

interface Address {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  is_default: boolean;
}

interface ShippingMethod {
  id: string;
  name: string;
  price: string;
  estimated_days: string;
}

const SHIPPING_METHODS: ShippingMethod[] = [
  { id: 'jne_regular', name: 'JNE Regular', price: '15000', estimated_days: '2-3' },
  { id: 'jnt_express', name: 'J&T Express', price: '12000', estimated_days: '1-2' },
  { id: 'sicepat', name: 'SiCepat', price: '18000', estimated_days: '1-3' },
  { id: 'gosend', name: 'GoSend', price: '25000', estimated_days: '0-1' },
];

function CheckoutContent() {
  const t = useTranslations('checkout');
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedShipping, setSelectedShipping] = useState<string>(SHIPPING_METHODS[0].id);
  const [couponCode, setCouponCode] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<{ success: boolean; data: { items: CartItem[] } }>('/api/cart'),
      apiFetch<{ success: boolean; data: Address[] }>('/api/users/me/addresses'),
    ])
      .then(([cartRes, addrRes]) => {
        if (cartRes.success) setCartItems(cartRes.data.items);
        if (addrRes.success) {
          setAddresses(addrRes.data);
          const defaultAddr = addrRes.data.find((a) => a.is_default);
          if (defaultAddr) setSelectedAddress(defaultAddr.id);
          else if (addrRes.data.length > 0) setSelectedAddress(addrRes.data[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.products.price) * item.quantity, 0);
  const shipping = SHIPPING_METHODS.find((m) => m.id === selectedShipping);
  const shippingCost = Number(shipping?.price || 0);
  const total = subtotal + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddress) {
      setError(t('error.noAddress'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const data = await apiFetch<{ success: boolean; data: { id: string } }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cartItems.map((item) => ({ productId: item.product_id, quantity: item.quantity })),
          addressId: selectedAddress,
          shippingMethodId: selectedShipping,
          couponCode: couponCode || undefined,
          remark: remark || undefined,
        }),
      });

      if (data.success) {
        router.push(`/orders/${data.data.id}/payment`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.submit'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold mb-2">{t('empty')}</h2>
        <Link href="/products">
          <Button className="min-h-[44px] mt-4">{t('empty.cta')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Address + Shipping + Coupon + Remark */}
          <div className="md:col-span-2 space-y-6">
            {/* Address */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('step.address')}
                </h2>
                <Link href="/member/addresses" className="text-sm text-primary hover:underline min-h-[44px] flex items-center">
                  {t('step.manageAddresses')}
                </Link>
              </div>
              {addresses.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('step.noAddresses')}</p>
              ) : (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <label key={addr.id} className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer min-h-[44px] ${selectedAddress === addr.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}>
                      <input type="radio" name="address" value={addr.id} checked={selectedAddress === addr.id} onChange={() => setSelectedAddress(addr.id)} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{addr.name}</span>
                          <span className="text-sm text-muted-foreground">{addr.phone}</span>
                          {addr.is_default && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{t('step.default')}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">{addr.detail}, {addr.district}, {addr.city}, {addr.province}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Shipping */}
            <div className="rounded-lg border bg-card p-4">
              <h2 className="font-bold flex items-center gap-2 mb-3">
                <Truck className="h-5 w-5" />
                {t('step.shipping')}
              </h2>
              <div className="space-y-2">
                {SHIPPING_METHODS.map((method) => (
                  <label key={method.id} className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer min-h-[44px] ${selectedShipping === method.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}>
                    <input type="radio" name="shipping" value={method.id} checked={selectedShipping === method.id} onChange={() => setSelectedShipping(method.id)} />
                    <div className="flex-1 flex justify-between">
                      <span>{method.name}</span>
                      <div className="text-right">
                        <span className="font-medium">{formatIDR(Number(method.price))}</span>
                        <span className="text-xs text-muted-foreground ml-2">{method.estimated_days} {t('step.days')}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Coupon */}
            <div className="rounded-lg border bg-card p-4">
              <h2 className="font-bold flex items-center gap-2 mb-3">
                <Ticket className="h-5 w-5" />
                {t('step.coupon')}
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('step.couponPlaceholder')}
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 rounded-md border px-3 min-h-[44px]"
                />
                <Button type="button" variant="outline" className="min-h-[44px]">{t('step.apply')}</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{t('step.couponHint')}</p>
            </div>

            {/* Remark */}
            <div className="rounded-lg border bg-card p-4">
              <h2 className="font-bold flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5" />
                {t('step.remark')}
              </h2>
              <textarea
                placeholder={t('step.remarkPlaceholder')}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 min-h-[44px]"
              />
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="md:col-span-1">
            <div className="rounded-lg border bg-card p-4 sticky top-20">
              <h2 className="font-bold mb-4">{t('summary.title')}</h2>

              <div className="space-y-2 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="truncate flex-1">{item.products.name} x{item.quantity}</span>
                    <span className="ml-2 shrink-0">{formatIDR(Number(item.products.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('summary.subtotal')}</span>
                  <span>{formatIDR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('summary.shipping')}</span>
                  <span>{formatIDR(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t('summary.coupon')}</span>
                  <span>-{formatIDR(0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>{t('summary.total')}</span>
                  <span className="text-primary">{formatIDR(total)}</span>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 mt-4">{error}</div>
              )}

              <Button type="submit" className="w-full min-h-[44px] mt-4" disabled={submitting || !selectedAddress}>
                {submitting ? t('submitting') : t('submit')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <AuthGuard>
      <CheckoutContent />
    </AuthGuard>
  );
}
