/**
 * Search Personalization Hook
 * 
 * Stores and retrieves user search history for personalization:
 * - Last searched category
 * - Location preferences
 * - Search frequency
 */

import { useState, useEffect } from 'react';

const LAST_CATEGORY_KEY = 'lastSearchedCategory';
const LAST_LOCATION_KEY = 'lastSearchedLocation';
const SEARCH_HISTORY_KEY = 'searchHistory';
const MAX_HISTORY = 10;

interface SearchHistoryItem {
  keyword: string;
  category?: string;
  location?: string;
  timestamp: number;
}

export function useSearchPersonalization() {
  const [lastCategory, setLastCategory] = useState<string | null>(null);
  const [lastLocation, setLastLocation] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedCategory = localStorage.getItem(LAST_CATEGORY_KEY);
      const storedLocation = localStorage.getItem(LAST_LOCATION_KEY);
      const storedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);

      if (storedCategory) {
        setLastCategory(storedCategory);
      }

      if (storedLocation) {
        setLastLocation(storedLocation);
      }

      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        setSearchHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Error loading search personalization:', error);
    }
  }, []);

  /**
   * Store last searched category
   */
  const storeLastCategory = (category: string | null) => {
    if (typeof window === 'undefined') return;

    try {
      if (category) {
        localStorage.setItem(LAST_CATEGORY_KEY, category);
        setLastCategory(category);
      } else {
        localStorage.removeItem(LAST_CATEGORY_KEY);
        setLastCategory(null);
      }
    } catch (error) {
      console.error('Error storing last category:', error);
    }
  };

  /**
   * Store last searched location
   */
  const storeLastLocation = (location: string | null) => {
    if (typeof window === 'undefined') return;

    try {
      if (location) {
        localStorage.setItem(LAST_LOCATION_KEY, location);
        setLastLocation(location);
      } else {
        localStorage.removeItem(LAST_LOCATION_KEY);
        setLastLocation(null);
      }
    } catch (error) {
      console.error('Error storing last location:', error);
    }
  };

  /**
   * Add search to history
   */
  const addToHistory = (keyword: string, category?: string, location?: string) => {
    if (typeof window === 'undefined' || !keyword.trim()) return;

    try {
      const newItem: SearchHistoryItem = {
        keyword: keyword.trim(),
        category: category || undefined,
        location: location || undefined,
        timestamp: Date.now(),
      };

      const updated = [newItem, ...searchHistory.filter(item => item.keyword !== keyword.trim())]
        .slice(0, MAX_HISTORY);

      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      setSearchHistory(updated);

      // Also store category and location
      if (category) {
        storeLastCategory(category);
      }

      if (location) {
        storeLastLocation(location);
      }
    } catch (error) {
      console.error('Error adding to search history:', error);
    }
  };

  /**
   * Clear search history
   */
  const clearHistory = () => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
      localStorage.removeItem(LAST_CATEGORY_KEY);
      localStorage.removeItem(LAST_LOCATION_KEY);
      setSearchHistory([]);
      setLastCategory(null);
      setLastLocation(null);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  return {
    lastCategory,
    lastLocation,
    searchHistory,
    storeLastCategory,
    storeLastLocation,
    addToHistory,
    clearHistory,
  };
}
