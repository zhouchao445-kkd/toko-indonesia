'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  Users,
  Package,
  DollarSign,
  Tag,
  MessageCircle,
  Truck,
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { adminApi } from '@/lib/adminApi';

type TimeRange = 'today' | 'week' | 'month' | 'year';

interface StatModule {
  count: number;
  totalAmount?: number;
  breakdown?: Record<string, number>;
  conversionRate?: number;
  totalBalance?: number;
  lowStockCount?: number;
  totalStock?: number;
  todayIncome?: number;
  todayRefund?: number;
  pendingWithdrawals?: number;
  activeBanners?: number;
  activePopups?: number;
  openConversations?: number;
  pendingMessages?: number;
  todayNewConversations?: number;
  avgResponseTime?: number;
  pendingShipment?: number;
  shipped?: number;
  delivered?: number;
  abnormal?: number;
}

interface TrendData {
  count: number;
  totalAmount?: number;
  changePercent?: number;
}

interface StatisticsData {
  range: TimeRange;
  period: { start: string; end: string };
  orders: StatModule;
  members: StatModule;
  products: StatModule;
  finance: StatModule;
  marketing: StatModule;
  support: StatModule;
  shipping: StatModule;
  trends: {
    orders: TrendData;
    members: TrendData;
    products: TrendData;
  };
}

