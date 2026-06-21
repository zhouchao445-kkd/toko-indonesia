'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UserCircle, MapPin, Package, Ticket, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/useAuth';
import { apiFetch } from '@/lib/api-client';
import { formatIDR } from '@/lib/api';

interface MemberProfile {
  phone: string;
  nickname: string | null;
  avatar: string | null;
  status: string;
  created_at: string;
  balance: string;
}

function MemberCenterContent() {
  const t = useTranslations('member');
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ success: boolean; data: MemberProfile }>('/api/users/me')
      .then((data) => {
        if (data.success) setProfile(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maskPhone = (phone: string) => {
    if (phone.length <= 7) return phone;
    return phone.slice(0, 4) + '****' + phone.slice(-4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Profile Card */}
      <div className="rounded-lg border bg-card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <UserCircle className="h-10 w-10 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{profile?.nickname || user?.nickname || maskPhone(profile?.phone || user?.phone || '')}</h2>
            <p className="text-sm text-muted-foreground">{maskPhone(profile?.phone || user?.phone || '')}</p>
          </div>
          <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => router.push('/member/profile')}>
            <Edit className="h-4 w-4 mr-1" />
            {t('center.edit')}
          </Button>
        </div>

        {/* Balance */}
        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-muted-foreground mb-1">{t('center.balance')}</p>
          <p className="text-3xl font-bold text-primary">{formatIDR(Number(profile?.balance || 0))}</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/member/profile" className="rounded-lg border bg-card p-4 text-center hover:bg-accent transition-colors min-h-[44px] flex flex-col items-center justify-center gap-2">
          <UserCircle className="h-8 w-8 text-primary" />
          <span className="text-sm font-medium">{t('center.profile')}</span>
        </Link>
        <Link href="/member/addresses" className="rounded-lg border bg-card p-4 text-center hover:bg-accent transition-colors min-h-[44px] flex flex-col items-center justify-center gap-2">
          <MapPin className="h-8 w-8 text-primary" />
          <span className="text-sm font-medium">{t('center.addresses')}</span>
        </Link>
        <Link href="/orders" className="rounded-lg border bg-card p-4 text-center hover:bg-accent transition-colors min-h-[44px] flex flex-col items-center justify-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          <span className="text-sm font-medium">{t('center.orders')}</span>
        </Link>
        <div className="rounded-lg border bg-card p-4 text-center opacity-50 min-h-[44px] flex flex-col items-center justify-center gap-2">
          <Ticket className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{t('center.coupons')}</span>
          <span className="text-xs text-muted-foreground">{t('center.comingSoon')}</span>
        </div>
      </div>
    </div>
  );
}

export default function MemberPage() {
  return (
    <AuthGuard>
      <MemberCenterContent />
    </AuthGuard>
  );
}
