'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { adminApi } from '@/lib/adminApi';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle,
  XCircle,
  Wallet,
  Plus,
  Minus,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Search,
  FileText,
} from 'lucide-react';

interface BalanceRequest {
  id: string;
  member_id: string;
  amount: string;
  type: string;
  reason: string;
  status: string;
  requester_id: string;
  reviewer_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  member_phone: string;
  member_nickname: string;
  requester_username: string;
  reviewer_username: string | null;
}

interface BalanceLog {
  id: string;
  user_id: string;
  amount: string;
  type: string;
  reason: string;
  operator_id: string;
  operator_username: string;
  created_at: string;
}

function formatIDR(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export default function AdminBalancePage() {
  const t = useTranslations('admin');
  const { hasRole, hasPermission } = useAdminAuth();
  const [requests, setRequests] = useState<BalanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [actionLoading, setActionLoading] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BalanceRequest | null>(null);

  // Direct adjustment form
  const [showDirectForm, setShowDirectForm] = useState(false);
  const [directMemberId, setDirectMemberId] = useState('');
  const [directAmount, setDirectAmount] = useState('');
  const [directReason, setDirectReason] = useState('');
  const [directLoading, setDirectLoading] = useState(false);
  const [directResult, setDirectResult] = useState<{ before: number; after: number } | null>(null);

  // Apply form
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyMemberId, setApplyMemberId] = useState('');
  const [applyAmount, setApplyAmount] = useState('');
  const [applyReason, setApplyReason] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);

  // Balance logs
  const [showLogs, setShowLogs] = useState(false);
  const [logMemberId, setLogMemberId] = useState('');
  const [logs, setLogs] = useState<BalanceLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const canDirectAdjust = hasRole('super_admin') || hasRole('finance_super_admin');
  const canApply = hasRole('super_admin') || hasRole('finance_super_admin') || hasPermission('order:edit');
  const canReview = hasRole('super_admin') || hasRole('finance_super_admin');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);

      const data = await adminApi.get<{
        data: { requests: BalanceRequest[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
      }>(`/api/admin/balance/requests?${params}`);
      setRequests(data.data?.requests || []);
      setPagination(data.data?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, statusFilter, typeFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const loadLogs = async (memberId: string) => {
    setLogsLoading(true);
    try {
      const data = await adminApi.get<{
        data: { logs: BalanceLog[] };
      }>(`/api/admin/balance/logs?memberId=${memberId}`);
      setLogs(data.data?.logs || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await adminApi.post(`/api/admin/balance/requests/${requestId}/approve`);
      await loadRequests();
    } catch (err) {
      console.error('Failed to approve:', err);
      alert(t('balance.actionError'));
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectReason.trim()) {
      alert(t('balance.rejectReasonRequired'));
      return;
    }
    setActionLoading(requestId);
    try {
      await adminApi.post(`/api/admin/balance/requests/${requestId}/reject`, { reason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedRequest(null);
      await loadRequests();
    } catch (err) {
      console.error('Failed to reject:', err);
      alert(t('balance.actionError'));
    } finally {
      setActionLoading('');
    }
  };

  const handleDirectAdjust = async () => {
    if (!directMemberId.trim()) { alert(t('balance.memberIdRequired')); return; }
    if (!directAmount || isNaN(Number(directAmount))) { alert(t('balance.amountInvalid')); return; }
    if (!directReason.trim()) { alert(t('balance.reasonRequired')); return; }

    setDirectLoading(true);
    try {
      const data = await adminApi.post<{
        data: { before_balance: number; after_balance: number };
      }>(`/api/admin/members/${directMemberId}/balance`, {
        amount: Number(directAmount),
        reason: directReason,
      });
      setDirectResult({ before: data.data.before_balance, after: data.data.after_balance });
      setDirectMemberId('');
      setDirectAmount('');
      setDirectReason('');
    } catch (err) {
      console.error('Failed to adjust:', err);
      alert(t('balance.adjustError'));
    } finally {
      setDirectLoading(false);
    }
  };

  const handleApply = async () => {
    if (!applyMemberId.trim()) { alert(t('balance.memberIdRequired')); return; }
    if (!applyAmount || isNaN(Number(applyAmount))) { alert(t('balance.amountInvalid')); return; }
    if (!applyReason.trim()) { alert(t('balance.reasonRequired')); return; }

    setApplyLoading(true);
    try {
      await adminApi.post('/api/admin/balance/requests', {
        member_id: applyMemberId,
        amount: Number(applyAmount),
        reason: applyReason,
      });
      setShowApplyForm(false);
      setApplyMemberId('');
      setApplyAmount('');
      setApplyReason('');
      await loadRequests();
      alert(t('balance.applySuccess'));
    } catch (err) {
      console.error('Failed to apply:', err);
      alert(t('balance.applyError'));
    } finally {
      setApplyLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {t(`balance.status.${status}`)}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      direct: 'bg-purple-100 text-purple-800',
      review: 'bg-blue-100 text-blue-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
        {t(`balance.type.${type}`)}
      </span>
    );
  };

  return (
    <AdminAuthGuard requirePermission="order:view">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold">{t('balance.title')}</h1>
          <div className="flex gap-2">
            {canDirectAdjust && (
              <Button
                onClick={() => { setShowDirectForm(!showDirectForm); setShowApplyForm(false); }}
                className="min-h-[44px] bg-purple-600 hover:bg-purple-700"
              >
                <Wallet className="w-4 h-4 mr-2" />
                {t('balance.directAdjust')}
              </Button>
            )}
            {canApply && (
              <Button
                variant="outline"
                onClick={() => { setShowApplyForm(!showApplyForm); setShowDirectForm(false); }}
                className="min-h-[44px]"
              >
                <FileText className="w-4 h-4 mr-2" />
                {t('balance.applyChange')}
              </Button>
            )}
          </div>
        </div>

        {/* Direct adjustment form */}
        {showDirectForm && canDirectAdjust && (
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-6 space-y-4">
            <h3 className="font-bold text-purple-900">{t('balance.directAdjustTitle')}</h3>
            {directResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-800">
                  {t('balance.adjustSuccess', {
                    before: formatIDR(directResult.before),
                    after: formatIDR(directResult.after),
                  })}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setDirectResult(null)} className="ml-auto min-h-[44px]">
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-purple-900">{t('balance.memberId')}</label>
                <Input
                  value={directMemberId}
                  onChange={(e) => setDirectMemberId(e.target.value)}
                  placeholder={t('balance.memberIdPlaceholder')}
                  className="min-h-[44px] mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-purple-900">{t('balance.amount')}</label>
                <Input
                  type="number"
                  value={directAmount}
                  onChange={(e) => setDirectAmount(e.target.value)}
                  placeholder={t('balance.amountPlaceholder')}
                  className="min-h-[44px] mt-1"
                />
                <p className="text-xs text-purple-600 mt-1">{t('balance.amountHint')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-purple-900">{t('balance.reason')}</label>
                <Input
                  value={directReason}
                  onChange={(e) => setDirectReason(e.target.value)}
                  placeholder={t('balance.reasonPlaceholder')}
                  className="min-h-[44px] mt-1"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleDirectAdjust}
                disabled={directLoading}
                className="min-h-[44px] bg-purple-600 hover:bg-purple-700"
              >
                {directLoading ? t('balance.processing') : t('balance.confirmAdjust')}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowDirectForm(false); setDirectResult(null); }}
                className="min-h-[44px]"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}

        {/* Apply form */}
        {showApplyForm && canApply && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 space-y-4">
            <h3 className="font-bold text-blue-900">{t('balance.applyTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-blue-900">{t('balance.memberId')}</label>
                <Input
                  value={applyMemberId}
                  onChange={(e) => setApplyMemberId(e.target.value)}
                  placeholder={t('balance.memberIdPlaceholder')}
                  className="min-h-[44px] mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-blue-900">{t('balance.amount')}</label>
                <Input
                  type="number"
                  value={applyAmount}
                  onChange={(e) => setApplyAmount(e.target.value)}
                  placeholder={t('balance.amountPlaceholder')}
                  className="min-h-[44px] mt-1"
                />
                <p className="text-xs text-blue-600 mt-1">{t('balance.amountHint')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-blue-900">{t('balance.reason')}</label>
                <Input
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  placeholder={t('balance.reasonPlaceholder')}
                  className="min-h-[44px] mt-1"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleApply}
                disabled={applyLoading}
                className="min-h-[44px] bg-blue-600 hover:bg-blue-700"
              >
                {applyLoading ? t('balance.submitting') : t('balance.submitApply')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowApplyForm(false)}
                className="min-h-[44px]"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
            className="px-3 py-2 border rounded-lg text-sm min-h-[44px] bg-white"
          >
            <option value="">{t('balance.allStatus')}</option>
            <option value="pending">{t('balance.status.pending')}</option>
            <option value="approved">{t('balance.status.approved')}</option>
            <option value="rejected">{t('balance.status.rejected')}</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
            className="px-3 py-2 border rounded-lg text-sm min-h-[44px] bg-white"
          >
            <option value="">{t('balance.allTypes')}</option>
            <option value="direct">{t('balance.type.direct')}</option>
            <option value="review">{t('balance.type.review')}</option>
          </select>
        </div>

        {/* Requests table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Wallet className="w-12 h-12 mb-2 text-gray-300" />
              <p>{t('balance.empty')}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('balance.member')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('balance.amount')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('balance.type.label')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('balance.reason')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('balance.status.label')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('balance.requester')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('balance.date')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('balance.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{req.member_nickname || '-'}</p>
                          <p className="text-xs text-gray-500">{req.member_phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold flex items-center gap-1 ${parseFloat(req.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {parseFloat(req.amount) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {formatIDR(Math.abs(parseFloat(req.amount)))}
                          </span>
                        </td>
                        <td className="px-4 py-3">{getTypeBadge(req.type)}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate text-gray-600">{req.reason}</td>
                        <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{req.requester_username || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setLogMemberId(req.member_id); setShowLogs(true); loadLogs(req.member_id); }}
                              className="min-h-[44px] min-w-[44px]"
                              title={t('balance.viewLogs')}
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                            {req.status === 'pending' && canReview && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApprove(req.id)}
                                  disabled={actionLoading === req.id}
                                  className="min-h-[44px] min-w-[44px] text-green-600"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setSelectedRequest(req); setShowRejectModal(true); }}
                                  disabled={actionLoading === req.id}
                                  className="min-h-[44px] min-w-[44px] text-red-600"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {requests.map((req) => (
                  <div key={req.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{req.member_nickname || '-'}</p>
                        <p className="text-xs text-gray-500">{req.member_phone}</p>
                      </div>
                      <span className={`font-bold ${parseFloat(req.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(req.amount) >= 0 ? '+' : '-'}{formatIDR(Math.abs(parseFloat(req.amount)))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTypeBadge(req.type)}
                      {getStatusBadge(req.status)}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{req.reason}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {req.requester_username} - {new Date(req.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-1">
                        {req.status === 'pending' && canReview && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(req.id)}
                              disabled={actionLoading === req.id}
                              className="min-h-[44px] min-w-[44px] text-green-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedRequest(req); setShowRejectModal(true); }}
                              disabled={actionLoading === req.id}
                              className="min-h-[44px] min-w-[44px] text-red-600"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {t('balance.showing', {
                from: (pagination.page - 1) * pagination.pageSize + 1,
                to: Math.min(pagination.page * pagination.pageSize, pagination.total),
                total: pagination.total,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page <= 1}
                className="min-h-[44px] min-w-[44px]"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="flex items-center px-3 text-sm">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="min-h-[44px] min-w-[44px]"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
              <h3 className="text-lg font-bold">{t('balance.rejectTitle')}</h3>
              <div>
                <label className="text-sm font-medium">{t('balance.rejectReason')}</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none mt-1"
                  placeholder={t('balance.rejectReasonPlaceholder')}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => { setShowRejectModal(false); setRejectReason(''); setSelectedRequest(null); }}
                  className="min-h-[44px]"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedRequest.id)}
                  disabled={actionLoading === selectedRequest.id}
                  className="min-h-[44px]"
                >
                  {t('balance.confirmReject')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Logs Modal */}
        {showLogs && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{t('balance.logsTitle')}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowLogs(false); setLogs([]); }}
                  className="min-h-[44px] min-w-[44px]"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              {logsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('balance.noLogs')}</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-sm ${parseFloat(log.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {parseFloat(log.amount) >= 0 ? '+' : ''}{formatIDR(log.amount)}
                        </span>
                        <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600">{log.reason}</p>
                      <p className="text-xs text-gray-400">{t('balance.operator')}: {log.operator_username || '-'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminAuthGuard>
  );
}
