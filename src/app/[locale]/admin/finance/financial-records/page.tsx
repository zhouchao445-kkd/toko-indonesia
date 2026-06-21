'use client';

import { useTranslations } from 'next-intl';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { adminApi } from '@/lib/adminApi';
import { useState, useEffect, useCallback } from 'react';
import { Download, Filter } from 'lucide-react';

interface FinancialRecord {
  id: string;
  type: string;
  member_id: string | null;
  order_id: string | null;
  amount: number;
  balance_after: number | null;
  description: string | null;
  created_at: string;
  member?: { id: string; full_name: string; email: string };
}

export default function AdminFinancialRecordsPage() {
  const t = useTranslations('admin');
  const { hasPermission } = useAdminAuth();

  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '50' });
      if (typeFilter) params.set('type', typeFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const data = await adminApi.get<{ records: FinancialRecord[]; pagination: { totalPages: number } }>(
        `/financial-records?${params.toString()}`
      );
      setRecords(data.records || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleExport = () => {
    // Generate CSV
    const headers = ['Date', 'Type', 'Member', 'Amount', 'Balance After', 'Description'];
    const rows = records.map(r => [
      new Date(r.created_at).toLocaleString(),
      r.type,
      r.member?.full_name || '—',
      r.amount,
      r.balance_after || '',
      r.description || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      income: t('finance.typeIncome'),
      refund: t('finance.typeRefund'),
      withdrawal: t('finance.typeWithdrawal'),
      adjustment: t('finance.typeAdjustment'),
    };
    return labels[type] || type;
  };

  const typeColor = (type: string) => {
    const colors: Record<string, string> = {
      income: 'bg-green-100 text-green-700',
      refund: 'bg-red-100 text-red-700',
      withdrawal: 'bg-orange-100 text-orange-700',
      adjustment: 'bg-blue-100 text-blue-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const canView = hasPermission('financial_records.can_view');

  return (
    <AdminAuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('finance.financialRecords')}</h1>
            <p className="text-gray-600 mt-1">{t('finance.financialRecordsDesc')}</p>
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 min-h-[44px]">
            <Download className="w-4 h-4" />
            {t('finance.exportCSV')}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-lg min-h-[44px]">
              <option value="">{t('common.allTypes')}</option>
              <option value="income">{t('finance.typeIncome')}</option>
              <option value="refund">{t('finance.typeRefund')}</option>
              <option value="withdrawal">{t('finance.typeWithdrawal')}</option>
              <option value="adjustment">{t('finance.typeAdjustment')}</option>
            </select>
          </div>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-lg min-h-[44px]" placeholder={t('finance.dateFrom')} />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-lg min-h-[44px]" placeholder={t('finance.dateTo')} />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.createdAt')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.member')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.type')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.amount')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.balanceAfter')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.description')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t('common.loading')}</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t('common.noData')}</td></tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">{r.member?.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${typeColor(r.type)}`}>{typeLabel(r.type)}</span>
                      </td>
                      <td className={`px-4 py-3 font-medium ${r.type === 'income' || r.type === 'adjustment' ? 'text-green-600' : 'text-red-600'}`}>
                        {r.type === 'income' || r.type === 'adjustment' ? '+' : '-'}Rp {Math.abs(Number(r.amount)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.balance_after !== null ? `Rp ${Number(r.balance_after).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{r.description || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 min-h-[44px]">{t('common.prev')}</button>
              <span className="text-sm text-gray-600">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 min-h-[44px]">{t('common.next')}</button>
            </div>
          )}
        </div>
      </div>
    </AdminAuthGuard>
  );
}
