'use client';

import { useTranslations } from 'next-intl';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import Link from 'next/link';
import { CreditCard, FileText, Landmark, Wallet } from 'lucide-react';

export default function AdminFinancePage() {
  const t = useTranslations('admin');

  const quickLinks = [
    { href: '/admin/finance/withdrawals', icon: CreditCard, label: t('finance.withdrawals'), desc: t('finance.withdrawalsDesc'), color: 'bg-orange-50 text-orange-600' },
    { href: '/admin/finance/financial-records', icon: FileText, label: t('finance.financialRecords'), desc: t('finance.financialRecordsDesc'), color: 'bg-blue-50 text-blue-600' },
    { href: '/admin/finance/bank-accounts', icon: Landmark, label: t('finance.bankAccounts'), desc: t('finance.bankAccountsDesc'), color: 'bg-green-50 text-green-600' },
    { href: '/admin/members', icon: Wallet, label: t('finance.balanceManagement'), desc: t('finance.balanceManagementDesc'), color: 'bg-purple-50 text-purple-600' },
  ];

  const stats = [
    { label: t('finance.todayIncome'), value: 'Rp 0', color: 'text-green-600' },
    { label: t('finance.monthIncome'), value: 'Rp 0', color: 'text-blue-600' },
    { label: t('finance.pendingWithdrawals'), value: '0', color: 'text-orange-600' },
  ];

  return (
    <AdminAuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('finance.title')}</h1>
          <p className="text-gray-600 mt-1">{t('finance.subtitle')}</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('finance.overview')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
