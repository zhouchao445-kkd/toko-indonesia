import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes are wrapped under [locale] (e.g. /id/admin/...), so the
  // intl middleware is responsible for redirecting bare /admin/* to the
  // locale-prefixed URL. After that we let the request through; the
  // client-side AdminAuthGuard enforces the login check with proper locale.
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      // Still want the intl middleware to add the locale prefix if missing.
      return intlMiddleware(request);
    }
    return intlMiddleware(request);
  }

  return intlMiddleware(request);
}

export const config = {
  // Run on everything except Next.js internals + static assets so next-intl
  // can negotiate the locale prefix on every request.
  matcher: ['/', '/(id|zh|en)/:path*', '/admin/:path*', '/((?!_next|.*\\..*).*)'],
};
