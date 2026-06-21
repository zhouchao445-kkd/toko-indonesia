'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/routing';
import { useCallback } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = useCallback(
    (newLocale: Locale) => {
      const segments = pathname.split('/');
      const currentLocale = segments[1];

      if (LOCALES.includes(currentLocale as Locale)) {
        segments[1] = newLocale;
      } else {
        segments.splice(1, 0, newLocale);
      }

      const newPath = segments.join('/') || '/';
      router.push(newPath);
    },
    [router, pathname]
  );

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`
            min-h-[44px] min-w-[44px] px-3 py-2 rounded-md text-sm font-medium transition-all
            flex items-center justify-center
            ${
              locale === l
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }
          `}
          aria-label={`Switch to ${LOCALE_NAMES[l]}`}
          title={LOCALE_NAMES[l]}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
