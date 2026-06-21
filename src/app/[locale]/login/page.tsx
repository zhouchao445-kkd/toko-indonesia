'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/useAuth';
import { apiFetch } from '@/lib/api-client';
import { isValidIndonesianPhone } from '@/lib/phone';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const validatePhone = (value: string) => {
    if (value && !isValidIndonesianPhone(value)) {
      setPhoneError(t('login.phoneError'));
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidIndonesianPhone(phone)) {
      setPhoneError(t('login.phoneError'));
      return;
    }

    if (!password) {
      setError(t('login.passwordRequired'));
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{
        success: boolean;
        data: {
          token: string;
          user: { id: string; phone: string; nickname: string | null; avatar: string | null; role: string };
        };
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });

      if (data.success) {
        login(data.data.token, data.data.user);
        router.push('/member');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('login.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t('login.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('login.phone')}</label>
            <Input
              type="tel"
              placeholder="+6281234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => validatePhone(phone)}
              className="min-h-[44px]"
              required
            />
            {phoneError && <p className="mt-1 text-sm text-red-600">{phoneError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('login.password')}</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[44px]"
              required
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <Button
            type="submit"
            className="w-full min-h-[44px]"
            disabled={loading}
          >
            {loading ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t('login.noAccount')}{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            {t('login.goRegister')}
          </Link>
        </p>
      </div>
    </div>
  );
}
