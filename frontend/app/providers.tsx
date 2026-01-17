'use client';

import { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ProfileCacheProvider } from '@/contexts/ProfileCacheContext';
import dynamic from 'next/dynamic';

// Dynamically import FirebaseProvider with error handling to avoid webpack issues
// Wrapped in Suspense to prevent bailout warnings in Next.js 15
const FirebaseProvider = dynamic(
  () => import('@/components/FirebaseProvider').catch((error) => {
    console.warn('FirebaseProvider failed to load:', error);
    // Return a fallback component that just renders children
    return { default: ({ children }: { children: React.ReactNode }) => <>{children}</> };
  }),
  {
    ssr: false,
    loading: () => null // Don't show loading state
  }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileCacheProvider>
        <Suspense fallback={<>{children}</>}>
          <FirebaseProvider>
            {children}
          </FirebaseProvider>
        </Suspense>
      </ProfileCacheProvider>
    </QueryClientProvider>
  );
}

