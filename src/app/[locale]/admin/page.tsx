'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/useAdminAuth';
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const { admin } = useAdminAuth();

  const quickLinks = [
    {
      icon: Package,
      title: t('dashboard.products'),
      description: t('dashboard.productsDesc'),
      href: '/admin/products',
      color: 'blue',
    },
    {
      icon: ShoppingCart,
      title: t('dashboard.orders'),
      description: t('dashboard.ordersDesc'),
      href: '/admin/orders',
      color: 'green',
      comingSoon: true,
    },
    {
      icon: Users,
      title: t('dashboard.members'),
      description: t('dashboard.membersDesc'),
      href: '/admin/members',
      color: 'purple',
      comingSoon: true,
    },
    {
      icon: DollarSign,
      title: t('dashboard.finance'),
      description: t('dashboard.financeDesc'),
      href: '/admin/finance',
      color: 'orange',
      comingSoon: true,
    },
  ];

  const stats = [
    {
      label: t('dashboard.totalProducts'),
      value: '-',
      icon: Package,
      trend: null,
    },
    {
      label: t('dashboard.totalOrders'),
      value: '-',
      icon: ShoppingCart,
      trend: null,
    },
    {
      label: t('dashboard.totalMembers'),
      value: '-',
      icon: Users,
      trend: null,
    },
    {
      label: t('dashboard.monthlyRevenue'),
      value: '-',
      icon: DollarSign,
      trend: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('dashboard.welcome', { name: admin?.nickname || 'Admin' })}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('dashboard.role')}: {admin?.role} | {t('dashboard.permissions')}: {admin?.permissions?.length || 0}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="text-right">
              <div className="text-sm text-gray-500">{t('dashboard.today')}</div>
              <div className="text-lg font-semibold text-gray-900">
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  {stat.trend && (
                    <div className="flex items-center mt-2 text-sm text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {stat.trend}
                    </div>
                  )}
                </div>
                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickAccess')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickLinks.map((link, index) => {
            const Icon = link.icon;
            const colorClasses = {
              blue: 'bg-blue-50 text-blue-600',
              green: 'bg-green-50 text-green-600',
              purple: 'bg-purple-50 text-purple-600',
              orange: 'bg-orange-50 text-orange-600',
            };

            return (
              <Link
                key={index}
                href={link.href}
                className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center mb-4 ${colorClasses[link.color as keyof typeof colorClasses]}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{link.title}</h3>
                <p className="text-sm text-gray-600">{link.description}</p>
                {link.comingSoon && (
                  <div className="flex items-center mt-3 text-xs text-orange-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {t('dashboard.comingSoon')}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* System info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">{t('dashboard.systemInfo')}</p>
            <p>{t('dashboard.systemInfoDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
