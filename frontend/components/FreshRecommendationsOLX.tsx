'use client';

import { useInfiniteAds } from '@/hooks/useInfiniteAds';
import AdCardOLX from './AdCardOLX';
import { useEffect, useState } from 'react';
import { dummyAds } from '@/lib/dummyData';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useGoogleLocation } from '@/hooks/useGoogleLocation';

interface FreshRecommendationsOLXProps {
  location?: {
    latitude?: number;
    longitude?: number;
    locationSlug?: string;
  };
  categorySlug?: string;
}

export default function FreshRecommendationsOLX({ location, categorySlug }: FreshRecommendationsOLXProps = {}) {
  const limit = 8; // Show 8 ads per page
  const [radiusMessage, setRadiusMessage] = useState<string | null>(null);
  
  // Get Google location (city, state, lat, lng)
  const { location: googleLocation } = useGoogleLocation();
  
  // Build filter object based on location and category props
  const filters: any = {
    limit,
    sort: 'newest' as const,
  };

  // Add category filter if provided
  if (categorySlug) {
    filters.category = categorySlug;
  }

  // Priority: Use Google location (city/state) if available, else use passed location
  if (googleLocation) {
    // Use Google Places location (city, state, lat, lng)
    filters.city = googleLocation.city;
    filters.state = googleLocation.state;
    filters.latitude = googleLocation.lat.toString();
    filters.longitude = googleLocation.lng.toString();
    filters.radius = '50'; // Default 50km radius
    console.log('📍 FreshRecommendationsOLX - Google location filter applied:', {
      city: filters.city,
      state: filters.state,
      latitude: filters.latitude,
      longitude: filters.longitude,
      radius: filters.radius
    });
  } else if (location?.latitude && location?.longitude) {
    // Fallback to passed location coordinates
    filters.latitude = location.latitude.toString();
    filters.longitude = location.longitude.toString();
    filters.radius = '50'; // Default 50km radius
    console.log('📍 FreshRecommendationsOLX - Location coordinates filter applied:', {
      latitude: filters.latitude,
      longitude: filters.longitude,
      radius: filters.radius
    });
  } else if (location?.locationSlug) {
    filters.location = location.locationSlug;
    console.log('📍 FreshRecommendationsOLX - Location slug filter applied:', filters.location);
  } else {
    console.log('📍 FreshRecommendationsOLX - No location filter');
  }
  
  // Use infinite scroll for lazy loading
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteAds(filters);

  // Debug: Log data changes
  useEffect(() => {
    if (data?.pages) {
      console.log('📍 FreshRecommendationsOLX - Data received:', {
        pages: data.pages.length,
        totalAds: data.pages.reduce((sum, page) => sum + (page.ads?.length || 0), 0),
        firstPageAds: data.pages[0]?.ads?.length || 0,
        radiusInfo: data.pages[0]?.radiusInfo
      });
    }
  }, [data]);

  // Check for radius expansion info and set message
  useEffect(() => {
    if (data?.pages && data.pages.length > 0) {
      const firstPage = data.pages[0];
      if (firstPage.radiusInfo && firstPage.radiusInfo.expanded && firstPage.radiusInfo.radiusRange) {
        const message = `Showing results for ${firstPage.radiusInfo.radiusRange} as no ads were found in your exact location.`;
        setRadiusMessage(message);
      } else {
        setRadiusMessage(null);
      }
    } else {
      setRadiusMessage(null);
    }
  }, [data]);

  // Flatten all pages into a single array
  const ads = data?.pages 
    ? data.pages.flatMap(page => page.ads || [])
    : (isError || (!isLoading && (!data || !data.pages || data.pages.length === 0))
      ? []
      : []);

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
          {categorySlug ? 'Category Products' : 'Fresh Recommendations'}
        </h2>
      </div>

      {/* Radius expansion message */}
      {radiusMessage && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{radiusMessage}</p>
        </div>
      )}

      {isLoading && ads.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md animate-pulse overflow-hidden">
              <div className="h-48 md:h-56 bg-gray-200"></div>
              <div className="p-4 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : ads.length === 0 && !isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No products found.</p>
          <p className="text-gray-400 text-sm">Try adjusting your location or search filters.</p>
        </div>
      ) : ads.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {ads.map((ad: any) => {
              if (!ad || !ad.id || !ad.title) {
                return null;
              }
              return (
                <AdCardOLX key={ad.id} ad={ad} />
              );
            })}
          </div>
          
          {/* Lazy Loading Trigger */}
          <div ref={loadMoreRef} className="mt-10">
            {hasNextPage && (
              <div className="flex justify-center">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    <span>Loading more...</span>
                  </div>
                ) : null}
              </div>
            )}
            {!hasNextPage && ads.length > 0 && (
              <div className="text-center text-gray-500 py-4">
                <p>No more ads to load</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg shadow-md">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📦</span>
            </div>
            <p className="text-gray-600 text-lg font-medium mb-2">No ads available</p>
            <p className="text-gray-500 text-sm">Be the first to post an ad!</p>
          </div>
        </div>
      )}
    </div>
  );
}
