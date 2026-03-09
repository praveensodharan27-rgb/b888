'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export type Condition = 'NEW' | 'USED' | 'LIKE_NEW' | 'REFURBISHED';
export type PostedTime = 'today' | '3d' | '7d' | '30d';
export type SellerType = 'individual' | 'business' | 'verified';
export type Feature = 'emi' | 'delivery' | 'verified';

export interface FilterState {
  // Category filters
  categorySlug?: string;
  subcategorySlug?: string;
  
  // Brand filters
  brands: string[];
  
  // Price filters
  minPrice?: number;
  maxPrice?: number;
  
  // Condition
  condition?: Condition;
  
  // Location
  locationSlug?: string;
  
  // Posted time
  postedTime?: PostedTime;
  
  // Seller type
  sellerType?: SellerType;
  
  // Rating
  minRating?: number;
  
  // Features
  features: Feature[];
  
  // Search
  search?: string;
  
  // Sorting
  sort?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'popular' | 'featured';
  
  // Pagination
  page?: number;
  limit?: number;
}

const STORAGE_KEY = 'sellit_filter_state';

/**
 * Hook for managing filter state with URL sync and localStorage persistence
 */
export function useFilterState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const initialState = useMemo<FilterState>(() => {
    const state: FilterState = {
      brands: [],
      features: [],
    };

    // Parse URL params
    const categorySlug = searchParams.get('categorySlug') || searchParams.get('category');
    const subcategorySlug = searchParams.get('subcategorySlug') || searchParams.get('subcategory');
    const locationSlug = searchParams.get('locationSlug') || searchParams.get('location');
    const brandParam = searchParams.get('brand');
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');
    const conditionParam = searchParams.get('condition') as Condition | null;
    const postedTimeParam = searchParams.get('posted') as PostedTime | null;
    const sellerTypeParam = searchParams.get('sellerType') as SellerType | null;
    const minRatingParam = searchParams.get('minRating');
    const featureParam = searchParams.get('verified') === 'true' ? ['verified'] : [];
    const searchParam = searchParams.get('search');
    const sortParam = searchParams.get('sort') as FilterState['sort'];
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    if (categorySlug) state.categorySlug = categorySlug;
    if (subcategorySlug) state.subcategorySlug = subcategorySlug;
    if (locationSlug) state.locationSlug = locationSlug;
    if (brandParam) state.brands = brandParam.split(',').filter(Boolean);
    if (minPriceParam) state.minPrice = parseInt(minPriceParam, 10);
    if (maxPriceParam) state.maxPrice = parseInt(maxPriceParam, 10);
    if (conditionParam) state.condition = conditionParam;
    if (postedTimeParam) state.postedTime = postedTimeParam;
    if (sellerTypeParam) state.sellerType = sellerTypeParam;
    if (minRatingParam) state.minRating = parseInt(minRatingParam, 10);
    if (featureParam.length > 0) state.features = featureParam as Feature[];
    if (searchParam) state.search = searchParam;
    if (sortParam) state.sort = sortParam;
    if (pageParam) state.page = parseInt(pageParam, 10);
    if (limitParam) state.limit = parseInt(limitParam, 10);

    return state;
  }, [searchParams]);

  const [filters, setFilters] = useState<FilterState>(initialState);

  // Sync state with URL params when they change
  useEffect(() => {
    setFilters(initialState);
  }, [initialState]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Failed to save filters to localStorage:', error);
    }
  }, [filters]);

  // Update URL with current filters
  const updateURL = useCallback((newFilters: FilterState) => {
    const params = new URLSearchParams();

    // Add filters to URL (only non-empty values)
    if (newFilters.categorySlug) params.set('categorySlug', newFilters.categorySlug);
    if (newFilters.subcategorySlug) params.set('subcategorySlug', newFilters.subcategorySlug);
    if (newFilters.locationSlug) params.set('locationSlug', newFilters.locationSlug);
    if (newFilters.brands.length > 0) params.set('brand', newFilters.brands.join(','));
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice.toString());
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice.toString());
    if (newFilters.condition) params.set('condition', newFilters.condition);
    if (newFilters.postedTime) params.set('posted', newFilters.postedTime);
    if (newFilters.sellerType) params.set('sellerType', newFilters.sellerType);
    if (newFilters.minRating) params.set('minRating', newFilters.minRating.toString());
    if (newFilters.features.includes('verified')) params.set('verified', 'true');
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.sort) params.set('sort', newFilters.sort);
    if (newFilters.page && newFilters.page > 1) params.set('page', newFilters.page.toString());
    if (newFilters.limit && newFilters.limit !== 20) params.set('limit', newFilters.limit.toString());

    // Update URL without page reload
    router.replace(`/ads?${params.toString()}`, { scroll: false });
  }, [router]);

  // Update filter and sync to URL
  const updateFilter = useCallback((updates: Partial<FilterState>) => {
    setFilters(prev => {
      const newFilters = { ...prev, ...updates };
      updateURL(newFilters);
      return newFilters;
    });
  }, [updateURL]);

  // Clear all filters
  const clearAll = useCallback(() => {
    const emptyFilters: FilterState = {
      brands: [],
      features: [],
    };
    setFilters(emptyFilters);
    router.replace('/ads', { scroll: false });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear filters from localStorage:', error);
    }
  }, [router]);

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categorySlug) count++;
    if (filters.subcategorySlug) count++;
    if (filters.locationSlug) count++;
    if (filters.brands.length > 0) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.condition) count++;
    if (filters.postedTime) count++;
    if (filters.sellerType) count++;
    if (filters.minRating) count++;
    if (filters.features.length > 0) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  // Check if any filters are active
  const hasActiveFilters = activeFilterCount > 0;

  return {
    filters,
    updateFilter,
    clearAll,
    activeFilterCount,
    hasActiveFilters,
  };
}
