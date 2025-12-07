'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ProfileCacheProvider } from '@/contexts/ProfileCacheContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileCacheProvider>
        {children}
      </ProfileCacheProvider>
    </QueryClientProvider>
  );
}

