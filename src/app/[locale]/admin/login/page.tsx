'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { adminApi } from '@/lib/adminApi';
import { adminStorage } from '@/lib/adminStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const t = useTranslations('admin');
  const router = useRouter();
  const { login } = useAdminAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await adminApi.post('/api/admin/login', {
        username: formData.username,
        password: formData.password,
      }) as { token: string; admin: { id: string; username: string; nickname?: string; role: string; roles: string[]; permissions: string[] } };

      // Store token and admin info
      adminStorage.setToken(data.token);
      adminStorage.setUser(data.admin);

      // Update auth context
      login(data.token, data.admin);

      // Redirect to dashboard
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Settings className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('login.title')}</h1>
          <p className="text-gray-600 mt-2">{t('login.subtitle')}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.username')}
              </label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder={t('login.usernamePlaceholder')}
                required
                className="min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.password')}
              </label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('login.passwordPlaceholder')}
                required
                className="min-h-[44px]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px]"
            >
              {loading ? t('login.logging') : t('login.submit')}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>{t('login.securityNotice')}</p>
        </div>
      </div>
    </div>
  );
}
