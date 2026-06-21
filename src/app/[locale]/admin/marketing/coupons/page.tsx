'use client';

import { useTranslations } from 'next-intl';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { adminApi } from '@/lib/adminApi';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, BarChart3, Copy, Check, Send, Users } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  status: string;
  created_at: string;
}

export default function AdminCouponsPage() {
  const t = useTranslations('admin');
  const { hasPermission } = useAdminAuth();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Issue modal state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueCouponId, setIssueCouponId] = useState<string | null>(null);
  const [issueType, setIssueType] = useState<'specific' | 'all'>('specific');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Usage drawer state
  const [showUsageDrawer, setShowUsageDrawer] = useState(false);
  const [usageCouponId, setUsageCouponId] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<{
    issued_count: number;
    used_count: number;
    unused_count: number;
    conversion_rate: number;
    recent_usage: { member_name: string; used_at: string; order_id: string }[];
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    min_order_amount: '',
    max_discount: '',
    usage_limit: '',
    valid_from: '',
    valid_until: '',
    status: 'active',
  });

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.get<{ coupons: Coupon[]; pagination: { totalPages: number } }>(
        `/coupons?page=${page}&pageSize=20`
      );
      setCoupons(data.coupons || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCreate = () => {
    setEditingCoupon(null);
    setFormData({
      code: generateCode(),
      type: 'percentage',
      value: '',
      min_order_amount: '',
      max_discount: '',
      usage_limit: '',
      valid_from: '',
      valid_until: '',
      status: 'active',
    });
    setShowForm(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      min_order_amount: String(coupon.min_order_amount || ''),
      max_discount: coupon.max_discount ? String(coupon.max_discount) : '',
      usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
      valid_from: coupon.valid_from ? coupon.valid_from.split('T')[0] : '',
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
      status: coupon.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        value: parseFloat(formData.value),
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
        status: formData.status,
      };

      if (editingCoupon) {
        await adminApi.put(`/coupons/${editingCoupon.id}`, payload);
      } else {
        await adminApi.post('/coupons', payload);
      }

      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      console.error('Failed to save coupon:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('marketing.confirmDelete'))) return;
    try {
      await adminApi.delete(`/coupons/${id}`);
      fetchCoupons();
    } catch (err) {
      console.error('Failed to delete coupon:', err);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleIssue = async (couponId: string) => {
    setIssueCouponId(couponId);
    setShowIssueModal(true);
    setIssueType('specific');
    setSelectedMemberIds([]);
    // Fetch members for selection
    setMembersLoading(true);
    try {
      const data = await adminApi.get<{ members: { id: string; name: string; email: string }[] }>(
        '/members?pageSize=100'
      );
      setMembers(data.members || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleSubmitIssue = async () => {
    if (!issueCouponId) return;
    try {
      if (issueType === 'all') {
        await adminApi.post(`/coupons/${issueCouponId}/issue`, { type: 'all' });
      } else {
        if (selectedMemberIds.length === 0) return;
        await adminApi.post(`/coupons/${issueCouponId}/issue`, { memberIds: selectedMemberIds });
      }
      setShowIssueModal(false);
      fetchCoupons();
    } catch (err) {
      console.error('Failed to issue coupon:', err);
    }
  };

  const handleViewUsage = async (couponId: string) => {
    setUsageCouponId(couponId);
    setShowUsageDrawer(true);
    try {
      const data = await adminApi.get<{
        issued_count: number;
        used_count: number;
        unused_count: number;
        conversion_rate: number;
        recent_usage: { member_name: string; used_at: string; order_id: string }[];
      }>(`/coupons/${couponId}/usage`);
      setUsageData(data);
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'CPN-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const canEdit = hasPermission('marketing.can_edit');
  const canDelete = hasPermission('marketing.can_delete');
  const canCreate = hasPermission('marketing.can_create');

  return (
    <AdminAuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('marketing.coupons')}</h1>
            <p className="text-gray-600 mt-1">{t('marketing.couponsDesc')}</p>
          </div>
          {canCreate && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              {t('common.create')}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('marketing.code')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('marketing.type')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('marketing.value')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('marketing.usage')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('marketing.validPeriod')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.status')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('common.loading')}</td></tr>
                ) : coupons.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('common.noData')}</td></tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{coupon.code}</code>
                          <button
                            onClick={() => handleCopyCode(coupon.code)}
                            className="p-1 hover:bg-gray-200 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            {copiedCode === coupon.code ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${coupon.type === 'percentage' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {coupon.type === 'percentage' ? t('marketing.percentage') : t('marketing.fixed')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {coupon.type === 'percentage' ? `${coupon.value}%` : `Rp ${Number(coupon.value).toLocaleString()}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600">{coupon.used_count || 0}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {coupon.valid_from ? new Date(coupon.valid_from).toLocaleDateString() : '—'}
                        {' ~ '}
                        {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${coupon.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {coupon.status === 'active' ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button onClick={() => handleIssue(coupon.id)} className="p-2 hover:bg-green-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center" title={t('marketing.issue')}>
                              <Send className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          <button onClick={() => handleViewUsage(coupon.id)} className="p-2 hover:bg-blue-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center" title={t('marketing.viewUsage')}>
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                          </button>
                          {canEdit && (
                            <button onClick={() => handleEdit(coupon)} className="p-2 hover:bg-blue-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(coupon.id)} className="p-2 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
              >
                {t('common.prev')}
              </button>
              <span className="text-sm text-gray-600">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">
                {editingCoupon ? t('marketing.editCoupon') : t('marketing.createCoupon')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.code')}</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg min-h-[44px]"
                    placeholder="CPN-XXXXXX"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.type')}</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg min-h-[44px]"
                    >
                      <option value="percentage">{t('marketing.percentage')}</option>
                      <option value="fixed">{t('marketing.fixed')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.value')}</label>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg min-h-[44px]"
                      placeholder={formData.type === 'percentage' ? '%' : 'Rp'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.minOrderAmount')}</label>
                    <input
                      type="number"
                      value={formData.min_order_amount}
                      onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.maxDiscount')}</label>
                    <input
                      type="number"
                      value={formData.max_discount}
                      onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.usageLimit')}</label>
                  <input
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.validFrom')}</label>
                    <input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.validUntil')}</label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 min-h-[44px]"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Issue Modal */}
        {showIssueModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">{t('marketing.issueCoupon')}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('marketing.issueType')}</label>
                    <div className="space-y-2">
                      <label className="flex items-center min-h-[44px]">
                        <input
                          type="radio"
                          checked={issueType === 'specific'}
                          onChange={() => setIssueType('specific')}
                          className="mr-2"
                        />
                        <span>{t('marketing.specificMembers')}</span>
                      </label>
                      <label className="flex items-center min-h-[44px]">
                        <input
                          type="radio"
                          checked={issueType === 'all'}
                          onChange={() => setIssueType('all')}
                          className="mr-2"
                        />
                        <span>{t('marketing.allMembers')}</span>
                      </label>
                    </div>
                  </div>

                  {issueType === 'specific' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('marketing.selectMembers')}</label>
                      {membersLoading ? (
                        <div className="text-center py-4">{t('common.loading')}</div>
                      ) : (
                        <div className="border rounded-lg max-h-48 overflow-y-auto">
                          {members.map(member => (
                            <label key={member.id} className="flex items-center px-3 py-2 hover:bg-gray-50 min-h-[44px]">
                              <input
                                type="checkbox"
                                checked={selectedMemberIds.includes(member.id)}
                                onChange={() => toggleMemberSelection(member.id)}
                                className="mr-2"
                              />
                              <span>{member.name || member.email}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-sm text-gray-500">
                        {t('marketing.selectedCount', { count: selectedMemberIds.length })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowIssueModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 min-h-[44px]"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSubmitIssue}
                    disabled={issueType === 'specific' && selectedMemberIds.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 min-h-[44px] disabled:opacity-50"
                  >
                    {t('marketing.issue')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Usage Drawer */}
        {showUsageDrawer && (
          <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
            <div className="bg-white w-full max-w-md h-full overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">{t('marketing.usageStatistics')}</h3>
                  <button
                    onClick={() => setShowUsageDrawer(false)}
                    className="p-2 hover:bg-gray-100 rounded min-h-[44px] min-w-[44px]"
                  >
                    ✕
                  </button>
                </div>

                {usageData ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-blue-600 mb-1">{t('marketing.issuedCount')}</div>
                        <div className="text-2xl font-bold">{usageData.issued_count}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-green-600 mb-1">{t('marketing.usedCount')}</div>
                        <div className="text-2xl font-bold">{usageData.used_count}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">{t('marketing.unusedCount')}</div>
                        <div className="text-2xl font-bold">{usageData.unused_count}</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-purple-600 mb-1">{t('marketing.conversionRate')}</div>
                        <div className="text-2xl font-bold">{usageData.conversion_rate.toFixed(1)}%</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">{t('marketing.recentUsage')}</h4>
                      {usageData.recent_usage.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">{t('marketing.noUsageRecords')}</div>
                      ) : (
                        <div className="space-y-2">
                          {usageData.recent_usage.map((record, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium">{record.member_name}</div>
                                <div className="text-sm text-gray-500">{new Date(record.used_at).toLocaleString()}</div>
                              </div>
                              <div className="text-sm text-gray-500">#{record.order_id}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">{t('common.loading')}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminAuthGuard>
  );
}
