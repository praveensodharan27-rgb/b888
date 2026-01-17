/**
 * Utility function to clear all application cache
 * This clears:
 * - localStorage items used by the app
 * - React Query cache (if needed)
 */

export const clearAllCache = () => {
  if (typeof window === 'undefined') return;

  // Clear localStorage items
  const keysToRemove = [
    'userLocation',
    'locationPermission',
    'recentSearches',
    'sellit_comparison_items',
    'splash_screen_shown',
    // Add any other localStorage keys you use
  ];

  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
      console.log(`Cleared localStorage: ${key}`);
    } catch (error) {
      console.error(`Error clearing ${key}:`, error);
    }
  });

  // Clear all localStorage (uncomment if you want to clear everything)
  // localStorage.clear();

  console.log('All cache cleared successfully');
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

  localStorage.removeItem('recentSearches');
  console.log('Search cache cleared');
};

