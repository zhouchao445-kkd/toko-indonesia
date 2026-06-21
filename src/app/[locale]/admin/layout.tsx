'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAdminAuth } from '@/lib/useAdminAuth';
import {
  LayoutDashboard,
  Package,
  Tag,
  Truck,
  Settings,
  ShoppingCart,
  Star,
  Users,
  Megaphone,
  DollarSign,
  Headphones,
  BarChart3,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const t = useTranslations('admin');
  const pathname = usePathname();
  const { admin, isLoggedIn, logout, hasPermission } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Menu items with permissions
  const menuItems = [
    {
      icon: LayoutDashboard,
      label: t('menu.dashboard'),
      href: '/admin',
      permission: null, // Always visible
    },
    {
      icon: Package,
      label: t('menu.products'),
      href: '/admin/products',
      permission: 'product:view',
    },
    {
      icon: Tag,
      label: t('menu.categories'),
      href: '/admin/categories',
      permission: 'product:view',
    },
    {
      icon: Truck,
      label: t('menu.shipping'),
      href: '/admin/shipping-methods',
      permission: 'shipping:view',
    },
    {
      icon: Settings,
      label: t('menu.settings'),
      href: '/admin/settings',
      permission: 'setting:view',
    },
    {
      icon: ShoppingCart,
      label: t('menu.orders'),
      href: '/admin/orders',
      permission: 'order:view',
    },
    {
      icon: Star,
      label: t('menu.reviews'),
      href: '/admin/reviews',
      permission: 'review:view',
    },
    {
      icon: Users,
      label: t('menu.members'),
      href: '/admin/members',
      permission: 'user:view',
    },
    {
      icon: Megaphone,
      label: t('menu.marketing'),
      href: '/admin/marketing',
      permission: 'banner:view',
    },
    {
      icon: BarChart3,
      label: t('menu.statistics'),
      href: '/admin/statistics',
      permission: 'statistics:view',
    },
    {
      icon: DollarSign,
      label: t('menu.finance'),
      href: '/admin/finance',
      permission: 'order:view',
    },
    {
      icon: Headphones,
      label: t('menu.support'),
      href: '/admin/support',
      permission: 'ticket:view',
    },
  ];

  // Filter menu items by permission
  const visibleMenuItems = menuItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  // Get current page title from pathname
  const getCurrentPageTitle = () => {
    const currentItem = visibleMenuItems.find((item) =>
      pathname === item.href || pathname.startsWith(item.href + '/')
    );
    return currentItem?.label || t('menu.dashboard');
  };

  if (!isLoggedIn) {
    // Redirect to login if not authenticated
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center space-x-2">
            <Settings className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">{t('layout.title')}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Breadcrumb */}
              <nav className="flex items-center space-x-2 text-sm">
                <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                  {t('menu.dashboard')}
                </Link>
                {pathname !== '/admin' && (
                  <>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 font-medium">{getCurrentPageTitle()}</span>
                  </>
                )}
              </nav>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{admin?.nickname}</div>
                <div className="text-xs text-gray-500">{admin?.role}</div>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t('layout.logout')}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
