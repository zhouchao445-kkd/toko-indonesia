'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { adminApi } from '@/lib/adminApi';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Save } from 'lucide-react';

interface ShippingMethod {
  id: number;
  name: string;
  code: string;
  fee: string;
  estimated_days: string;
  status: string;
}

export default function AdminShippingMethodsPage() {
  const t = useTranslations('admin');
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    fee: '',
    estimated_days: '',
    status: 'active',
  });

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    setLoading(true);
    try {
      const data = await adminApi.get('/api/admin/shipping-methods') as { methods: ShippingMethod[] };
      setMethods(data.methods || []);
    } catch (err) {
      console.error('Failed to load shipping methods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        fee: parseFloat(formData.fee) || 0,
      };

      if (editingId) {
        await adminApi.put(`/api/admin/shipping-methods/${editingId}`, payload);
      } else {
        await adminApi.post('/api/admin/shipping-methods', payload);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', code: '', fee: '', estimated_days: '', status: 'active' });
      loadMethods();
    } catch (err) {
      console.error('Failed to save shipping method:', err);
      alert(t('shipping.saveError'));
    }
  };

  const handleEdit = (method: ShippingMethod) => {
    setEditingId(method.id);
    setFormData({
      name: method.name,
      code: method.code,
      fee: method.fee,
      estimated_days: method.estimated_days || '',
      status: method.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('shipping.confirmDelete'))) return;

    try {
      await adminApi.delete(`/api/admin/shipping-methods/${id}`);
      loadMethods();
    } catch (err) {
      console.error('Failed to delete shipping method:', err);
      alert(t('shipping.deleteError'));
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', code: '', fee: '', estimated_days: '', status: 'active' });
  };

  return (
    <AdminAuthGuard requirePermission="shipping:view">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('shipping.title')}</h1>
          <Button onClick={() => setShowForm(true)} className="min-h-[44px]">
            <Plus className="h-4 w-4 mr-2" />
            {t('shipping.add')}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? t('shipping.edit') : t('shipping.add')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('shipping.name')} *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="JNE Regular"
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('shipping.code')} *
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    placeholder="jne_regular"
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('shipping.fee')} *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                    required
                    placeholder="15000"
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('shipping.estimatedDays')}
                  </label>
                  <Input
                    value={formData.estimated_days}
                    onChange={(e) => setFormData({ ...formData, estimated_days: e.target.value })}
                    placeholder="3-5 hari"
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('shipping.status')}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[44px]"
                  >
                    <option value="active">{t('shipping.status.active')}</option>
                    <option value="inactive">{t('shipping.status.inactive')}</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3">
                <Button type="button" variant="outline" onClick={handleCancel} className="min-h-[44px]">
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="min-h-[44px]">
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Methods list */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>
          ) : methods.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{t('shipping.empty')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('shipping.name')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('shipping.code')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('shipping.fee')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('shipping.estimatedDays')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('shipping.status')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      {t('shipping.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {methods.map((method) => (
                    <tr key={method.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{method.name}</td>
                      <td className="px-4 py-3 text-gray-600">{method.code}</td>
                      <td className="px-4 py-3 text-gray-900">Rp {method.fee}</td>
                      <td className="px-4 py-3 text-gray-600">{method.estimated_days || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            method.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {t(`shipping.status.${method.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(method)}
                            className="min-h-[44px] min-w-[44px]"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(method.id)}
                            className="text-red-600 hover:text-red-700 min-h-[44px] min-w-[44px]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminAuthGuard>
  );
}
