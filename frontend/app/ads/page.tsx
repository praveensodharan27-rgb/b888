'use client';

import { useState, Suspense, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useInfiniteAds } from '@/hooks/useInfiniteAds';
import dynamic from 'next/dynamic';
import AdCardOLX from '@/components/AdCardOLX';
import EmptyState from '@/components/EmptyState';
import { useGoogleLocation } from '@/hooks/useGoogleLocation';
import { useLocationPersistence } from '@/hooks/useLocationPersistence';

// Lazy load heavy components
const Filters = dynamic(() => import('@/components/Filters'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
});
const AdvancedSearchBar = dynamic(() => import('@/components/AdvancedSearchBar'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
});
const SmartFiltersPanel = dynamic(() => import('@/components/SmartFiltersPanel'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
});
const FilterChips = dynamic(() => import('@/components/FilterChips'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
});
const Banners = dynamic(() => import('@/components/Banners'), {
  loading: () => null
});
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { dummyAds } from '@/lib/dummyData';

function AdsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { location: persistedLocation } = useLocationPersistence();
  const { location: googleLocation } = useGoogleLocation();
  
  // Load persisted location on mount (legacy - keeping for backward compatibility)
  const [persistedLocationState, setPersistedLocationState] = useState<{
    location?: string;
    latitude?: string;
    longitude?: string;
    radius?: string;
  } | null>(null);
  
  // Legacy location loading - now using hooks above
  useEffect(() => {
    // CRITICAL: Only run this on /ads page, not when navigating away
    // This prevents interfering with navigation to home page
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    if (currentPath !== '/ads') {
      return; // Don't run if not on /ads page
    }
    
    // Load persisted location from localStorage for backward compatibility
    try {
      const storedLocation = localStorage.getItem('selected_location');
      const storedCoords = localStorage.getItem('selected_location_coords');
      
      if (storedLocation) {
        const locationData = JSON.parse(storedLocation);
        let coords = null;
        if (storedCoords) {
          coords = JSON.parse(storedCoords);
        }
        
        const persisted = {
          location: locationData.slug,
        };
        
        if (coords && coords.latitude && coords.longitude) {
          persisted.latitude = String(coords.latitude);
          persisted.longitude = String(coords.longitude);
          persisted.radius = '50';
        }
        
        setPersistedLocationState(persisted);
        
        // Update URL if location not already in URL (preserve other params)
        // CRITICAL: Only update if still on /ads page (check again after async operations)
        // Use setTimeout to ensure this doesn't interfere with navigation
        setTimeout(() => {
          const stillOnAdsPage = typeof window !== 'undefined' && window.location.pathname === '/ads';
          if (stillOnAdsPage && !searchParams.get('location')) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.set('location', persisted.location);
            if (persisted.latitude && persisted.longitude) {
              newParams.set('latitude', persisted.latitude);
              newParams.set('longitude', persisted.longitude);
              newParams.set('radius', persisted.radius || '50');
            }
            router.replace(`/ads?${newParams.toString()}`, { scroll: false });
          }
        }, 100); // Small delay to allow navigation to complete first
      }
    } catch (error) {
      console.error('Error loading persisted location:', error);
    }
  }, []); // Run only once on mount - don't include searchParams/router to avoid re-runs

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  
  // Track if we're updating URL internally to prevent infinite loops
  const isUpdatingUrlRef = useRef(false);

  // Derive filters directly from searchParams using useMemo (single source of truth)
  // This prevents infinite loops by not using useEffect to sync URL to state
  // Get individual search param values for dependency array (prevents infinite loops)
  const locationParam = searchParams.get('location');
  const latitudeParam = searchParams.get('latitude');
  const longitudeParam = searchParams.get('longitude');
  const radiusParam = searchParams.get('radius');
  const categoryParam = searchParams.get('category');
  const subcategoryParam = searchParams.get('subcategory');
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  const searchParam = searchParams.get('search');
  const conditionParam = searchParams.get('condition');
  const sortParam = searchParams.get('sort');
  
  const filters = useMemo(() => {
    const locationFromUrl = locationParam || persistedLocation?.slug || persistedLocationState?.location || undefined;
    const categoryFromUrl = categoryParam || undefined;
    const subcategoryFromUrl = subcategoryParam || undefined;
    const minPriceFromUrl = minPriceParam || undefined;
    const maxPriceFromUrl = maxPriceParam || undefined;
    const searchFromUrl = searchParam || undefined;
    const conditionFromUrl = conditionParam || undefined;
    const sortFromUrl = (sortParam || 'newest') as 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped';
    
    // Priority: Google location (city/state) > URL params > persisted location
    const cityFromGoogle = googleLocation?.city;
    const stateFromGoogle = googleLocation?.state;
    const latFromGoogle = googleLocation?.lat;
    const lngFromGoogle = googleLocation?.lng;
    
    // Always include persisted location coordinates if available and location is set
    const latitudeFromUrl = latitudeParam || latFromGoogle || (locationFromUrl && (persistedLocation?.latitude || persistedLocationState?.latitude)) || undefined;
    const longitudeFromUrl = longitudeParam || lngFromGoogle || (locationFromUrl && (persistedLocation?.longitude || persistedLocationState?.longitude)) || undefined;
    const radiusFromUrl = radiusParam || (locationFromUrl && (persistedLocationState?.radius)) || '50';
    
    const result = {
      limit: 20,
      category: categoryFromUrl,
      subcategory: subcategoryFromUrl,
      location: locationFromUrl,
      city: cityFromGoogle, // Add city from Google location
      state: stateFromGoogle, // Add state from Google location
      minPrice: minPriceFromUrl,
      maxPrice: maxPriceFromUrl,
      search: searchFromUrl,
      condition: conditionFromUrl,
      sort: sortFromUrl,
      latitude: latitudeFromUrl,
      longitude: longitudeFromUrl,
      radius: radiusFromUrl,
    };
    
    // Debug: Log filter changes (only if location is set)
    if (result.location) {
      console.log('🔍 Filters updated (with location):', {
        location: result.location,
        latitude: result.latitude,
        longitude: result.longitude,
        radius: result.radius,
        hasCoordinates: !!(result.latitude && result.longitude),
        allFilters: result
      });
    }
    
    return result;
  }, [
    locationParam, latitudeParam, longitudeParam, radiusParam,
    categoryParam, subcategoryParam, minPriceParam, maxPriceParam,
    searchParam, conditionParam, sortParam,
    persistedLocation, persistedLocationState, googleLocation // Include Google location in dependencies
  ]); // Depend on individual params to detect changes

  // Use infinite scroll (lazy loading) for better performance
  const infiniteQuery = useInfiniteAds(filters);
  
  // Flatten infinite query pages
  const adsData = infiniteQuery.data && infiniteQuery.data.pages && infiniteQuery.data.pages.length > 0
    ? {
        ads: infiniteQuery.data.pages.flatMap(page => (page.ads && Array.isArray(page.ads)) ? page.ads : []),
        pagination: infiniteQuery.data.pages[infiniteQuery.data.pages.length - 1]?.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
      }
    : { 
        ads: [], 
        pagination: { page: 1, limit: 20, total: 0, pages: 1 } 
      };
  
  const isLoading = infiniteQuery.isLoading || infiniteQuery.isFetchingNextPage;
  const isError = infiniteQuery.isError;
  const hasNextPage = infiniteQuery.hasNextPage;
  const fetchNextPage = infiniteQuery.fetchNextPage;
  
  // Debug logging
  useEffect(() => {
    if (infiniteQuery.data) {
      console.log('📊 Infinite Query Data:', {
        pages: infiniteQuery.data.pages.length,
        totalAds: adsData.ads.length,
        hasNextPage,
        isLoading,
        isError
      });
    }
  }, [infiniteQuery.data, adsData.ads.length, hasNextPage, isLoading, isError]);

  // Intersection observer for infinite scroll
  const { elementRef: loadMoreRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '200px',
    triggerOnce: false
  });

  // Auto-load more when intersection occurs
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isLoading, fetchNextPage]);

  // Debounce timer ref for batching filter changes
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingFiltersRef = useRef<any>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced filter change handler to batch API calls
  const handleFilterChange = useCallback((newFilters: any) => {
    // Update pending filters (accumulate changes)
    pendingFiltersRef.current = { ...pendingFiltersRef.current, ...newFilters };
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer to batch changes (300ms debounce)
    debounceTimerRef.current = setTimeout(() => {
      if (!pendingFiltersRef.current) return;
      
      const newFiltersToApply = pendingFiltersRef.current;
      pendingFiltersRef.current = null;
      
      // Mark that we're updating URL internally
      isUpdatingUrlRef.current = true;
      
      // Merge with current filters from searchParams
      const updatedFilters = { ...filters, ...newFiltersToApply };
      
      // IMPORTANT: If search keyword exists, remove category and subcategory filters (search overrides category)
      if (updatedFilters.search && updatedFilters.search.trim()) {
        updatedFilters.category = '';
        updatedFilters.subcategory = '';
      }
      
      // IMPORTANT: Preserve persisted location unless explicitly cleared
      // Location should persist across filter changes, searches, etc.
      if (persistedLocation?.location && !newFiltersToApply.hasOwnProperty('location')) {
        updatedFilters.location = persistedLocation.location;
        if (persistedLocation.latitude && persistedLocation.longitude) {
          updatedFilters.latitude = persistedLocation.latitude;
          updatedFilters.longitude = persistedLocation.longitude;
          updatedFilters.radius = persistedLocation.radius || '50';
        }
      }
      
      // Update URL with new filters - only include non-empty values
      const params = new URLSearchParams();
      Object.entries(updatedFilters).forEach(([key, value]) => {
        if (value && value !== '' && key !== 'limit') {
          params.append(key, String(value));
        }
      });
      
      // Ensure persisted location is always in URL if available (unless explicitly cleared)
      if (persistedLocation?.location && !newFiltersToApply.hasOwnProperty('location') && !params.has('location')) {
        params.set('location', persistedLocation.location);
        if (persistedLocation.latitude && persistedLocation.longitude) {
          params.set('latitude', persistedLocation.latitude);
          params.set('longitude', persistedLocation.longitude);
          params.set('radius', persistedLocation.radius || '50');
        }
      }
      
      const queryString = params.toString();
      // Use replace instead of push to update URL immediately without adding to history
      router.replace(queryString ? `/ads?${queryString}` : '/ads', { scroll: false });
      
      // Reset flag after a brief delay to allow URL update to complete
      setTimeout(() => {
        isUpdatingUrlRef.current = false;
      }, 100);
    }, 200); // 200ms debounce for batching API calls (reduced for better UX)
  }, [filters, persistedLocation, router]);

  const handleRemoveFilter = (key: string) => {
    // Remove the filter by setting it to empty string
    // handleFilterChange will automatically exclude empty values from URL
    // IMPORTANT: If location is explicitly removed, clear it from localStorage too
    if (key === 'location') {
      try {
        localStorage.removeItem('selected_location');
        localStorage.removeItem('selected_location_coords');
        setPersistedLocation(null);
      } catch (error) {
        console.error('Error clearing location from localStorage:', error);
      }
    }
    
    if (key === 'price') {
      // Price filter removes both min and max
      handleFilterChange({ minPrice: '', maxPrice: '' });
    } else {
      handleFilterChange({ [key]: '' });
    }
  };

  const handleClearAllFilters = () => {
    // Clear all filters EXCEPT location (location persists)
    handleFilterChange({
      category: '',
      subcategory: '',
      minPrice: '',
      maxPrice: '',
      condition: '',
      search: '',
      // Note: location is NOT cleared - it persists
    });
  };

  const handleSearch = (searchTerm: string) => {
    // When search exists, remove category and subcategory filters (search overrides category)
    if (searchTerm && searchTerm.trim()) {
      handleFilterChange({ 
        search: searchTerm,
        category: '', // Clear category when searching
        subcategory: '' // Clear subcategory when searching
      });
    } else {
      // If search is cleared, keep other filters
      handleFilterChange({ search: searchTerm });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Banners at the top */}
        <div className="mb-6">
          <Banners position="search" />
        </div>
        
        {/* Advanced Search Bar */}
        <div className="mb-6">
          <AdvancedSearchBar 
            initialSearch={filters.search} 
            onSearch={handleSearch}
            showQuickFilters={true}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Smart Filters Panel */}
          <aside className="lg:w-80 flex-shrink-0">
            <SmartFiltersPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              isExpanded={isFiltersExpanded}
              onToggleExpand={() => setIsFiltersExpanded(!isFiltersExpanded)}
            />
          </aside>

          <main className="flex-1">
            {/* Results Header with Filter Chips */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">All Ads</h1>
                    <p className="text-gray-500 mt-1">
                      {adsData.pagination?.total || adsData.ads.length} listings found
                    </p>
                  </div>
                  <select
                    value={filters.sort}
                    onChange={(e) => handleFilterChange({ sort: e.target.value })}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="featured">Featured</option>
                    <option value="bumped">Recently Bumped</option>
                  </select>
                </div>

                {/* Filter Chips */}
                <FilterChips
                  filters={filters}
                  onRemove={handleRemoveFilter}
                  onClearAll={handleClearAllFilters}
                />
              </div>
            </div>

            {isLoading && adsData.ads.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p className="mt-4 text-gray-500">Loading ads...</p>
              </div>
            ) : isError && adsData.ads.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-red-500 mb-4">Failed to load ads. Please try again.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                >
                  Retry
                </button>
              </div>
            ) : adsData.ads.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8">
                <EmptyState
                  title="No ads found"
                  message="We couldn't find any ads matching your criteria. Try adjusting your filters or clearing them to see more results."
                  icon="search"
                  actionLabel="Clear All Filters"
                  onAction={handleClearAllFilters}
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {adsData.ads.map((ad: any, index: number) => (
                    <AdCardOLX key={ad.id} ad={ad} />
                  ))}
                </div>

                {/* Lazy Loading - Infinite Scroll Trigger */}
                <div ref={loadMoreRef} className="py-8">
                  {hasNextPage && (
                    <div className="text-center">
                      {isLoading && (
                        <div className="flex items-center justify-center gap-2 text-gray-500">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                          <span>Loading more ads...</span>
                        </div>
                      )}
                    </div>
                  )}
                  {!hasNextPage && adsData.ads.length > 0 && (
                    <div className="text-center text-gray-500 py-4">
                      <p>No more ads to load</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AdsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <AdsPageContent />
    </Suspense>
  );
}
