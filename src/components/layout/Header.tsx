'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, ShoppingCart, User, Menu, X, LogOut, Package, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from './LanguageSwitcher';
import { getSettings, type Settings } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';

export function Header() {
  const t = useTranslations('header');
  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSettings()
      .then((res) => {
        if (res.success) setSettings(res.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    router.push('/id');
  };

  const siteName = settings?.site_name || t('logo_text');
  const logoUrl = settings?.site_logo || '';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 min-h-[44px] shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-10 w-10 object-contain" />
            ) : null}
            <span className="text-xl font-bold">{siteName}</span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 min-h-[44px]"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="relative min-h-[44px] min-w-[44px]"
              onClick={() => router.push(isLoggedIn ? '/cart' : '/login')}
              aria-label={t('cart')}
            >
              <ShoppingCart className={`h-5 w-5 ${!isLoggedIn ? 'opacity-50' : ''}`} />
              {!isLoggedIn && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {t('cart_tooltip')}
                </div>
              )}
            </Button>

            {/* User area */}
            {isLoggedIn ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 min-h-[44px] px-3 rounded-md hover:bg-accent transition-colors"
                >
                  <UserCircle className="h-5 w-5" />
                  <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">
                    {user?.nickname || user?.phone}
                  </span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover shadow-lg">
                    <Link
                      href="/member"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-accent min-h-[44px]"
                    >
                      <UserCircle className="h-4 w-4" />
                      {t('my_profile')}
                    </Link>
                    <Link
                      href="/orders"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-accent min-h-[44px]"
                    >
                      <Package className="h-4 w-4" />
                      {t('my_orders')}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-accent min-h-[44px]"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="ghost"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => router.push('/login')}
              >
                <User className="h-5 w-5 sm:hidden" />
                <span className="hidden sm:inline">{t('login')}</span>
              </Button>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden min-h-[44px] min-w-[44px]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={t('menu')}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile search */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 min-h-[44px]"
                />
              </div>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
