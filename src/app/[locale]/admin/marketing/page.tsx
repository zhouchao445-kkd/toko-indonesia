'use client';

import { useTranslations } from 'next-intl';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import Link from 'next/link';
import { Tag, Image, Layout, Calendar, TrendingUp, Users } from 'lucide-react';

export default function AdminMarketingPage() {
  const t = useTranslations('admin');

  const quickLinks = [
    { href: '/admin/marketing/coupons', icon: Tag, label: t('marketing.coupons'), desc: t('marketing.couponsDesc'), color: 'bg-blue-50 text-blue-600' },
    { href: '/admin/marketing/banners', icon: Image, label: t('marketing.banners'), desc: t('marketing.bannersDesc'), color: 'bg-green-50 text-green-600' },
    { href: '/admin/marketing/popups', icon: Layout, label: t('marketing.popups'), desc: t('marketing.popupsDesc'), color: 'bg-purple-50 text-purple-600' },
    { href: '/admin/marketing/ad-schedules', icon: Calendar, label: t('marketing.adSchedules'), desc: t('marketing.adSchedulesDesc'), color: 'bg-orange-50 text-orange-600' },
  ];

  const stats = [
    { icon: TrendingUp, label: t('marketing.activeCoupons'), value: '—', color: 'text-blue-600' },
    { icon: Users, label: t('marketing.totalClaims'), value: '—', color: 'text-green-600' },
    { icon: Tag, label: t('marketing.usageRate'), value: '—', color: 'text-purple-600' },
  ];

  return (
    <AdminAuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('marketing.title')}</h1>
          <p className="text-gray-600 mt-1">{t('marketing.subtitle')}</p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all min-h-[44px]"
            >
              <div className={`p-3 rounded-lg ${link.color}`}>
                <link.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{link.label}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats Overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('marketing.overview')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
