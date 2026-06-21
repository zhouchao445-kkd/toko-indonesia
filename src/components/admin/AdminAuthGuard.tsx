/**
 * AdminAuthGuard component
 * Protects admin routes from unauthorized access
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';

interface AdminAuthGuardProps {
  children: React.ReactNode;
  requirePermission?: string;
  requireRole?: string;
}

export function AdminAuthGuard({
  children,
  requirePermission,
  requireRole,
}: AdminAuthGuardProps) {
  const router = useRouter();
  const { isLoggedIn, isLoading, hasPermission, hasRole } = useAdminAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn) {
      router.push('/admin/login');
      return;
    }

    // Check permission if required
    if (requirePermission && !hasPermission(requirePermission)) {
      router.push('/admin');
      return;
    }

    // Check role if required
    if (requireRole && !hasRole(requireRole)) {
      router.push('/admin');
      return;
    }
  }, [isLoading, isLoggedIn, requirePermission, requireRole, hasPermission, hasRole, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in or missing permissions
  if (!isLoggedIn) {
    return null;
  }

  if (requirePermission && !hasPermission(requirePermission)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (requireRole && !hasRole(requireRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don't have the required role to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
