'use client';

import { Suspense, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ProfileCacheProvider } from '@/contexts/ProfileCacheContext';
import dynamic from 'next/dynamic';
import { clearAllCache, clearReactQueryCache, clearBackendCache } from '@/utils/clearCache';

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
  // Expose cache clearing functions to window for console access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).clearCache = async (includeBackend = false) => {
        return await clearAllCache(includeBackend);
      };
      (window as any).clearReactQueryCache = clearReactQueryCache;
      (window as any).clearBackendCache = clearBackendCache;
      console.log('💾 Cache utilities available:');
      console.log('  - window.clearCache(true/false) - Clear all cache (optionally include backend)');
      console.log('  - window.clearReactQueryCache() - Clear React Query cache only');
      console.log('  - window.clearBackendCache() - Clear backend cache only');
    }
  }, []);

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

