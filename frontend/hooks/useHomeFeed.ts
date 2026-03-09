/**
 * useHomeFeed Hook - React Query version for infinite scrolling
 * OLX-style home feed with paid ads priority
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface HomeFeedAd {
  id: string;
  title: string;
  price: number;
  images: string[];
  categoryName?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  attributes?: Record<string, string | number | null | undefined>;
  location?: string;
  city?: string;
  state?: string;
  _geo?: {
    lat: number;
    lng: number;
  };
  planType?: string;
  planPriority?: number;
  isTopAdActive?: boolean;
  isFeaturedActive?: boolean;
  isBumpActive?: boolean;
  isUrgent?: boolean;
  createdAt: string;
  distance?: number;
  distanceText?: string;
  _type?: 'sponsored' | 'regular';
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface HomeFeedResponse {
  success: boolean;
  ads: HomeFeedAd[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  hasUserLocation?: boolean;
}

export interface UseHomeFeedFilters {
  limit?: number;
  category?: string;
  subcategory?: string;
  location?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Fetch home feed with filters
 */
async function fetchHomeFeed(
  filters: UseHomeFeedFilters,
  pageParam: number = 1
): Promise<HomeFeedResponse> {
  const params: Record<string, unknown> = {
    page: pageParam,
    limit: filters.limit || 24,
  };

  // Add location filters
  if (filters.location) params.location = filters.location;
  if (filters.city) params.city = filters.city;
  if (filters.state) params.state = filters.state;
  // Backend expects userLat/userLng for geo-sorting
  if (filters.latitude) params.userLat = filters.latitude;
  if (filters.longitude) params.userLng = filters.longitude;

  // Add category filters
  if (filters.category) params.category = filters.category;
  if (filters.subcategory) params.subcategory = filters.subcategory;

  try {
    const response = await api.get<HomeFeedResponse>('/ads/home-feed', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
}

/** Stable key from filter values to avoid duplicate requests when parent re-renders */
function getHomeFeedQueryKey(filters: UseHomeFeedFilters): string {
  const o: Record<string, string | number | undefined> = {};
  (Object.keys(filters) as (keyof UseHomeFeedFilters)[]).forEach((k) => {
    const v = filters[k];
    if (v !== undefined && v !== null && v !== '') o[k] = v as string | number;
  });
  return JSON.stringify(o);
}

/**
 * useHomeFeed Hook - Infinite scrolling with React Query
 */
export function useHomeFeed(filters: UseHomeFeedFilters = {}) {
  const filterKey = getHomeFeedQueryKey(filters);
  return useInfiniteQuery({
    queryKey: ['home-feed', filterKey],
    queryFn: ({ pageParam }) => fetchHomeFeed(filters, pageParam),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination) return undefined;
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 30 * 1000, // Consider fresh for 30s to reduce re-fetches
    gcTime: 2 * 60 * 1000, // Keep minimal cache to improve mobile smoothness
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    networkMode: 'online',
  });
}
