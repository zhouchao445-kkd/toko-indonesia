'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { adminApi } from '@/lib/adminApi';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Truck,
  XOctagon,
  Package,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Clock,
  AlertCircle,
  FileText,
  User,
  MapPin,
} from 'lucide-react';

interface Order {
  id: string;
  order_no: string;
  user_id: string;
  user_phone: string;
  user_nickname: string;
  total_amount: string;
  shipping_fee: string;
  discount_amount: string;
  status: string;
  remark: string;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  price: string;
  quantity: number;
  subtotal: string;
}

interface PaymentProof {
  id: string;
  file_path: string;
  amount: string;
  status: string;
  ip_address: string;
  created_at: string;
}

interface StatusHistory {
  id: string;
  from_status: string;
  to_status: string;
  note: string;
  operator_id: string;
  operator_username: string;
  created_at: string;
}

interface OrderDetail {
  order: {
    id: string;
    order_no: string;
    user_id: string;
    user_phone: string;
    user_nickname: string;
    total_amount: string;
    shipping_fee: string;
    discount_amount: string;
    status: string;
    address: Record<string, string>;
    remark: string;
    created_at: string;
    updated_at: string;
  };
  items: OrderItem[];
  shipping_method: { id: string; name: string; price: string } | null;
  payment_proofs: PaymentProof[];
  status_history: StatusHistory[];
}

const ORDER_STATUSES = [
  'pending_payment',
  'pending_review',
  'approved',
  'rejected',
  'shipped',
  'completed',
  'cancelled',
];

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

