'use client';

/**
 * HomeFeedGrid - OLX-style home feed with infinite scroll
 * 
 * Features:
 * - Responsive grid
 * - Infinite scroll
 * - Loading states
 * - Empty states
 * - Location indicator
 */

import { useEffect, useRef } from 'react';
import HomeFeedCard from './HomeFeedCard';
import { useHomeFeed } from '@/hooks/useHomeFeed';

interface HomeFeedGridProps {
  enableLocation?: boolean;
  limit?: number;
}

export default function HomeFeedGrid({ enableLocation = true, limit = 20 }: HomeFeedGridProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useHomeFeed({ limit });

  const ads = data?.pages.flatMap(page => page.ads) ?? [];
  const hasUserLocation = data?.pages[0]?.hasUserLocation ?? false;
  const loading = isLoading;
  const hasMore = hasNextPage ?? false;
  const loadMore = fetchNextPage;
  const refresh = refetch;

  const observerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll – trigger load before user reaches bottom for smoother UX
  useEffect(() => {
    if (!observerRef.current || loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [loading, hasMore, loadMore]);

  // Loading state (initial)
  if (loading && ads.length === 0) {
    return (
      <div className="space-y-6">
        {/* Location indicator skeleton */}
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-64"></div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden shadow animate-pulse">
              <div className="aspect-[4/3] bg-gray-200"></div>
              <div className="p-4 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && ads.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 mb-6">
          <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Failed to load ads</h3>
        <p className="text-gray-600 mb-6">{error?.message || 'An error occurred while loading ads'}</p>
        <button
          onClick={() => refresh()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (!loading && ads.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 mb-6">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">No ads found</h3>
        <p className="text-gray-600">Check back later for new listings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Location Indicator */}
      {hasUserLocation && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-3 rounded-lg">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span>
            Showing ads near <strong>your location</strong>
          </span>
        </div>
      )}

      {!hasUserLocation && enableLocation && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-yellow-50 px-4 py-3 rounded-lg">
          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>
            Enable location to see nearby ads first
          </span>
        </div>
      )}

      {/* Ads Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {ads.map((ad) => (
          <HomeFeedCard key={ad.id} ad={ad} />
        ))}
      </div>

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={observerRef} className="py-8 text-center">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Loading more ads...</span>
            </div>
          ) : (
            <button
              onClick={() => loadMore()}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Load More
            </button>
          )}
        </div>
      )}

      {/* End of Results */}
      {!hasMore && ads.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          You've reached the end of the feed
        </div>
      )}
    </div>
  );
}
