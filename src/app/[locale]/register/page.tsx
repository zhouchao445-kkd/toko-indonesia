'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/useAuth';
import { apiFetch } from '@/lib/api-client';
import { isValidIndonesianPhone, isValidPassword, getPasswordStrength } from '@/lib/phone';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validatePhone = (value: string) => {
    if (value && !isValidIndonesianPhone(value)) {
      setPhoneError(t('register.phoneError'));
    } else {
      setPhoneError('');
    }
  };

  const validatePassword = (value: string) => {
    if (value && !isValidPassword(value)) {
      setPasswordError(t('register.passwordError'));
    } else {
      setPasswordError('');
    }
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

  const strengthColors: Record<string, string> = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidIndonesianPhone(phone)) {
      setPhoneError(t('register.phoneError'));
      return;
    }

    if (!isValidPassword(password)) {
      setPasswordError(t('register.passwordError'));
      return;
    }

    if (nickname.length > 50) {
      setError(t('register.nicknameTooLong'));
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
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ phone, password, nickname: nickname || undefined }),
      });

      if (data.success) {
        login(data.data.token, data.data.user);
        router.push('/member');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('register.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t('register.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('register.phone')}</label>
            <Input
              type="tel"
              placeholder="+6281234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => validatePhone(phone)}
              className="min-h-[44px]"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">{t('register.phoneHint')}</p>
            {phoneError && <p className="mt-1 text-sm text-red-600">{phoneError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('register.password')}</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => validatePassword(password)}
              className="min-h-[44px]"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">{t('register.passwordHint')}</p>
            {passwordStrength && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full transition-all ${strengthColors[passwordStrength]}`}
                    style={{ width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%' }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {t(`register.strength_${passwordStrength}` as 'register.strength_weak')}
                </span>
              </div>
            )}
            {passwordError && <p className="mt-1 text-sm text-red-600">{passwordError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('register.nickname')}</label>
            <Input
              type="text"
              placeholder={t('register.nicknamePlaceholder')}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={50}
              className="min-h-[44px]"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t('register.nicknameOptional')}</p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <Button
            type="submit"
            className="w-full min-h-[44px]"
            disabled={loading}
          >
            {loading ? t('register.submitting') : t('register.submit')}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t('register.hasAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            {t('register.goLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
