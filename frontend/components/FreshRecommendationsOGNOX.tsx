'use client';

import { useHomeFeed } from '@/hooks/useHomeFeed';
import LazyAdCard from './LazyAdCard';
import SponsoredAdFeedCard from './SponsoredAdFeedCard';
import AdsGridSkeleton from './ads/AdsGridSkeleton';
import { useEffect, useMemo } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useLocationPersistence } from '@/hooks/useLocationPersistence';
import { useGoogleLocation } from '@/hooks/useGoogleLocation';

interface FreshRecommendationsOGNOXProps {
  location?: {
    latitude?: number;
    longitude?: number;
    locationSlug?: string;
    city?: string;
    state?: string;
  };
  categorySlug?: string;
  subcategorySlug?: string;
}

export default function FreshRecommendationsOGNOX({ location, categorySlug, subcategorySlug }: FreshRecommendationsOGNOXProps = {}) {
  const limit = 24; // Ads per batch (lazy load more on scroll)
  
  const { location: persistedLocation } = useLocationPersistence();
  const { location: googleLocation } = useGoogleLocation();
  
  // Build home feed filters: selected location first, then persisted, then Google; category/subcategory for hero icons
  const homeFeedFilters = useMemo(() => {
    const filters: any = { limit };
    if (categorySlug) filters.category = categorySlug;
    if (subcategorySlug) filters.subcategory = subcategorySlug;
    const slug = (location?.locationSlug || persistedLocation?.slug || '').toLowerCase();
    if (slug === 'india' || slug === 'all-india') return filters;

    // Priority 1: location from props (Navbar selection / locationChanged)
    if (location?.locationSlug) {
      filters.location = location.locationSlug;
      if (location.latitude) filters.latitude = location.latitude;
      if (location.longitude) filters.longitude = location.longitude;
    } else if (location?.city || location?.latitude) {
      if (location.city) filters.city = location.city;
      if (location.state) filters.state = location.state;
      if (location.latitude) filters.latitude = location.latitude;
      if (location.longitude) filters.longitude = location.longitude;
    } else if (persistedLocation?.slug) {
      filters.location = persistedLocation.slug;
      if (persistedLocation.latitude) filters.latitude = persistedLocation.latitude;
      if (persistedLocation.longitude) filters.longitude = persistedLocation.longitude;
    } else if (persistedLocation?.city) {
      filters.city = persistedLocation.city;
      if (persistedLocation.state) filters.state = persistedLocation.state;
      if (persistedLocation.latitude) filters.latitude = persistedLocation.latitude;
      if (persistedLocation.longitude) filters.longitude = persistedLocation.longitude;
    } else if (googleLocation?.city) {
      filters.city = googleLocation.city;
      if (googleLocation.state) filters.state = googleLocation.state;
      if (googleLocation.lat) filters.latitude = googleLocation.lat;
      if (googleLocation.lng) filters.longitude = googleLocation.lng;
    }
    return filters;
  }, [location, persistedLocation, googleLocation, limit, categorySlug, subcategorySlug]);
  
  // Use home feed hook (uses navbar location with smart ranking)
  const { data, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useHomeFeed(homeFeedFilters);

  // Debug: Log data changes and errors
  useEffect(() => {
    if (data?.pages) {
      const totalAds = data.pages.reduce((sum, page) => sum + (page.ads?.length || 0), 0);
      console.log('📍 FreshRecommendationsOGNOX - Home Feed Data received:', {
        pages: data.pages.length,
        totalAds,
        firstPageAds: data.pages[0]?.ads?.length || 0,
        firstPageData: data.pages[0],
        filters: homeFeedFilters,
        isLoading,
        isError,
        hasNextPage
      });
      
      // Warn if no ads on first page
      if (totalAds === 0 && !isLoading && !isError) {
        console.warn('⚠️ Home feed returned 0 ads. Filters:', homeFeedFilters);
        console.warn('⚠️ First page data:', data.pages[0]);
      }
    } else if (!isLoading && !isError) {
      console.warn('⚠️ Home feed: No data.pages found', {
        data,
        isLoading,
        isError,
        filters: homeFeedFilters
      });
    }
    if (isError && error) {
      const isNetworkError = !(error as { response?: unknown })?.response && (
        error?.message?.toLowerCase().includes('network') ||
        (error as { code?: string })?.code === 'ERR_NETWORK'
      );
      if (!isNetworkError) {
        const err = error as { response?: { status?: number; data?: unknown } };
        console.error('❌ Home feed error:', {
          message: error?.message,
          status: err?.response?.status,
          data: err?.response?.data,
          filters: homeFeedFilters
        });
      }
    }
  }, [data, homeFeedFilters, isError, error, isLoading, hasNextPage]);

  // Flatten all pages - includes regular ads + sponsored ads (injected by backend)
  // Only treat as "has data" when we have at least one page with ads (ensures image URLs are from API)
  const feedItems = useMemo(() => {
    if (data?.pages && Array.isArray(data.pages)) {
      return data.pages.flatMap(page => {
        if (page && page.ads && Array.isArray(page.ads)) {
          return page.ads.filter(item => item && (item._type === 'sponsored' ? item.id : item.id && item.title));
        }
        return [];
      });
    }
    return [];
  }, [data?.pages]);

  // Show skeleton until we have at least one page of data (ensures ad data + image URLs are loaded)
  const showSkeleton = !data?.pages?.length || (isLoading && feedItems.length === 0);

  // Intersection observer for lazy loading
  const { elementRef: loadMoreRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '200px',
    triggerOnce: false
  });

  // Auto-load more when intersection occurs
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isLoading && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isLoading, isFetchingNextPage, fetchNextPage]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
          {categorySlug ? 'Category Products' : 'Fresh Recommendations'}
        </h2>
      </div>

      {showSkeleton ? (
        <AdsGridSkeleton count={12} variant="home" />
      ) : feedItems.length === 0 && !isError ? (
        <div className="text-center py-8 sm:py-12 px-4">
          <p className="text-gray-700 text-base sm:text-lg mb-3 sm:mb-4">No products found.</p>
          <p className="text-gray-600 text-sm mb-4">Try adjusting your location or search filters.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 sm:px-6 py-2 bg-primary-600 text-white text-sm sm:text-base rounded-lg hover:bg-primary-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      ) : feedItems.length === 0 && isError ? (
        <div className="text-center py-8 sm:py-12 px-4">
          <p className="text-red-500 text-base sm:text-lg mb-3 sm:mb-4">Failed to load ads.</p>
          <p className="text-gray-600 text-sm mb-4">Please try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 sm:px-6 py-2 bg-primary-600 text-white text-sm sm:text-base rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : feedItems.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 items-stretch">
            {feedItems.map((item: any, index: number) => {
              if (!item?.id) return null;
              if (item._type === 'sponsored') {
                return <SponsoredAdFeedCard key={`sp-${item.id}-${index}`} ad={item} />;
              }
              return (
                <LazyAdCard
                  key={`${item.id}-${index}`}
                  ad={{ ...item, images: item.images ?? [] }}
                  variant="ognox"
                  priority={index < 6}
                  eager={index < 8}
                />
              );
            })}
          </div>
          
          {/* Lazy Loading Trigger */}
          <div ref={loadMoreRef} className="mt-6 sm:mt-8 lg:mt-10">
            {hasNextPage && (
              <div className="flex justify-center">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm sm:text-base">
                    <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-primary-600"></div>
                    <span>Loading more...</span>
                  </div>
                ) : null}
              </div>
            )}
            {!hasNextPage && feedItems.length > 0 && (
              <div className="text-center text-gray-600 py-4 text-sm sm:text-base">
                <p>No more ads to load</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12 sm:py-16 bg-white rounded-lg shadow-md mx-4">
          <div className="max-w-md mx-auto px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl sm:text-4xl">📦</span>
            </div>
            <p className="text-gray-600 text-base sm:text-lg font-medium mb-2">No ads available</p>
            <p className="text-gray-600 text-sm">Be the first to post an ad!</p>
          </div>
        </div>
      )}
    </div>
  );
}
