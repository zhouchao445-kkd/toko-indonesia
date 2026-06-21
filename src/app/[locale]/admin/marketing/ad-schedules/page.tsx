'use client';

import { useTranslations } from 'next-intl';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { adminApi } from '@/lib/adminApi';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface AdSchedule {
  id: string;
  banner_id: string | null;
  popup_id: string | null;
  start_time: string;
  end_time: string;
  target_pages: string[];
  status: string;
  created_at: string;
}

export default function AdminAdSchedulesPage() {
  const t = useTranslations('admin');
  const { hasPermission } = useAdminAuth();

  const [schedules, setSchedules] = useState<AdSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<AdSchedule | null>(null);

  const [formData, setFormData] = useState({
    banner_id: '',
    popup_id: '',
    start_time: '',
    end_time: '',
    target_pages: [] as string[],
    status: 'active',
  });

  const targetPageOptions = ['home', 'products', 'product_detail'];

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.get<{ schedules: AdSchedule[] }>('/ad-schedules');
      setSchedules(data.schedules || []);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreate = () => {
    setEditingSchedule(null);
    setFormData({ banner_id: '', popup_id: '', start_time: '', end_time: '', target_pages: [], status: 'active' });
    setShowForm(true);
  };

  const handleEdit = (schedule: AdSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      banner_id: schedule.banner_id || '',
      popup_id: schedule.popup_id || '',
      start_time: schedule.start_time ? schedule.start_time.split('T')[0] : '',
      end_time: schedule.end_time ? schedule.end_time.split('T')[0] : '',
      target_pages: schedule.target_pages || [],
      status: schedule.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        banner_id: formData.banner_id || null,
        popup_id: formData.popup_id || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        target_pages: formData.target_pages,
        status: formData.status,
      };

      if (editingSchedule) {
        await adminApi.put(`/ad-schedules/${editingSchedule.id}`, payload);
      } else {
        await adminApi.post('/ad-schedules', payload);
      }

      setShowForm(false);
      fetchSchedules();
    } catch (err) {
      console.error('Failed to save schedule:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('marketing.confirmDelete'))) return;
    try {
      await adminApi.delete(`/ad-schedules/${id}`);
      fetchSchedules();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
  };

  const toggleTargetPage = (page: string) => {
    setFormData(prev => ({
      ...prev,
      target_pages: prev.target_pages.includes(page)
        ? prev.target_pages.filter(p => p !== page)
        : [...prev.target_pages, page],
    }));
  };

  const canEdit = hasPermission('marketing.can_edit');
  const canDelete = hasPermission('marketing.can_delete');
  const canCreate = hasPermission('marketing.can_create');

  return (
    <AdminAuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('marketing.adSchedules')}</h1>
            <p className="text-gray-600 mt-1">{t('marketing.adSchedulesDesc')}</p>
          </div>
          {canCreate && (
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]">
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
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('marketing.scheduleType')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('marketing.timePeriod')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('marketing.targetPages')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.status')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">{t('common.loading')}</td></tr>
                ) : schedules.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">{t('common.noData')}</td></tr>
                ) : (
                  schedules.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {schedule.banner_id ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{t('marketing.banner')}</span>
                        ) : (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{t('marketing.popup')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {new Date(schedule.start_time).toLocaleDateString()} ~ {new Date(schedule.end_time).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(schedule.target_pages || []).map(page => (
                            <span key={page} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{page}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${schedule.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {schedule.status === 'active' ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button onClick={() => handleEdit(schedule)} className="p-2 hover:bg-blue-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(schedule.id)} className="p-2 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
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
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">
                {editingSchedule ? t('marketing.editSchedule') : t('marketing.createSchedule')}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.bannerId')}</label>
                    <input type="text" value={formData.banner_id} onChange={(e) => setFormData({ ...formData, banner_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]" placeholder="UUID" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.popupId')}</label>
                    <input type="text" value={formData.popup_id} onChange={(e) => setFormData({ ...formData, popup_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]" placeholder="UUID" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.startTime')}</label>
                    <input type="date" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.endTime')}</label>
                    <input type="date" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('marketing.targetPages')}</label>
                  <div className="flex flex-wrap gap-2">
                    {targetPageOptions.map(page => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => toggleTargetPage(page)}
                        className={`px-3 py-1.5 rounded text-sm min-h-[44px] ${formData.target_pages.includes(page) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.status')}</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]">
                    <option value="active">{t('common.active')}</option>
                    <option value="inactive">{t('common.inactive')}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 min-h-[44px]">{t('common.cancel')}</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]">{t('common.save')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminAuthGuard>
  );
}
