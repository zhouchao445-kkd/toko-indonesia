'use client';

import { useTranslations } from 'next-intl';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { adminApi } from '@/lib/adminApi';
import { useState, useEffect, useCallback } from 'react';
import { Check, X, Eye } from 'lucide-react';

interface Withdrawal {
  id: string;
  member_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  status: string;
  reason: string | null;
  created_at: string;
  member?: { id: string; full_name: string; email: string; phone: string | null };
}

export default function AdminWithdrawalsPage() {
  const t = useTranslations('admin');
  const { hasPermission } = useAdminAuth();

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [showDetail, setShowDetail] = useState<Withdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<Withdrawal | null>(null);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const data = await adminApi.get<{ withdrawals: Withdrawal[]; pagination: { totalPages: number } }>(
        `/withdrawals?${params.toString()}`
      );
      setWithdrawals(data.withdrawals || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch withdrawals:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleApprove = async (id: string) => {
    if (!confirm(t('finance.confirmApprove'))) return;
    try {
      await adminApi.post(`/withdrawals/${id}/approve`, {});
      fetchWithdrawals();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal) return;
    if (!rejectReason.trim()) return;
    try {
      await adminApi.post(`/withdrawals/${showRejectModal.id}/reject`, { reason: rejectReason });
      setShowRejectModal(null);
      setRejectReason('');
      fetchWithdrawals();
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const canEdit = hasPermission('withdrawals.can_edit');

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <AdminAuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('finance.withdrawals')}</h1>
          <p className="text-gray-600 mt-1">{t('finance.withdrawalsDesc')}</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg min-h-[44px]"
          >
            <option value="">{t('common.allStatus')}</option>
            <option value="pending">{t('common.pending')}</option>
            <option value="approved">{t('common.approved')}</option>
            <option value="rejected">{t('common.rejected')}</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.member')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.amount')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('finance.bankInfo')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.createdAt')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.status')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t('common.loading')}</td></tr>
                ) : withdrawals.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t('common.noData')}</td></tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{w.member?.full_name || '—'}</div>
                        <div className="text-xs text-gray-500">{w.member?.email}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-orange-600">
                        Rp {Number(w.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{w.bank_name}</div>
                        <div className="text-gray-500">{w.account_number}</div>
                        <div className="text-gray-500">{w.account_holder}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(w.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${statusBadge(w.status)}`}>
                          {w.status === 'pending' ? t('common.pending') : w.status === 'approved' ? t('common.approved') : t('common.rejected')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setShowDetail(w)} className="p-2 hover:bg-gray-100 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          {canEdit && w.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(w.id)} className="p-2 hover:bg-green-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                                <Check className="w-4 h-4 text-green-600" />
                              </button>
                              <button onClick={() => setShowRejectModal(w)} className="p-2 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
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

        {/* Detail Modal */}
        {showDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(null)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold mb-4">{t('finance.withdrawalDetail')}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">{t('finance.member')}</span><span>{showDetail.member?.full_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{t('finance.email')}</span><span>{showDetail.member?.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{t('finance.phone')}</span><span>{showDetail.member?.phone || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{t('finance.amount')}</span><span className="font-bold text-orange-600">Rp {Number(showDetail.amount).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{t('finance.bank')}</span><span>{showDetail.bank_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{t('finance.accountNumber')}</span><span>{showDetail.account_number}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{t('finance.accountHolder')}</span><span>{showDetail.account_holder}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{t('common.status')}</span><span>{showDetail.status}</span></div>
                {showDetail.reason && <div className="pt-2 border-t"><span className="text-gray-500">{t('finance.rejectReason')}:</span><p className="mt-1">{showDetail.reason}</p></div>}
              </div>
              <button onClick={() => setShowDetail(null)} className="w-full mt-6 px-4 py-2 border rounded-lg hover:bg-gray-50 min-h-[44px]">{t('common.close')}</button>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">{t('finance.rejectWithdrawal')}</h2>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg min-h-[100px]"
                placeholder={t('finance.rejectReasonPlaceholder')}
              />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setShowRejectModal(null); setRejectReason(''); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50 min-h-[44px]">{t('common.cancel')}</button>
                <button onClick={handleReject} disabled={!rejectReason.trim()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 min-h-[44px]">{t('common.confirm')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminAuthGuard>
  );
}
