'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireRole?: string[];
}

export function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const router = useRouter();
  const { user, isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/id/login');
    }
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoading && user && requireRole && requireRole.length > 0) {
      if (!requireRole.includes(user.role)) {
        router.push('/id/login');
      }
    }
  }, [isLoading, user, requireRole, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  if (requireRole && user && !requireRole.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
