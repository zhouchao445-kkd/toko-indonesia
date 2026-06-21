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
  UserCheck,
  UserX,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Wallet,
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  Clock,
} from 'lucide-react';

interface Member {
  id: string;
  phone: string;
  email: string;
  nickname: string;
  avatar: string;
  status: string;
  balance: string;
  created_at: string;
  updated_at: string;
  order_count: string;
  total_spent: string;
}

interface MemberDetail {
  member: {
    id: string;
    phone: string;
    email: string;
    nickname: string;
    avatar: string;
    status: string;
    balance: string;
    created_at: string;
    updated_at: string;
  };
  addresses: Array<{
    id: string;
    name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
    is_default: boolean;
  }>;
  recent_orders: Array<{
    id: string;
    order_no: string;
    total_amount: string;
    status: string;
    created_at: string;
  }>;
  statistics: {
    total_orders: string;
    total_spent: string;
    pending_amount: string;
  };
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

export default function AdminMembersPage() {
  const t = useTranslations('admin');
  const { hasPermission, hasRole } = useAdminAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const canEdit = hasRole('super_admin') || hasPermission('member:edit');

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const data = await adminApi.get<{
        data: { members: Member[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
      }>(`/api/admin/members?${params}`);
      setMembers(data.data?.members || []);
      setPagination(data.data?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, statusFilter]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const loadMemberDetail = async (memberId: string) => {
    setDetailLoading(true);
    try {
      const data = await adminApi.get<{ data: MemberDetail }>(`/api/admin/members/${memberId}`);
      setSelectedMember(data.data);
    } catch (err) {
      console.error('Failed to load member detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleStatus = async (memberId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'banned' : 'active';
    setActionLoading(memberId);
    try {
      await adminApi.post(`/api/admin/members/${memberId}/status`, { status: newStatus });
      await loadMembers();
      if (selectedMember?.member.id === memberId) {
        await loadMemberDetail(memberId);
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert(t('members.actionError'));
    } finally {
      setActionLoading('');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      banned: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {t(`members.status.${status}`)}
      </span>
    );
  };

  // Detail view
  if (selectedMember) {
    const member = selectedMember.member;
    return (
      <AdminAuthGuard requirePermission="member:view">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedMember(null)}
              className="min-h-[44px] min-w-[44px]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('members.backToList')}
            </Button>
          </div>

          <div className="bg-white rounded-lg border p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.nickname} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{member.nickname || '-'}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(member.status)}
                    <span className="text-sm text-gray-500">ID: {member.id}</span>
                  </div>
                </div>
              </div>
              {canEdit && (
                <Button
                  variant={member.status === 'active' ? 'destructive' : 'default'}
                  onClick={() => handleToggleStatus(member.id, member.status)}
                  disabled={actionLoading === member.id}
                  className="min-h-[44px]"
                >
                  {member.status === 'active' ? (
                    <>
                      <UserX className="w-4 h-4 mr-2" />
                      {t('members.ban')}
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      {t('members.activate')}
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{t('members.phone')}:</span>
                <span className="font-medium">{member.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{t('members.email')}:</span>
                <span className="font-medium">{member.email || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{t('members.joinedAt')}:</span>
                <span className="font-medium">{new Date(member.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <ShoppingBag className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-600">{selectedMember.statistics.total_orders}</p>
                <p className="text-sm text-gray-600">{t('members.totalOrders')}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <Wallet className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-600">{formatIDR(selectedMember.statistics.total_spent)}</p>
                <p className="text-sm text-gray-600">{t('members.totalSpent')}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <Wallet className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-purple-600">{formatIDR(member.balance)}</p>
                <p className="text-sm text-gray-600">{t('members.balance')}</p>
              </div>
            </div>

            {/* Addresses */}
            {selectedMember.addresses.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {t('members.addresses')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedMember.addresses.map((addr) => (
                    <div key={addr.id} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{addr.name}</span>
                        {addr.is_default && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {t('members.default')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{addr.phone}</p>
                      <p className="text-sm text-gray-500">
                        {addr.province} {addr.city} {addr.district} {addr.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent orders */}
            {selectedMember.recent_orders.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  {t('members.recentOrders')}
                </h3>
                <div className="space-y-2">
                  {selectedMember.recent_orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-mono text-xs">{order.order_no}</p>
                        <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatIDR(order.total_amount)}</p>
                        <span className="text-xs text-gray-500">{t(`orders.status.${order.status}`)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminAuthGuard>
    );
  }

  // List view
  return (
    <AdminAuthGuard requirePermission="member:view">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold">{t('members.title')}</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPagination((p) => ({ ...p, page: 1 })); loadMembers(); } }}
              placeholder={t('members.searchPlaceholder')}
              className="pl-10 min-h-[44px]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
            className="px-3 py-2 border rounded-lg text-sm min-h-[44px] bg-white"
          >
            <option value="">{t('members.allStatus')}</option>
            <option value="active">{t('members.status.active')}</option>
            <option value="banned">{t('members.status.banned')}</option>
          </select>
        </div>

        {/* Members table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Users className="w-12 h-12 mb-2 text-gray-300" />
              <p>{t('members.empty')}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('members.member')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('members.contact')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('members.balance')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('members.orders')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('members.totalSpent')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('members.status.label')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">{t('members.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                              {member.avatar ? (
                                <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <span className="font-medium">{member.nickname || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs">{member.phone}</p>
                          <p className="text-xs text-gray-500">{member.email || '-'}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatIDR(member.balance)}</td>
                        <td className="px-4 py-3">{member.order_count}</td>
                        <td className="px-4 py-3">{formatIDR(member.total_spent)}</td>
                        <td className="px-4 py-3">{getStatusBadge(member.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadMemberDetail(member.id)}
                              className="min-h-[44px] min-w-[44px]"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(member.id, member.status)}
                                disabled={actionLoading === member.id}
                                className={`min-h-[44px] min-w-[44px] ${member.status === 'active' ? 'text-red-600' : 'text-green-600'}`}
                              >
                                {member.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </Button>
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
                {members.map((member) => (
                  <div key={member.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{member.nickname || '-'}</p>
                          <p className="text-xs text-gray-500">{member.phone}</p>
                        </div>
                      </div>
                      {getStatusBadge(member.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-600">{t('members.balance')}</p>
                        <p className="font-semibold">{formatIDR(member.balance)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-600">{t('members.orders')}</p>
                        <p className="font-semibold">{member.order_count}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadMemberDetail(member.id)}
                        className="min-h-[44px] flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {t('members.view')}
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(member.id, member.status)}
                          disabled={actionLoading === member.id}
                          className={`min-h-[44px] flex-1 ${member.status === 'active' ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {member.status === 'active' ? (
                            <><UserX className="w-4 h-4 mr-1" />{t('members.ban')}</>
                          ) : (
                            <><UserCheck className="w-4 h-4 mr-1" />{t('members.activate')}</>
                          )}
                        </Button>
                      )}
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
              {t('members.showing', {
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
