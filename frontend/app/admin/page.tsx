'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading || !isAdmin) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return <AdminDashboard />;
}

