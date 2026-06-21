'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { getCategories } from '@/lib/api';
import type { Category } from '@/lib/api';

// Fallback emojis for categories without icons
const CATEGORY_EMOJIS = ['📱', '👕', '🏠', '🎮', '💄', '🍔', '📚', '⚽', '🎵', '🔧', '🎁', '🐾'];

export function CategoryGrid() {
  const t = useTranslations('home');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories()
      .then((res) => {
        if (res.success) setCategories(res.data);
      })
      .catch(console.error);
  }, []);

  if (categories.length === 0) return null;

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold mb-4">{t('categories')}</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
        {categories.map((category, index) => (
          <Link
            key={category.id}
            href={`/products?category=${category.id}`}
            className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg hover:bg-gray-50 hover:shadow-md transition-all min-h-[44px] border border-gray-100"
          >
            {category.icon_url ? (
              <img
                src={category.icon_url}
                alt={category.name}
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                loading="lazy"
              />
            ) : (
              <span className="text-2xl sm:text-3xl" role="img" aria-label={category.name}>
                {CATEGORY_EMOJIS[index % CATEGORY_EMOJIS.length]}
              </span>
            )}
            <span className="text-xs sm:text-sm text-center text-gray-700 font-medium line-clamp-2">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
