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
        // Suppress expected errors from being logged
        // Individual queries can override this with throwOnError: false
        throwOnError: (error: any) => {
          // Don't throw expected errors (400, 404, etc.) that are handled gracefully
          // These are handled gracefully in queryFn
          const status = error?.response?.status;
          const url = error?.config?.url || '';
          const errorMessage = error?.response?.data?.message || '';
          
          // Suppress 404 errors for neighborhoods (may not exist for all states)
          if (status === 404 && url.includes('/locations/neighborhoods')) {
            return false; // Don't throw, let queryFn handle it
          }
          
          // Suppress geocoding API key errors (backend config issue, frontend handles gracefully)
          if (status === 400 && url.includes('/geocoding/') && 
              (errorMessage.includes('referrer restrictions') || 
               errorMessage.includes('referer restrictions') ||
               errorMessage.includes('API key'))) {
            return false; // Don't throw, let queryFn handle it
          }
          
          // Suppress empty 400 responses (handled in interceptor)
          if (status === 400) {
            const errorData = error?.response?.data || {};
            const hasKeys = errorData && typeof errorData === 'object' && Object.keys(errorData).length > 0;
            const hasMessage = hasKeys && (errorData.message || errorData.error);
            const hasValidationErrors = hasKeys && Array.isArray(errorData.errors) && errorData.errors.length > 0;
            
            // If it's an empty response, don't throw (handled gracefully)
            if (!hasMessage && !hasValidationErrors) {
              return false;
            }
          }
          
          // For other errors, use default behavior (throw)
          return true;
        },
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
    // Suppress console errors for expected failures
    logger: {
      log: (...args) => {
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log(...args);
        }
      },
      warn: (...args) => {
        // Only warn in development
        if (process.env.NODE_ENV === 'development') {
          console.warn(...args);
        }
      },
      error: (error: any) => {
        // Suppress expected errors from React Query
        const status = error?.response?.status;
        const url = error?.config?.url || '';
        const errorMessage = error?.response?.data?.message || '';
        
        // Don't log 404 errors for neighborhoods (may not exist for all states)
        if (status === 404 && url.includes('/locations/neighborhoods')) {
          // Suppress - handled gracefully in queryFn
          return;
        }
        
        // Don't log geocoding API key errors (backend config issue)
        if (status === 400 && url.includes('/geocoding/') && 
            (errorMessage.includes('referrer restrictions') || 
             errorMessage.includes('referer restrictions') ||
             errorMessage.includes('API key'))) {
          // Suppress - handled gracefully in queryFn
          return;
        }
        
        // Don't log empty 400 responses
        if (status === 400) {
          const errorData = error?.response?.data || {};
          const hasKeys = errorData && typeof errorData === 'object' && Object.keys(errorData).length > 0;
          const hasMessage = hasKeys && (errorData.message || errorData.error);
          const hasValidationErrors = hasKeys && Array.isArray(errorData.errors) && errorData.errors.length > 0;
          
          if (!hasMessage && !hasValidationErrors) {
            // Empty response - suppress logging
            return;
          }
        }
        
        // Log other errors normally
        console.error(error);
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
