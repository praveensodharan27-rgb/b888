import { getQueryClient } from '@/lib/queryClient';
import api from '@/lib/api';

/**
 * Utility function to clear all application cache
 * This clears:
 * - React Query cache (all queries)
 * - localStorage items used by the app
 * - Backend server cache (optional)
 */
export const clearAllCache = async (clearBackendCache = false) => {
  if (typeof window === 'undefined') return;

  try {
    // 1. Clear React Query cache
    const queryClient = getQueryClient();
    queryClient.clear(); // Clear all cached queries
    queryClient.invalidateQueries(); // Invalidate all queries to force refetch
    console.log('✅ React Query cache cleared');

    // 2. Clear localStorage items
    const keysToRemove = [
      'userLocation',
      'locationPermission',
      'recentSearches',
      'sellit_comparison_items',
      'splash_screen_shown',
      'authQuotes', // Session auth quotes
      // Add any other localStorage keys you use
    ];

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
        console.log(`✅ Cleared localStorage: ${key}`);
      } catch (error) {
        console.error(`❌ Error clearing ${key}:`, error);
      }
    });

    // 3. Clear backend cache (optional)
    if (clearBackendCache) {
      try {
        await api.post('/admin/cache/clear');
        console.log('✅ Backend cache cleared');
      } catch (error) {
        console.warn('⚠️ Could not clear backend cache (may require admin auth):', error);
      }
    }

    console.log('✅ All cache cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return false;
  }
};

/**
 * Clear only location-related cache
 */
export const clearLocationCache = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('userLocation');
  localStorage.removeItem('locationPermission');
  console.log('Location cache cleared');
};

/**
 * Clear only search-related cache
 */
export const clearSearchCache = () => {
  if (typeof window === 'undefined') return;

  const queryClient = getQueryClient();
  queryClient.invalidateQueries({ queryKey: ['search'] });
  queryClient.invalidateQueries({ queryKey: ['search-autocomplete'] });
  queryClient.invalidateQueries({ queryKey: ['popular-searches'] });
  localStorage.removeItem('recentSearches');
  console.log('✅ Search cache cleared');
};

/**
 * Clear only React Query cache (without localStorage)
 */
export const clearReactQueryCache = () => {
  if (typeof window === 'undefined') return;

  const queryClient = getQueryClient();
  queryClient.clear();
  queryClient.invalidateQueries();
  console.log('✅ React Query cache cleared');
};

/**
 * Clear backend cache only (requires admin auth)
 */
export const clearBackendCache = async () => {
  try {
    await api.post('/admin/cache/clear');
    console.log('✅ Backend cache cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing backend cache:', error);
    return false;
  }
};

