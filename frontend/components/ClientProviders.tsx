'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import FirebaseProvider from '@/components/FirebaseProvider';
import { ProfileCacheProvider } from '@/contexts/ProfileCacheContext';
import { SpecsLayoutProvider } from '@/contexts/SpecsLayoutContext';
import { queryClient } from '@/lib/queryClient';
import { clearAllCache } from '@/utils/clearCache';

/**
 * Client-only providers: React Query, Firebase, ProfileCache, SpecsLayout.
 * Use only on client side – wrap app shell in root layout.
 * Root layout remains pure Server Component; this is the single client boundary.
 */
export function ClientProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as Window & { clearReactQueryCache?: () => void }).clearReactQueryCache = () => {
      queryClient.clear();
      console.log('✅ React Query cache cleared');
    };
    (window as Window & { clearCache?: (includeBackend?: boolean) => void }).clearCache = (
      includeBackend = false
    ) => {
      clearAllCache(includeBackend).then(() => {
        queryClient.clear();
        console.log(
          '✅ Cache cleared (localStorage, sessionStorage, React Query' +
            (includeBackend ? ', backend' : '') +
            ')'
        );
      });
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ProfileCacheProvider>
        <SpecsLayoutProvider>
          <FirebaseProvider>{children}</FirebaseProvider>
        </SpecsLayoutProvider>
      </ProfileCacheProvider>
    </QueryClientProvider>
  );
}
