'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { adminApi } from '@/lib/adminApi';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface PaymentProof {
  id: string;
  order_id: string;
  user_id: string;
  file_path: string;
  amount: string;
  status: string;
  ip_address: string;
  created_at: string;
  order_no: string;
  order_total: string;
  order_status: string;
  user_phone: string;
  user_nickname: string;
}

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000')
  : 'http://localhost:9000';

function formatIDR(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export default function AdminPaymentProofsPage() {
  const t = useTranslations('admin');
  const { hasPermission, hasRole } = useAdminAuth();
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const canReview = hasRole('super_admin') || hasRole('finance_super_admin') || hasPermission('order:edit');

  const loadProofs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (statusFilter) params.append('status', statusFilter);

      const data = await adminApi.get<{
        data: { proofs: PaymentProof[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
      }>(`/api/admin/payment-proofs?${params}`);
      setProofs(data.data?.proofs || []);
      setPagination(data.data?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Failed to load proofs:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    loadProofs();
  }, [loadProofs]);

  const handleApprove = async (proofId: string) => {
    setActionLoading(proofId);
    try {
      await adminApi.post(`/api/admin/payment-proofs/${proofId}/approve`);
      await loadProofs();
      if (selectedProof?.id === proofId) {
        setSelectedProof(null);
      }
    } catch (err) {
      console.error('Failed to approve:', err);
      alert(t('paymentProofs.actionError'));
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async (proofId: string) => {
    if (!rejectReason.trim()) {
      alert(t('paymentProofs.rejectReasonRequired'));
      return;
    }
    setActionLoading(proofId);
    try {
      await adminApi.post(`/api/admin/payment-proofs/${proofId}/reject`, { reason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
      await loadProofs();
      if (selectedProof?.id === proofId) {
        setSelectedProof(null);
      }
    } catch (err) {
      console.error('Failed to reject:', err);
      alert(t('paymentProofs.actionError'));
    } finally {
      setActionLoading('');
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
        {t(`paymentProofs.status.${status}`)}
      </span>
    );
  };

  // Detail view
  if (selectedProof) {
    return (
      <AdminAuthGuard requirePermission="order:view">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedProof(null)}
              className="min-h-[44px] min-w-[44px]"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {t('paymentProofs.backToList')}
            </Button>
          </div>

          <div className="bg-white rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-bold">{t('paymentProofs.detailTitle')}</h2>
              {getStatusBadge(selectedProof.status)}
            </div>

            {/* Proof image */}
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3">{t('paymentProofs.proofImage')}</h3>
              {selectedProof.file_path ? (
                <img
                  src={`${API_BASE}${selectedProof.file_path}`}
                  alt="Payment proof"
                  className="max-w-md w-full rounded-lg border cursor-pointer hover:opacity-90"
                  onClick={() => setShowImageModal(true)}
                />
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-12 h-12 text-gray-300" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-600">{t('paymentProofs.amount')}:</span>
                  <span className="font-bold ml-2">{formatIDR(selectedProof.amount)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">{t('paymentProofs.orderNo')}:</span>
                  <span className="font-medium ml-2">{selectedProof.order_no}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">{t('paymentProofs.orderTotal')}:</span>
                  <span className="font-medium ml-2">{formatIDR(selectedProof.order_total)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-600">{t('paymentProofs.member')}:</span>
                  <span className="font-medium ml-2">{selectedProof.user_nickname || '-'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">{t('paymentProofs.phone')}:</span>
                  <span className="font-medium ml-2">{selectedProof.user_phone || '-'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">{t('paymentProofs.submittedAt')}:</span>
                  <span className="font-medium ml-2">{new Date(selectedProof.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Amount comparison */}
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">{t('paymentProofs.amountComparison')}</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="px-3 py-2 bg-blue-50 rounded">
                  <span className="text-gray-600">{t('paymentProofs.proofAmount')}:</span>
                  <span className="font-bold ml-2">{formatIDR(selectedProof.amount)}</span>
                </div>
                <span className="text-gray-400">vs</span>
                <div className="px-3 py-2 bg-gray-50 rounded">
                  <span className="text-gray-600">{t('paymentProofs.orderAmount')}:</span>
                  <span className="font-bold ml-2">{formatIDR(selectedProof.order_total)}</span>
                </div>
                {parseFloat(selectedProof.amount) !== parseFloat(selectedProof.order_total) && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>

            {/* Actions */}
            {selectedProof.status === 'pending' && canReview && (
              <div className="pt-4 border-t flex gap-3">
                <Button
                  onClick={() => handleApprove(selectedProof.id)}
                  disabled={actionLoading === selectedProof.id}
                  className="min-h-[44px] bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('paymentProofs.approve')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading === selectedProof.id}
                  className="min-h-[44px]"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {t('paymentProofs.reject')}
                </Button>
              </div>
            )}
          </div>

          {/* Reject Modal */}
          {showRejectModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
                <h3 className="text-lg font-bold">{t('paymentProofs.rejectTitle')}</h3>
                <div>
                  <label className="text-sm font-medium">{t('paymentProofs.rejectReason')}</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none mt-1"
                    placeholder={t('paymentProofs.rejectReasonPlaceholder')}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                    className="min-h-[44px]"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedProof.id)}
                    disabled={actionLoading === selectedProof.id}
                    className="min-h-[44px]"
                  >
                    {t('paymentProofs.confirmReject')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Image Modal */}
          {showImageModal && selectedProof.file_path && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowImageModal(false)}>
              <img
                src={`${API_BASE}${selectedProof.file_path}`}
                alt="Payment proof full"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </div>
      </AdminAuthGuard>
    );
  }

  // List view
  return (
    <AdminAuthGuard requirePermission="order:view">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold">{t('paymentProofs.title')}</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
            className="px-3 py-2 border rounded-lg text-sm min-h-[44px] bg-white"
          >
            <option value="">{t('paymentProofs.allStatus')}</option>
            <option value="pending">{t('paymentProofs.status.pending')}</option>
            <option value="approved">{t('paymentProofs.status.approved')}</option>
            <option value="rejected">{t('paymentProofs.status.rejected')}</option>
          </select>
        </div>

        {/* Proofs list */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : proofs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <FileText className="w-12 h-12 mb-2 text-gray-300" />
              <p>{t('paymentProofs.empty')}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('paymentProofs.image')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('paymentProofs.orderNo')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('paymentProofs.member')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('paymentProofs.amount')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('paymentProofs.status.label')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('paymentProofs.submittedAt')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('paymentProofs.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {proofs.map((proof) => (
                      <tr key={proof.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {proof.file_path ? (
                            <img
                              src={`${API_BASE}${proof.file_path}`}
                              alt="Proof"
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <FileText className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{proof.order_no}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{proof.user_nickname || '-'}</p>
                          <p className="text-xs text-gray-500">{proof.user_phone}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatIDR(proof.amount)}</td>
                        <td className="px-4 py-3">{getStatusBadge(proof.status)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(proof.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedProof(proof)}
                              className="min-h-[44px] min-w-[44px]"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {proof.status === 'pending' && canReview && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApprove(proof.id)}
                                  disabled={actionLoading === proof.id}
                                  className="min-h-[44px] min-w-[44px] text-green-600"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setSelectedProof(proof); setShowRejectModal(true); }}
                                  disabled={actionLoading === proof.id}
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
                {proofs.map((proof) => (
                  <div key={proof.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {proof.file_path ? (
                          <img
                            src={`${API_BASE}${proof.file_path}`}
                            alt="Proof"
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <FileText className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                        <div>
                          <p className="font-mono text-xs">{proof.order_no}</p>
                          <p className="text-sm font-medium">{proof.user_nickname || '-'}</p>
                        </div>
                      </div>
                      {getStatusBadge(proof.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{formatIDR(proof.amount)}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProof(proof)}
                          className="min-h-[44px] min-w-[44px]"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {proof.status === 'pending' && canReview && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(proof.id)}
                              disabled={actionLoading === proof.id}
                              className="min-h-[44px] min-w-[44px] text-green-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedProof(proof); setShowRejectModal(true); }}
                              disabled={actionLoading === proof.id}
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
              {t('paymentProofs.showing', {
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
      </div>
    </AdminAuthGuard>
  );
}

function RejectModal({ proof, reason, onReasonChange, onCancel, onConfirm, loading, t }: {
  proof: PaymentProof;
  reason: string;
  onReasonChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-bold">{t('paymentProofs.rejectTitle')}</h3>
        <div>
          <label className="text-sm font-medium">{t('paymentProofs.rejectReason')}</label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none mt-1"
            placeholder={t('paymentProofs.rejectReasonPlaceholder')}
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            className="min-h-[44px]"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="min-h-[44px]"
          >
            {t('paymentProofs.confirmReject')}
          </Button>
        </div>
      </div>
    </div>
  );
}
