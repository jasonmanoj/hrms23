'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function Guard({ children, requireAdmin }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, loading, isAdminRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (requireAdmin && !isAdminRole) {
      router.replace('/portal');
    }
  }, [user, loading, isAdminRole, requireAdmin, router]);

  if (loading || !user || (requireAdmin && !isAdminRole)) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>;
  }

  return <>{children}</>;
}
