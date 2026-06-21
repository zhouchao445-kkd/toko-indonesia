'use client';

import { useTranslations } from 'next-intl';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { adminApi } from '@/lib/adminApi';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Upload, Eye, EyeOff } from 'lucide-react';

interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

export default function AdminBannersPage() {
  const t = useTranslations('admin');
  const { hasPermission } = useAdminAuth();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    image_url: '',
    link_url: '',
    sort_order: '0',
    status: 'active',
    valid_from: '',
    valid_until: '',
  });

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.get<{ banners: Banner[] }>('/banners');
      setBanners(data.banners || []);
    } catch (err) {
      console.error('Failed to fetch banners:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleCreate = () => {
    setEditingBanner(null);
    setFormData({ image_url: '', link_url: '', sort_order: '0', status: 'active', valid_from: '', valid_until: '' });
    setShowForm(true);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      image_url: banner.image_url,
      link_url: banner.link_url || '',
      sort_order: String(banner.sort_order),
      status: banner.status,
      valid_from: banner.valid_from ? banner.valid_from.split('T')[0] : '',
      valid_until: banner.valid_until ? banner.valid_until.split('T')[0] : '',
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
        sort_order: parseInt(formData.sort_order) || 0,
        status: formData.status,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
      };

      if (editingBanner) {
        await adminApi.put(`/banners/${editingBanner.id}`, payload);
      } else {
        await adminApi.post('/banners', payload);
      }

      setShowForm(false);
      fetchBanners();
    } catch (err) {
      console.error('Failed to save banner:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('marketing.confirmDelete'))) return;
    try {
      await adminApi.delete(`/banners/${id}`);
      fetchBanners();
    } catch (err) {
      console.error('Failed to delete banner:', err);
    }
  };

  const handleToggleStatus = async (banner: Banner) => {
    try {
      await adminApi.put(`/banners/${banner.id}`, {
        ...banner,
        status: banner.status === 'active' ? 'inactive' : 'active',
      });
      fetchBanners();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const canEdit = hasPermission('marketing.can_edit');
  const canDelete = hasPermission('marketing.can_delete');
  const canCreate = hasPermission('marketing.can_create');

  return (
    <AdminAuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('marketing.banners')}</h1>
            <p className="text-gray-600 mt-1">{t('marketing.bannersDesc')}</p>
          </div>
          {canCreate && (
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]">
              <Plus className="w-4 h-4" />
              {t('common.create')}
            </button>
          )}
        </div>

        {/* Grid View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8 text-gray-500">{t('common.loading')}</div>
          ) : banners.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">{t('common.noData')}</div>
          ) : (
            banners.map((banner) => (
              <div key={banner.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="aspect-video bg-gray-100 relative">
                  {banner.image_url ? (
                    <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs ${banner.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {banner.status === 'active' ? t('common.active') : t('common.inactive')}
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">#{banner.sort_order}</span>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button onClick={() => handleToggleStatus(banner)} className="p-2 hover:bg-gray-100 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                          {banner.status === 'active' ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => handleEdit(banner)} className="p-2 hover:bg-blue-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(banner.id)} className="p-2 hover:bg-red-50 rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                  {banner.link_url && (
                    <p className="text-xs text-gray-400 truncate mt-1">{banner.link_url}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">
                {editingBanner ? t('marketing.editBanner') : t('marketing.createBanner')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.image')}</label>
                  <div className="flex items-center gap-4">
                    {formData.image_url && (
                      <img src={formData.image_url} alt="" className="w-32 h-20 object-cover rounded" />
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
                  <input
                    type="text"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg min-h-[44px]"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('marketing.sortOrder')}</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.status')}</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg min-h-[44px]"
                    >
                      <option value="active">{t('common.active')}</option>
                      <option value="inactive">{t('common.inactive')}</option>
                    </select>
                  </div>
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
