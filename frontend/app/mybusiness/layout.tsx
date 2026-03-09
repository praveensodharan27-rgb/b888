'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BusinessWizardProvider } from '@/contexts/BusinessWizardContext';
import { useAuth } from '@/hooks/useAuth';

function MyBusinessAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?redirect=/mybusiness');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2563EB] border-t-transparent" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return null;
  }
  return <>{children}</>;
}

export default function MyBusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BusinessWizardProvider>
      <MyBusinessAuthGuard>{children}</MyBusinessAuthGuard>
    </BusinessWizardProvider>
  );
}
