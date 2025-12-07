'use client';

import { useState, useEffect, useCallback } from 'react';
import { Ad } from './useAds';

const COMPARISON_STORAGE_KEY = 'sellit_comparison_items';
const MAX_COMPARISON_ITEMS = 4; // Limit to 4 items for better UX

export function useComparison() {
  const [comparisonItems, setComparisonItems] = useState<Ad[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load comparison items from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(COMPARISON_STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        setComparisonItems(items);
      }
    } catch (error) {
      console.error('Error loading comparison items:', error);
    }
  }, []);

  // Save to localStorage whenever comparisonItems changes
  useEffect(() => {
    if (mounted) {
      try {
        if (comparisonItems.length === 0) {
          // If empty, remove from localStorage
          localStorage.removeItem(COMPARISON_STORAGE_KEY);
        } else {
          // Otherwise, save to localStorage
          localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(comparisonItems));
        }
      } catch (error) {
        console.error('Error saving comparison items:', error);
      }
    }
  }, [comparisonItems, mounted]);

  const addToComparison = useCallback((ad: Ad) => {
    setComparisonItems((prev) => {
      // Check if already in comparison
      if (prev.some((item) => item.id === ad.id)) {
        return prev;
      }
      
      // Check if limit reached
      if (prev.length >= MAX_COMPARISON_ITEMS) {
        return prev;
      }
      
      return [...prev, ad];
    });
  }, []);

  const removeFromComparison = useCallback((adId: string) => {
    setComparisonItems((prev) => prev.filter((item) => item.id !== adId));
  }, []);

  const clearComparison = useCallback(() => {
    // Clear localStorage first
    try {
      localStorage.removeItem(COMPARISON_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing comparison from localStorage:', error);
    }
    // Then clear state using functional update to ensure React detects the change
    setComparisonItems((prev) => {
      // Return empty array - this ensures React sees it as a new reference
      return [];
    });
  }, []);

  const isInComparison = useCallback((adId: string) => {
    return comparisonItems.some((item) => item.id === adId);
  }, [comparisonItems]);

  const canAddMore = comparisonItems.length < MAX_COMPARISON_ITEMS;

  return {
    comparisonItems,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
    canAddMore,
    count: comparisonItems.length,
    maxItems: MAX_COMPARISON_ITEMS,
    mounted,
  };
}