export default function AdminOrdersPage() {
  const t = useTranslations('admin');
  const { hasPermission, hasRole } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchOrderNo, setSearchOrderNo] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCompany, setTrackingCompany] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showShipModal, setShowShipModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (statusFilter) params.append('status', statusFilter);

      const data = await adminApi.get<{
        data: { orders: Order[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
      }>(`/api/admin/orders?${params}`);
      setOrders(data.data?.orders || []);
      setPagination(data.data?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const loadOrderDetail = async (orderId: string) => {
    setDetailLoading(true);
    try {
      const data = await adminApi.get<{ data: OrderDetail }>(`/api/admin/orders/${orderId}`);
      setSelectedOrder(data.data);
    } catch (err) {
      console.error('Failed to load order detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApproveProof = async (orderId: string) => {
    setActionLoading('approve');
    try {
      await adminApi.post(`/api/admin/orders/${orderId}/review-proof`, { action: 'approve' });
      await loadOrderDetail(orderId);
      await loadOrders();
    } catch (err) {
      console.error('Failed to approve:', err);
      alert(t('orders.actionError'));
    } finally {
      setActionLoading('');
    }
  };

  const handleRejectProof = async (orderId: string) => {
    if (!rejectReason.trim()) {
      alert(t('orders.rejectReasonRequired'));
      return;
    }
    setActionLoading('reject');
    try {
      await adminApi.post(`/api/admin/orders/${orderId}/review-proof`, {
        action: 'reject',
        note: rejectReason,
      });
      setShowRejectModal(false);
      setRejectReason('');
      await loadOrderDetail(orderId);
      await loadOrders();
    } catch (err) {
      console.error('Failed to reject:', err);
      alert(t('orders.actionError'));
    } finally {
      setActionLoading('');
    }
  };

  const handleShip = async (orderId: string) => {
    setActionLoading('ship');
    try {
      await adminApi.post(`/api/admin/orders/${orderId}/ship`, {
        tracking_number: trackingNumber,
        tracking_company: trackingCompany,
      });
      setShowShipModal(false);
      setTrackingNumber('');
      setTrackingCompany('');
      await loadOrderDetail(orderId);
      await loadOrders();
    } catch (err) {
      console.error('Failed to ship:', err);
      alert(t('orders.actionError'));
    } finally {
      setActionLoading('');
    }
  };

  const handleCancel = async (orderId: string) => {
    setActionLoading('cancel');
    try {
      await adminApi.post(`/api/admin/orders/${orderId}/cancel`, {
        reason: cancelReason,
      });
      setShowCancelModal(false);
      setCancelReason('');
      await loadOrderDetail(orderId);
      await loadOrders();
    } catch (err) {
      console.error('Failed to cancel:', err);
      alert(t('orders.actionError'));
    } finally {
      setActionLoading('');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      pending_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      shipped: 'bg-purple-100 text-purple-800',
      completed: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {t(`orders.status.${status}`)}
      </span>
    );
  };

  const filteredOrders = searchOrderNo
    ? orders.filter((o) => o.order_no.toLowerCase().includes(searchOrderNo.toLowerCase()))
    : orders;

  // Detail view
  if (selectedOrder) {
    const order = selectedOrder.order;
    const canReview = order.status === 'pending_review' &&
      (hasRole('super_admin') || hasRole('finance_super_admin') || hasPermission('order:edit'));
    const canShip = order.status === 'approved' &&
      (hasRole('super_admin') || hasPermission('order:edit'));
    const canCancel = ['pending_payment', 'pending_review', 'approved', 'rejected'].includes(order.status) &&
      (hasRole('super_admin') || hasPermission('order:edit'));

    return (
      <AdminAuthGuard requirePermission="order:view">
        <div className="space-y-6">
          {/* Back button */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedOrder(null)}
              className="min-h-[44px] min-w-[44px]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('orders.backToList')}
            </Button>
          </div>

          {/* Order info */}
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold">{t('orders.orderDetail')}</h2>
                <p className="text-sm text-gray-500">{order.order_no}</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(order.status)}
                <span className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Member info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{t('orders.member')}:</span>
                  <span className="font-medium">{order.user_nickname || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">{t('orders.phone')}:</span>
                  <span className="font-medium">{order.user_phone || '-'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-gray-600">{t('orders.address')}:</span>
                    <p className="font-medium">
                      {order.address ? (
                        <>
                          {order.address.name} ({order.address.phone})<br />
                          {order.address.province}{order.address.city}{order.address.district}<br />
                          {order.address.detail}
                        </>
                      ) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order items */}
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3">{t('orders.items')}</h3>
              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {item.product_image ? (
                      <img
                        src={`${API_BASE}${item.product_image}`}
                        alt={item.product_name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product_name}</p>
                      <p className="text-sm text-gray-500">
                        {formatIDR(item.price)} x {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">{formatIDR(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Amount summary */}
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('orders.subtotal')}:</span>
                <span>{formatIDR(parseFloat(order.total_amount) - parseFloat(order.shipping_fee) + parseFloat(order.discount_amount))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('orders.shippingFee')}:</span>
                <span>{formatIDR(order.shipping_fee)}</span>
              </div>
              {parseFloat(order.discount_amount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t('orders.discount')}:</span>
                  <span>-{formatIDR(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>{t('orders.total')}:</span>
                <span>{formatIDR(order.total_amount)}</span>
              </div>
            </div>

            {/* Remark */}
            {order.remark && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">{t('orders.remark')}:</h3>
                <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded">{order.remark}</p>
              </div>
            )}

            {/* Payment proofs */}
            {selectedOrder.payment_proofs.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t('orders.paymentProofs')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedOrder.payment_proofs.map((proof) => (
                    <div key={proof.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{formatIDR(proof.amount)}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          proof.status === 'approved' ? 'bg-green-100 text-green-800' :
                          proof.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {t(`orders.proofStatus.${proof.status}`)}
                        </span>
                      </div>
                      {proof.file_path && (
                        <img
                          src={`${API_BASE}${proof.file_path}`}
                          alt="Payment proof"
                          className="w-full h-32 object-cover rounded"
                        />
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(proof.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status history */}
            {selectedOrder.status_history.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t('orders.statusHistory')}
                </h3>
                <div className="space-y-2">
                  {selectedOrder.status_history.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <div>
                        <p>
                          <span className="text-gray-600">{t(`orders.status.${h.from_status}`)}</span>
                          {' → '}
                          <span className="font-medium">{t(`orders.status.${h.to_status}`)}</span>
                        </p>
                        {h.note && <p className="text-gray-500">{h.note}</p>}
                        <p className="text-xs text-gray-400">
                          {h.operator_username || 'System'} - {new Date(h.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-4 border-t flex flex-wrap gap-3">
              {canReview && (
                <>
                  <Button
                    onClick={() => handleApproveProof(order.id)}
                    disabled={actionLoading === 'approve'}
                    className="min-h-[44px] bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('orders.approve')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading === 'reject'}
                    className="min-h-[44px]"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {t('orders.reject')}
                  </Button>
                </>
              )}
              {canShip && (
                <Button
                  onClick={() => setShowShipModal(true)}
                  disabled={actionLoading === 'ship'}
                  className="min-h-[44px] bg-purple-600 hover:bg-purple-700"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  {t('orders.ship')}
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={() => setShowCancelModal(true)}
                  disabled={actionLoading === 'cancel'}
                  className="min-h-[44px] text-red-600 border-red-300 hover:bg-red-50"
                >
                  <XOctagon className="w-4 h-4 mr-2" />
                  {t('orders.cancel')}
                </Button>
              )}
            </div>
          </div>

          {/* Ship Modal */}
          {showShipModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
                <h3 className="text-lg font-bold">{t('orders.shipTitle')}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">{t('orders.trackingCompany')}</label>
                    <Input
                      value={trackingCompany}
                      onChange={(e) => setTrackingCompany(e.target.value)}
                      placeholder={t('orders.trackingCompanyPlaceholder')}
                      className="min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('orders.trackingNumber')}</label>
                    <Input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder={t('orders.trackingNumberPlaceholder')}
                      className="min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowShipModal(false)}
                    className="min-h-[44px]"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={() => handleShip(order.id)}
                    disabled={actionLoading === 'ship'}
                    className="min-h-[44px] bg-purple-600 hover:bg-purple-700"
                  >
                    {t('orders.confirmShip')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Reject Modal */}
          {showRejectModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
                <h3 className="text-lg font-bold">{t('orders.rejectTitle')}</h3>
                <div>
                  <label className="text-sm font-medium">{t('orders.rejectReason')}</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none"
                    placeholder={t('orders.rejectReasonPlaceholder')}
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
                    onClick={() => handleRejectProof(order.id)}
                    disabled={actionLoading === 'reject'}
                    className="min-h-[44px]"
                  >
                    {t('orders.confirmReject')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Modal */}
          {showCancelModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
                <h3 className="text-lg font-bold">{t('orders.cancelTitle')}</h3>
                <div>
                  <label className="text-sm font-medium">{t('orders.cancelReason')}</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none"
                    placeholder={t('orders.cancelReasonPlaceholder')}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                    className="min-h-[44px]"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleCancel(order.id)}
                    disabled={actionLoading === 'cancel'}
                    className="min-h-[44px]"
                  >
                    {t('orders.confirmCancel')}
                  </Button>
                </div>
              </div>
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
          <h1 className="text-2xl font-bold">{t('orders.title')}</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchOrderNo}
              onChange={(e) => setSearchOrderNo(e.target.value)}
              placeholder={t('orders.searchPlaceholder')}
              className="pl-10 min-h-[44px]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
            className="px-3 py-2 border rounded-lg text-sm min-h-[44px] bg-white"
          >
            <option value="">{t('orders.allStatus')}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`orders.status.${s}`)}</option>
            ))}
          </select>
        </div>

        {/* Orders table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Package className="w-12 h-12 mb-2 text-gray-300" />
              <p>{t('orders.empty')}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.orderNo')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.member')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.total')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.status')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.date')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('orders.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">{order.order_no}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{order.user_nickname || '-'}</p>
                            <p className="text-xs text-gray-500">{order.user_phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatIDR(order.total_amount)}</td>
                        <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadOrderDetail(order.id)}
                            className="min-h-[44px] min-w-[44px]"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            {t('orders.view')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{order.order_no}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{order.user_nickname || '-'}</p>
                        <p className="text-xs text-gray-500">{order.user_phone}</p>
                      </div>
                      <p className="font-semibold">{formatIDR(order.total_amount)}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadOrderDetail(order.id)}
                        className="min-h-[44px] min-w-[44px]"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {t('orders.view')}
                      </Button>
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
              {t('orders.showing', {
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
