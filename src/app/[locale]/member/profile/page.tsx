'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/useAuth';
import { apiFetch } from '@/lib/api-client';

interface UserProfile {
  nickname: string | null;
  avatar: string | null;
}

function ProfileContent() {
  const t = useTranslations('member');
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ success: boolean; data: UserProfile }>('/api/users/me')
      .then((data) => {
        if (data.success) {
          setNickname(data.data.nickname || '');
          setAvatar(data.data.avatar || '');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const data = await apiFetch<{ success: boolean }>('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ nickname, avatar: avatar || null }),
      });

      if (data.success) {
        setSuccess(true);
        refreshUser();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">{t('profile.title')}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('profile.nickname')}</label>
          <Input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={50}
            className="min-h-[44px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('profile.avatar')}</label>
          <Input
            type="url"
            placeholder="https://example.com/avatar.jpg"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            className="min-h-[44px]"
          />
          <p className="mt-1 text-xs text-muted-foreground">{t('profile.avatarHint')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('profile.phone')}</label>
          <Input
            type="tel"
            value={user?.phone || ''}
            disabled
            className="min-h-[44px] bg-muted"
          />
          <p className="mt-1 text-xs text-muted-foreground">{t('profile.phoneReadonly')}</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">{t('profile.saved')}</div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => router.back()}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" className="min-h-[44px] flex-1" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
