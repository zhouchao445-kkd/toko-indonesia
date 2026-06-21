'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { getHotProducts } from '@/lib/api';
import type { ProductListItem } from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';

export function HotProducts() {
  const t = useTranslations('home');
  const [products, setProducts] = useState<ProductListItem[]>([]);

  useEffect(() => {
    getHotProducts(8)
      .then((res) => {
        if (res.success) setProducts(res.data);
      })
      .catch(console.error);
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">{t('hot_products')}</h2>
        <Link
          href="/products"
          className="text-sm text-red-600 hover:text-red-700 font-medium min-h-[44px] flex items-center"
        >
          {t('view_all_products')} →
        </Link>
      </div>

      {/* Grid on mobile/tablet, horizontal scroll on larger screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