export default function StatisticsPage() {
  const t = useTranslations('admin.statistics');
  const common = useTranslations('common');
  const params = useParams();
  const locale = params.locale as string;

  const [range, setRange] = useState<TimeRange>('today');
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.get<StatisticsData>(`/statistics/dashboard?range=${range}`);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [range]);

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined) return '0';
    return new Intl.NumberFormat(locale === 'id' ? 'id-ID' : locale === 'zh' ? 'zh-CN' : 'en-US').format(num);
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined) return 'Rp 0';
    return new Intl.NumberFormat(locale === 'id' ? 'id-ID' : locale === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const TrendBadge = ({ value }: { value: number | undefined }) => {
    if (value === undefined || value === 0) return null;
    const isPositive = value > 0;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}
      >
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(value)}%
      </span>
    );
  };

  const StatCard = ({
    title,
    icon: Icon,
    children,
    trend,
  }: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    trend?: number;
  }) => (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );

  const StatRow = ({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-lg text-primary' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4 min-h-[44px]">
            {t('retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data.period.start} - {data.period.end}
          </p>
        </div>
      </div>

      {/* Time Range Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['today', 'week', 'month', 'year'] as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`min-h-[44px] border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              range === r
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t(`ranges.${r}`)}
          </button>
        ))}
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Orders */}
        <StatCard
          title={t('modules.orders')}
          icon={ShoppingCart}
          trend={data.trends.orders.changePercent}
        >
          <StatRow label={t('labels.totalOrders')} value={formatNumber(data.orders.count)} highlight />
          <StatRow label={t('labels.totalAmount')} value={formatCurrency(data.orders.totalAmount)} />
          <StatRow
            label={t('labels.pendingPayment')}
            value={formatNumber(data.orders.breakdown?.pending_payment)}
          />
          <StatRow
            label={t('labels.pendingShipment')}
            value={formatNumber(data.orders.breakdown?.pending_shipment)}
          />
          <StatRow
            label={t('labels.completed')}
            value={formatNumber(data.orders.breakdown?.completed)}
          />
          {data.orders.conversionRate !== undefined && (
            <StatRow
              label={t('labels.conversionRate')}
              value={`${data.orders.conversionRate}%`}
            />
          )}
        </StatCard>

        {/* Members */}
        <StatCard
          title={t('modules.members')}
          icon={Users}
          trend={data.trends.members.changePercent}
        >
          <StatRow label={t('labels.newRegistrations')} value={formatNumber(data.members.count)} highlight />
          <StatRow label={t('labels.activeMembers')} value={formatNumber(data.members.breakdown?.active)} />
          <StatRow label={t('labels.vipMembers')} value={formatNumber(data.members.breakdown?.vip)} />
          {data.members.totalBalance !== undefined && (
            <StatRow
              label={t('labels.totalBalance')}
              value={formatCurrency(data.members.totalBalance)}
            />
          )}
        </StatCard>

        {/* Products */}
        <StatCard
          title={t('modules.products')}
          icon={Package}
          trend={data.trends.products.changePercent}
        >
          <StatRow label={t('labels.activeProducts')} value={formatNumber(data.products.count)} highlight />
          {data.products.totalStock !== undefined && (
            <StatRow label={t('labels.totalStock')} value={formatNumber(data.products.totalStock)} />
          )}
          {data.products.lowStockCount !== undefined && (
            <StatRow
              label={t('labels.lowStock')}
              value={formatNumber(data.products.lowStockCount)}
            />
          )}
          <StatRow
            label={t('labels.inactiveProducts')}
            value={formatNumber(data.products.breakdown?.inactive)}
          />
        </StatCard>

        {/* Finance */}
        <StatCard title={t('modules.finance')} icon={DollarSign}>
          {data.finance.todayIncome !== undefined && (
            <StatRow label={t('labels.todayIncome')} value={formatCurrency(data.finance.todayIncome)} highlight />
          )}
          {data.finance.todayRefund !== undefined && (
            <StatRow label={t('labels.todayRefund')} value={formatCurrency(data.finance.todayRefund)} />
          )}
          <StatRow
            label={t('labels.pendingWithdrawals')}
            value={formatNumber(data.finance.pendingWithdrawals)}
          />
          <StatRow
            label={t('labels.todayWithdrawalCount')}
            value={formatNumber(data.finance.count)}
          />
        </StatCard>

        {/* Marketing */}
        <StatCard title={t('modules.marketing')} icon={Tag}>
          <StatRow label={t('labels.couponsIssued')} value={formatNumber(data.marketing.count)} />
          <StatRow
            label={t('labels.couponsUsed')}
            value={formatNumber(data.marketing.breakdown?.used)}
          />
          {data.marketing.activeBanners !== undefined && (
            <StatRow label={t('labels.activeBanners')} value={formatNumber(data.marketing.activeBanners)} />
          )}
          {data.marketing.activePopups !== undefined && (
            <StatRow label={t('labels.activePopups')} value={formatNumber(data.marketing.activePopups)} />
          )}
        </StatCard>

        {/* Support */}
        <StatCard title={t('modules.support')} icon={MessageCircle}>
          {data.support.openConversations !== undefined && (
            <StatRow
              label={t('labels.openConversations')}
              value={formatNumber(data.support.openConversations)}
              highlight
            />
          )}
          {data.support.pendingMessages !== undefined && (
            <StatRow
              label={t('labels.pendingMessages')}
              value={formatNumber(data.support.pendingMessages)}
            />
          )}
          {data.support.todayNewConversations !== undefined && (
            <StatRow
              label={t('labels.todayNewConversations')}
              value={formatNumber(data.support.todayNewConversations)}
            />
          )}
          {data.support.avgResponseTime !== undefined && (
            <StatRow
              label={t('labels.avgResponseTime')}
              value={`${data.support.avgResponseTime}min`}
            />
          )}
        </StatCard>

        {/* Shipping */}
        <StatCard title={t('modules.shipping')} icon={Truck}>
          {data.shipping.pendingShipment !== undefined && (
            <StatRow
              label={t('labels.pendingShipment')}
              value={formatNumber(data.shipping.pendingShipment)}
              highlight
            />
          )}
          {data.shipping.shipped !== undefined && (
            <StatRow label={t('labels.shipped')} value={formatNumber(data.shipping.shipped)} />
          )}
          {data.shipping.delivered !== undefined && (
            <StatRow label={t('labels.delivered')} value={formatNumber(data.shipping.delivered)} />
          )}
          {data.shipping.abnormal !== undefined && (
            <StatRow label={t('labels.abnormal')} value={formatNumber(data.shipping.abnormal)} />
          )}
        </StatCard>
      </div>
    </div>
  );
}
