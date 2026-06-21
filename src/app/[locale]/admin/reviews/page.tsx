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
  Star,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Package,
} from 'lucide-react';

interface Review {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  rating: number;
  content: string;
  images: string[];
  status: string;
  created_at: string;
  updated_at: string;
  user_phone: string;
  user_nickname: string;
  product_name: string;
  product_image: string;
}

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000')
  : 'http://localhost:9000';

export default function AdminReviewsPage() {
  const t = useTranslations('admin');
  const { hasPermission, hasRole } = useAdminAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);

  const canReview = hasRole('super_admin') || hasPermission('review:edit');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (statusFilter) params.append('status', statusFilter);

      const data = await adminApi.get<{
        data: { reviews: Review[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
      }>(`/api/admin/reviews?${params}`);
      setReviews(data.data?.reviews || []);
      setPagination(data.data?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleApprove = async (reviewId: string) => {
    setActionLoading(reviewId);
    try {
      await adminApi.post(`/api/admin/reviews/${reviewId}/approve`);
      await loadReviews();
      if (selectedReview?.id === reviewId) setSelectedReview(null);
    } catch (err) {
      console.error('Failed to approve:', err);
      alert(t('reviews.actionError'));
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async (reviewId: string) => {
    if (!rejectReason.trim()) {
      alert(t('reviews.rejectReasonRequired'));
      return;
    }
    setActionLoading(reviewId);
    try {
      await adminApi.post(`/api/admin/reviews/${reviewId}/reject`, { reason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
      await loadReviews();
      if (selectedReview?.id === reviewId) setSelectedReview(null);
    } catch (err) {
      console.error('Failed to reject:', err);
      alert(t('reviews.actionError'));
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
        {t(`reviews.status.${status}`)}
      </span>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  // Detail view
  if (selectedReview) {
    return (
      <AdminAuthGuard requirePermission="review:view">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedReview(null)}
              className="min-h-[44px] min-w-[44px]"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {t('reviews.backToList')}
            </Button>
          </div>

          <div className="bg-white rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-bold">{t('reviews.detailTitle')}</h2>
              {getStatusBadge(selectedReview.status)}
            </div>

            {/* Product info */}
            <div className="pt-4 border-t flex items-center gap-3">
              {selectedReview.product_image ? (
                <img
                  src={`${API_BASE}${selectedReview.product_image}`}
                  alt={selectedReview.product_name}
                  className="w-16 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-medium">{selectedReview.product_name}</p>
                <p className="text-sm text-gray-500">{t('reviews.productId')}: {selectedReview.product_id}</p>
              </div>
            </div>

            {/* Review content */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedReview.user_nickname || '-'}</span>
                  <span className="text-sm text-gray-500">({selectedReview.user_phone})</span>
                </div>
                {renderStars(selectedReview.rating)}
              </div>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedReview.content}</p>

              {/* Images */}
              {selectedReview.images && selectedReview.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedReview.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={`${API_BASE}${img}`}
                      alt={`Review image ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => setShowImageModal(img)}
                    />
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500">
                {new Date(selectedReview.created_at).toLocaleString()}
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t flex flex-wrap gap-3">
              {selectedReview.status === 'pending' && canReview && (
                <>
                  <Button
                    onClick={() => handleApprove(selectedReview.id)}
                    disabled={actionLoading === selectedReview.id}
                    className="min-h-[44px] bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('reviews.approve')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading === selectedReview.id}
                    className="min-h-[44px]"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {t('reviews.reject')}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Reject Modal */}
          {showRejectModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
                <h3 className="text-lg font-bold">{t('reviews.rejectTitle')}</h3>
                <div>
                  <label className="text-sm font-medium">{t('reviews.rejectReason')}</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none mt-1"
                    placeholder={t('reviews.rejectReasonPlaceholder')}
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
                    onClick={() => handleReject(selectedReview.id)}
                    disabled={actionLoading === selectedReview.id}
                    className="min-h-[44px]"
                  >
                    {t('reviews.confirmReject')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Image Modal */}
          {showImageModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowImageModal(null)}>
              <img
                src={`${API_BASE}${showImageModal}`}
                alt="Review full"
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
    <AdminAuthGuard requirePermission="review:view">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold">{t('reviews.title')}</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
            className="px-3 py-2 border rounded-lg text-sm min-h-[44px] bg-white"
          >
            <option value="">{t('reviews.allStatus')}</option>
            <option value="pending">{t('reviews.status.pending')}</option>
            <option value="approved">{t('reviews.status.approved')}</option>
            <option value="rejected">{t('reviews.status.rejected')}</option>
          </select>
        </div>

        {/* Reviews list */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <MessageSquare className="w-12 h-12 mb-2 text-gray-300" />
              <p>{t('reviews.empty')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {reviews.map((review) => (
                <div key={review.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    {/* Product image */}
                    {review.product_image ? (
                      <img
                        src={`${API_BASE}${review.product_image}`}
                        alt={review.product_name}
                        className="w-16 h-16 object-cover rounded shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{review.user_nickname || '-'}</span>
                          {renderStars(review.rating)}
                        </div>
                        {getStatusBadge(review.status)}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{review.content}</p>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="text-xs text-gray-500">{review.product_name}</p>
                          <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReview(review)}
                            className="min-h-[44px] min-w-[44px]"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {review.status === 'pending' && canReview && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(review.id)}
                                disabled={actionLoading === review.id}
                                className="min-h-[44px] min-w-[44px] text-green-600"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSelectedReview(review); setShowRejectModal(true); }}
                                disabled={actionLoading === review.id}
                                className="min-h-[44px] min-w-[44px] text-red-600"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {t('reviews.showing', {
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

function RejectModal({ review, reason, onReasonChange, onCancel, onConfirm, loading, t }: {
  review: Review;
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
        <h3 className="text-lg font-bold">{t('reviews.rejectTitle')}</h3>
        <div>
          <label className="text-sm font-medium">{t('reviews.rejectReason')}</label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none mt-1"
            placeholder={t('reviews.rejectReasonPlaceholder')}
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
            {t('reviews.confirmReject')}
          </Button>
        </div>
      </div>
    </div>
  );
}
