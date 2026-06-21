import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

// Supported locales
// Source of truth also in @ecommerce/shared (packages/shared)
export const LOCALES = ['id', 'zh', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'id';

export const LOCALE_NAMES: Record<Locale, string> = {
  id: 'Bahasa Indonesia',
  zh: '中文',
  en: 'English',
};

export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
});

// Lightweight wrappers around Next.js navigation APIs that consider the locale prefix.
// Use these instead of the bare next/navigation hooks so language switching works.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
