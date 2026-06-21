'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { adminApi } from '@/lib/adminApi';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';

interface Setting {
  key: string;
  value: string;
  description?: string;
}

export default function AdminSettingsPage() {
  const t = useTranslations('admin');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await adminApi.get('/api/admin/settings') as { settings: Setting[] };
      const settingsList = data.settings || [];
      setSettings(settingsList);
      
      const initialFormData: Record<string, string> = {};
      settingsList.forEach((setting: Setting) => {
        initialFormData[setting.key] = setting.value;
      });
      setFormData(initialFormData);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const items = Object.entries(formData).map(([key, value]) => ({ key, value }));
      await adminApi.put('/api/admin/settings', { items });
      alert(t('settings.saveSuccess'));
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert(t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <AdminAuthGuard requirePermission="settings:edit">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Site Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.siteInfo')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.siteName')}
                </label>
                <Input
                  value={formData.site_name || ''}
                  onChange={(e) => handleChange('site_name', e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.siteLogo')}
                </label>
                <Input
                  value={formData.site_logo || ''}
                  onChange={(e) => handleChange('site_logo', e.target.value)}
                  placeholder="https://..."
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.workHours')}
                </label>
                <Input
                  value={formData.work_hours || ''}
                  onChange={(e) => handleChange('work_hours', e.target.value)}
                  placeholder="Senin - Jumat, 09:00 - 18:00"
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.customerService')}
                </label>
                <Input
                  value={formData.customer_service || ''}
                  onChange={(e) => handleChange('customer_service', e.target.value)}
                  placeholder="https://wa.me/..."
                  className="min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Bank Accounts */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.bankAccounts')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.bankAccounts')}
                </label>
                <textarea
                  value={formData.bank_accounts || ''}
                  onChange={(e) => handleChange('bank_accounts', e.target.value)}
                  rows={6}
                  placeholder='[{"bank_name":"BCA","account_number":"1234567890","account_holder":"TokoKu"}]'
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm min-h-[44px]"
                />
                <p className="mt-1 text-xs text-gray-500">{t('settings.bankAccountsHint')}</p>
              </div>
            </div>
          </div>

          {/* Other Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.otherSettings')}</h2>
            <div className="space-y-4">
              {settings
                .filter(
                  (s) =>
                    !['site_name', 'site_logo', 'work_hours', 'customer_service', 'bank_accounts'].includes(
                      s.key
                    )
                )
                .map((setting) => (
                  <div key={setting.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {setting.key}
                    </label>
                    <Input
                      value={formData[setting.key] || ''}
                      onChange={(e) => handleChange(setting.key, e.target.value)}
                      className="min-h-[44px]"
                    />
                    {setting.description && (
                      <p className="mt-1 text-xs text-gray-500">{setting.description}</p>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end">
            <Button type="submit" disabled={saving} className="min-h-[44px]">
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </AdminAuthGuard>
  );
}
