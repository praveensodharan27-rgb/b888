'use client';

import { QueryClient } from '@tanstack/react-query';

/**
 * React Query Client Configuration
 * Optimized for performance and better state management
 * Using singleton pattern to prevent multiple instances
 */
let queryClientInstance: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 1 minute (increased for better performance)
        staleTime: 60 * 1000,
        // Cache data for 10 minutes (increased for better performance)
        gcTime: 10 * 60 * 1000,
        // Don't refetch on window focus (reduces unnecessary requests)
        refetchOnWindowFocus: false,
        // Retry only once on failure
        retry: 1,
        // Don't refetch on reconnect immediately
        refetchOnReconnect: false,
        // Don't refetch on mount if data is fresh
        refetchOnMount: false,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  });
}

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  }
  
  // Browser: use singleton pattern to keep the same query client
  if (!queryClientInstance) {
    queryClientInstance = makeQueryClient();
  }
  
  return queryClientInstance;
}

export const queryClient = getQueryClient();
