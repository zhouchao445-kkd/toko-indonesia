'use client';

import { useTranslations } from 'next-intl';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { adminApi } from '@/lib/adminApi';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Upload, Eye } from 'lucide-react';

interface Popup {
  id: string;
  image_url: string;
  link_url: string | null;
  frequency: string;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

export default function AdminPopupsPage() {
  const t = useTranslations('admin');
  const { hasPermission } = useAdminAuth();

  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState<Popup | null>(null);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    image_url: '',
    link_url: '',
    frequency: 'daily',
    status: 'active',
    valid_from: '',
    valid_until: '',
  });

  const fetchPopups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.get<{ popups: Popup[] }>('/popups');
      setPopups(data.popups || []);
    } catch (err) {
      console.error('Failed to fetch popups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPopups();
  }, [fetchPopups]);

  const handleCreate = () => {
    setEditingPopup(null);
    setFormData({ image_url: '', link_url: '', frequency: 'daily', status: 'active', valid_from: '', valid_until: '' });
    setShowForm(true);
  };

  const handleEdit = (popup: Popup) => {
    setEditingPopup(popup);
    setFormData({
      image_url: popup.image_url,
      link_url: popup.link_url || '',
      frequency: popup.frequency,
      status: popup.status,
      valid_from: popup.valid_from ? popup.valid_from.split('T')[0] : '',
      valid_until: popup.valid_until ? popup.valid_until.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const data = await adminApi.upload<{ url: string }>('/upload', uploadData);
      setFormData({ ...formData, image_url: data.url });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        image_url: formData.image_url,
        link_url: formData.link_url || null,
        frequency: formData.frequency,
        status: formData.status,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
      };

      if (editingPopup) {
        await adminApi.put(`/popups/${editingPopup.id}`, payload);
      } else {
        await adminApi.post('/popups', payload);
      }

      setShowForm(false);
      fetchPopups();
    } catch (err) {
      console.error('Failed to save popup:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('marketing.confirmDelete'))) return;
    try {
      await adminApi.delete(`/popups/${id}`);
      fetchPopups();
    } catch (err) {
      console.error('Failed to delete popup:', err);
    }
  };

  const canEdit = hasPermission('marketing.can_edit');
  const canDelete = hasPermission('marketing.can_delete');
  const canCreate = hasPermission('marketing.can_create');

  const frequencyLabel = (f: string) => {
    switch (f) {
      case 'daily': return t('marketing.frequencyDaily');
      case 'once': return t('marketing.frequencyOnce');
      case 'always': return t('marketing.frequencyAlways');
      default: return f;
    }
  };

  return (
    <AdminAuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('marketing.popups')}</h1>
            <p className="text-gray-600 mt-1">{t('marketing.popupsDesc')}</p>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('marketing.preview')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('marketing.frequency')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('marketing.validPeriod')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{t('common.status')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">{t('common.loading')}</td></tr>
                ) : popups.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">{t('common.noData')}</td></tr>
                ) : (
                  popups.map((popup) => (
                    <tr key={popup.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="w-16 h-10 bg-gray-100 rounded overflow-hidden">
                          {popup.image_url ? (
                            <img src={popup.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">—</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{frequencyLabel(popup.frequency)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {popup.valid_from ? new Date(popup.valid_from).toLocaleDateString() : '—'}
                        {' ~ '}
                        {popup.valid_until ? new Date(popup.valid_until).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${popup.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {popup.status === 'active' ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setShowPreview(popup)} className="p-2 hover:bg-gray-100 rounded min-h-[44px] min-w-[44px] flex items-center justify-center" title={t('marketing.preview')}>
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          {canEdit && (
                            <button onClick={() => handleEdit(popup)} className="p-2 hover:bg-blue-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(popup.id)} className="p-2 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
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

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(null)}>
            <div className="bg-white rounded-xl p-4 max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="aspect-[3/4] bg-gray-100 rounded overflow-hidden mb-4">
                {showPreview.image_url ? (
                  <img src={showPreview.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                )}
              </div>
              <div className="text-center text-sm text-gray-500">
                {frequencyLabel(showPreview.frequency)} · {showPreview.status}
              </div>
              <button onClick={() => setShowPreview(null)} className="w-full mt-4 px-4 py-2 border rounded-lg hover:bg-gray-50 min-h-[44px]">
                {t('common.close')}
              </button>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">
                {editingPopup ? t('marketing.editPopup') : t('marketing.createPopup')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.image')}</label>
                  <div className="flex items-center gap-4">
                    {formData.image_url && (
                      <img src={formData.image_url} alt="" className="w-24 h-32 object-cover rounded" />
                    )}
                    <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 min-h-[44px]">
                      <Upload className="w-4 h-4" />
                      {t('common.upload')}
                      <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                    </label>
                    {uploading && <span className="text-sm text-gray-500">{t('common.uploading')}</span>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.linkUrl')}</label>
                  <input type="text" value={formData.link_url} onChange={(e) => setFormData({ ...formData, link_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]" placeholder="https://..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.frequency')}</label>
                  <select value={formData.frequency} onChange={(e) => setFormData({ ...formData, frequency: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]">
                    <option value="daily">{t('marketing.frequencyDaily')}</option>
                    <option value="once">{t('marketing.frequencyOnce')}</option>
                    <option value="always">{t('marketing.frequencyAlways')}</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.validFrom')}</label>
                    <input type="date" value={formData.valid_from} onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.validUntil')}</label>
                    <input type="date" value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} className="w-full px-3 py-2 border rounded-lg min-h-[44px]" />
                  </div>
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
