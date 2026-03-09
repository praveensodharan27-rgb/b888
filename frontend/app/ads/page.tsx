'use client';

import { useState, Suspense, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAdsPaginated } from '@/hooks/useAdsPaginated';
import dynamic from 'next/dynamic';
import LazyAdCard from '@/components/LazyAdCard';
import SponsoredAdFeedCard from '@/components/SponsoredAdFeedCard';
import EmptyState from '@/components/EmptyState';
import AdsGridSkeleton from '@/components/ads/AdsGridSkeleton';
import { useGoogleLocation } from '@/hooks/useGoogleLocation';
import { useLocationPersistence } from '@/hooks/useLocationPersistence';

/** Format location as "city, state" for display and API consistency */
function formatLocationCityState(city?: string | null, state?: string | null): string | null {
  const c = city?.trim();
  const s = state?.trim();
  if (c && s) return `${c}, ${s}`;
  if (c) return c;
  if (s) return s;
  return null;
}

// Lazy load heavy components
const AdsFilterSidebar = dynamic(() => import('@/components/ads/AdsFilterSidebar'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-xl"></div>
});
const FilterChips = dynamic(() => import('@/components/filters/FilterChips'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
});
const ServiceButtons = dynamic(() => import('@/components/ServiceButtons'), { ssr: false });

function AdsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { location: persistedLocation, clearLocation } = useLocationPersistence();
  const { location: googleLocation } = useGoogleLocation();
  
  // Load persisted location on mount (legacy - keeping for backward compatibility)
  const [persistedLocationState, setPersistedLocationState] = useState<{
    location?: string;
    latitude?: string;
    longitude?: string;
    radius?: string;
  } | null>(null);
  
  // Listen for location changes from Navbar – update URL only (ads refetch via stable query key)
  useEffect(() => {
    const handleLocationChanged = (e: CustomEvent) => {
      const detail = e.detail;
      if (typeof window === 'undefined') return;
      if (window.location.pathname !== '/ads') return;
      if (isUpdatingUrlRef.current) return;
      isUpdatingUrlRef.current = true;
      const params = new URLSearchParams(searchParams.toString());
      if (detail == null) {
        params.delete('location');
        params.delete('latitude');
        params.delete('longitude');
        params.delete('radius');
        params.delete('city');
        params.delete('state');
      } else {
        const slug = detail.slug ?? detail;
        const loc = typeof slug === 'string' ? { slug } : detail;
        params.set('location', loc.slug || '');
        if (loc.latitude != null && loc.longitude != null) {
          params.set('latitude', String(loc.latitude));
          params.set('longitude', String(loc.longitude));
          params.set('radius', '50');
        }
        if (loc.city) params.set('city', loc.city);
        if (loc.state) params.set('state', loc.state);
      }
      router.replace(params.toString() ? `/ads?${params.toString()}` : '/ads', { scroll: false });
      setTimeout(() => { isUpdatingUrlRef.current = false; }, 150);
    };
    window.addEventListener('locationChanged', handleLocationChanged as EventListener);
    return () => window.removeEventListener('locationChanged', handleLocationChanged as EventListener);
  }, [router, searchParams]);

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
        
        const persisted: {
          location: string;
          latitude?: string;
          longitude?: string;
          radius?: string;
        } = {
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
  const cityParam = searchParams.get('city');
  const stateParam = searchParams.get('state');
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
  const pageParam = searchParams.get('page');
  const postedTimeParam = searchParams.get('postedTime');
  
  // Serialize all search params so filters update when ANY param changes (brand, model, specs, etc.)
  const searchParamsKey = searchParams.toString();

  const filters = useMemo(() => {
    // Location priority: URL param > persisted (navbar) > Google API
    const locationFromUrl = locationParam || persistedLocation?.slug || persistedLocationState?.location || undefined;
    const categoryFromUrl = categoryParam || undefined;
    const subcategoryFromUrl = subcategoryParam || undefined;
    const minPriceFromUrl = minPriceParam || undefined;
    const maxPriceFromUrl = maxPriceParam || undefined;
    const searchFromUrl = searchParam || undefined;
    const conditionFromUrl = conditionParam || undefined;
    const sortFromUrl = (sortParam || 'newest') as 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped';
    
    const dynamicFilters: any = {};
    searchParams.forEach((value, key) => {
      const standardFilters = ['page', 'limit', 'category', 'subcategory', 'location', 'city', 'state', 
        'latitude', 'longitude', 'radius', 'minPrice', 'maxPrice', 'priceMin', 'priceMax', 
        'search', 'condition', 'sort', 'postedTime'];
      if (!standardFilters.includes(key)) {
        dynamicFilters[key] = value;
      }
    });
    
    // Google location (from GPS/Places API)
    const cityFromGoogle = googleLocation?.city;
    const stateFromGoogle = googleLocation?.state;
    const latFromGoogle = googleLocation?.lat;
    const lngFromGoogle = googleLocation?.lng;
    
    // All India = show all ads, don't use city/state
    const isAllIndia = locationFromUrl?.toLowerCase() === 'india' || locationFromUrl?.toLowerCase() === 'all-india';
    
    // Location-wise ads: URL city/state > Google API > none (when no explicit location)
    const useGoogleForLocation = !isAllIndia && !locationFromUrl && (cityFromGoogle || stateFromGoogle);
    // Format city/state as "city, state" for API consistency
    const rawCity = cityParam || (useGoogleForLocation ? cityFromGoogle : undefined);
    const rawState = stateParam || (useGoogleForLocation ? stateFromGoogle : undefined);
    const cityForApi = rawCity?.trim() || undefined;
    const stateForApi = rawState?.trim() || undefined;
    
    // Coordinates: URL > Google > persisted
    const latitudeFromUrlRaw =
      latitudeParam ||
      latFromGoogle ||
      (locationFromUrl && !isAllIndia && (persistedLocation?.latitude || persistedLocationState?.latitude)) ||
      undefined;
    const longitudeFromUrlRaw =
      longitudeParam ||
      lngFromGoogle ||
      (locationFromUrl && !isAllIndia && (persistedLocation?.longitude || persistedLocationState?.longitude)) ||
      undefined;
    const latitudeFromUrl =
      latitudeFromUrlRaw !== undefined && latitudeFromUrlRaw !== null && String(latitudeFromUrlRaw).trim() !== ''
        ? String(latitudeFromUrlRaw)
        : undefined;
    const longitudeFromUrl =
      longitudeFromUrlRaw !== undefined && longitudeFromUrlRaw !== null && String(longitudeFromUrlRaw).trim() !== ''
        ? String(longitudeFromUrlRaw)
        : undefined;
    const radiusFromUrl = radiusParam || (locationFromUrl && !isAllIndia && (persistedLocationState?.radius)) || '50';
    
    // Location value for API:
    // - Prefer explicit location slug from URL/persisted location
    // - When only city/state are available, rely on separate city/state params (backend handles this path)
    const locationForApi = isAllIndia ? undefined : locationFromUrl || undefined;

    const result = {
      limit: 20,
      category: categoryFromUrl,
      subcategory: subcategoryFromUrl,
      location: locationForApi,
      city: cityForApi,
      state: stateForApi,
      minPrice: minPriceFromUrl,
      maxPrice: maxPriceFromUrl,
      priceMin: minPriceFromUrl,
      priceMax: maxPriceFromUrl,
      search: searchFromUrl,
      condition: conditionFromUrl,
      sort: sortFromUrl,
      postedTime: postedTimeParam || undefined,
      page: pageParam ? parseInt(pageParam, 10) : 1,
      latitude: isAllIndia ? undefined : latitudeFromUrl,
      longitude: isAllIndia ? undefined : longitudeFromUrl,
      radius: radiusFromUrl,
      ...dynamicFilters,
    };
    
    return result;
  }, [
    searchParamsKey,
    locationParam,
    cityParam,
    stateParam,
    latitudeParam,
    longitudeParam,
    radiusParam,
    categoryParam,
    subcategoryParam,
    minPriceParam,
    maxPriceParam,
    searchParam,
    conditionParam,
    sortParam,
    pageParam,
    postedTimeParam,
    persistedLocation?.slug,
    persistedLocation?.latitude,
    persistedLocation?.longitude,
    persistedLocationState?.location,
    persistedLocationState?.latitude,
    persistedLocationState?.longitude,
    persistedLocationState?.radius,
    googleLocation?.city,
    googleLocation?.state,
    googleLocation?.lat,
    googleLocation?.lng,
  ]);

  // Paginated ads (single page)
  const adsQuery = useAdsPaginated(filters);
  const adsData = adsQuery.data
    ? { ads: adsQuery.data.ads || [], pagination: adsQuery.data.pagination || { page: 1, limit: 20, total: 0, pages: 1 } }
    : { ads: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };
  
  const isLoading = adsQuery.isLoading;
  const isError = adsQuery.isError;
  

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

  // Normalize filter parameters for API (convert priceMin/priceMax to minPrice/maxPrice)
  const normalizeFilters = useCallback((filters: any) => {
    const normalized: any = { ...filters };
    
    // Normalize price filters: priceMin/priceMax -> minPrice/maxPrice
    if (normalized.priceMin !== undefined && normalized.priceMin !== null && normalized.priceMin !== '') {
      normalized.minPrice = normalized.priceMin;
      delete normalized.priceMin;
    }
    if (normalized.priceMax !== undefined && normalized.priceMax !== null && normalized.priceMax !== '') {
      normalized.maxPrice = normalized.priceMax;
      delete normalized.priceMax;
    }
    
    // Ensure minPrice/maxPrice are used (prefer over priceMin/priceMax)
    if (normalized.minPrice === undefined && normalized.priceMin !== undefined) {
      normalized.minPrice = normalized.priceMin;
      delete normalized.priceMin;
    }
    if (normalized.maxPrice === undefined && normalized.priceMax !== undefined) {
      normalized.maxPrice = normalized.priceMax;
      delete normalized.priceMax;
    }
    
    // Remove empty values
    Object.keys(normalized).forEach(key => {
      if (normalized[key] === '' || normalized[key] === null || normalized[key] === undefined) {
        delete normalized[key];
      }
    });
    
    return normalized;
  }, []);

  // Debounced filter change handler to batch API calls
  const handleFilterChange = useCallback((newFilters: any) => {
    // Update pending filters (accumulate changes)
    pendingFiltersRef.current = { ...pendingFiltersRef.current, ...newFilters };
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Short debounce so brand/model/spec filters feel instant; still batches rapid clicks
    debounceTimerRef.current = setTimeout(() => {
      if (!pendingFiltersRef.current) return;
      
      const newFiltersToApply = pendingFiltersRef.current;
      pendingFiltersRef.current = null;
      
      // Mark that we're updating URL internally
      isUpdatingUrlRef.current = true;
      
      // Merge with current filters from searchParams
      let updatedFilters = { ...filters, ...newFiltersToApply };
      
      // IMPORTANT: If search keyword exists, remove category and subcategory filters (search overrides category)
      if (updatedFilters.search && updatedFilters.search.trim()) {
        updatedFilters.category = '';
        updatedFilters.subcategory = '';
      }
      
      // IMPORTANT: Preserve persisted location unless explicitly cleared
      // Location should persist across filter changes, searches, etc.
      const locationSlug = persistedLocation?.slug || persistedLocationState?.location;
      if (locationSlug && !newFiltersToApply.hasOwnProperty('location')) {
        updatedFilters.location = locationSlug;
        const lat = persistedLocation?.latitude ?? persistedLocationState?.latitude;
        const lng = persistedLocation?.longitude ?? persistedLocationState?.longitude;
        if (lat && lng) {
          updatedFilters.latitude = String(lat);
          updatedFilters.longitude = String(lng);
          updatedFilters.radius = '50';
        }
      }
      
      // Normalize filters for API (convert priceMin/priceMax to minPrice/maxPrice)
      const normalizedFilters = normalizeFilters(updatedFilters);
      
      // Update URL with new filters - only include non-empty values
      const params = new URLSearchParams();
      Object.entries(normalizedFilters).forEach(([key, value]) => {
        if (value && value !== '' && key !== 'limit') {
          // Handle array values (for multiselect filters like brand)
          if (Array.isArray(value)) {
            value.forEach(v => {
              if (v !== undefined && v !== null && v !== '') {
                params.append(key, String(v));
              }
            });
          } else {
            params.append(key, String(value));
          }
        }
      });
      
      // Ensure persisted location is always in URL if available (unless explicitly cleared)
      const locToPreserve = persistedLocation?.slug || persistedLocationState?.location;
      if (locToPreserve && !newFiltersToApply.hasOwnProperty('location') && !params.has('location')) {
        params.set('location', locToPreserve);
        const lat = persistedLocation?.latitude ?? persistedLocationState?.latitude;
        const lng = persistedLocation?.longitude ?? persistedLocationState?.longitude;
        if (lat && lng) {
          params.set('latitude', String(lat));
          params.set('longitude', String(lng));
          params.set('radius', '50');
        }
      }
      
      const queryString = params.toString();
      // Use replace instead of push to update URL immediately without adding to history
      router.replace(queryString ? `/ads?${queryString}` : '/ads', { scroll: false });
      
      // When location is set via filter, persist to localStorage so it "locks"
      if (newFiltersToApply.hasOwnProperty('location') && typeof window !== 'undefined') {
        const locSlug = updatedFilters.location;
        if (locSlug) {
          const locName = locSlug === 'india' || locSlug === 'all-india' ? 'All India' : locSlug;
          try {
            localStorage.setItem('selected_location', JSON.stringify({ slug: locSlug, name: locName }));
            if (updatedFilters.latitude && updatedFilters.longitude) {
              localStorage.setItem('selected_location_coords', JSON.stringify({
                latitude: Number(updatedFilters.latitude),
                longitude: Number(updatedFilters.longitude),
              }));
            }
          } catch (e) {
            console.warn('Could not persist location to localStorage');
          }
        }
      }
      
      // Reset flag after a brief delay to allow URL update to complete
      setTimeout(() => {
        isUpdatingUrlRef.current = false;
      }, 100);
    }, 100); // 100ms – instant filter feedback (brand, model, etc.) without double-firing
  }, [filters, persistedLocation, persistedLocationState, router, normalizeFilters]);

  const handleRemoveFilter = (key: string) => {
    if (key === 'location') {
      try {
        localStorage.removeItem('selected_location');
        localStorage.removeItem('selected_location_coords');
        clearLocation();
      } catch (error) {
        console.error('Error clearing location from localStorage:', error);
      }
    }
    // Removing brand also clears model (model depends on brand)
    if (key === 'price') {
      handleFilterChange({ minPrice: '', maxPrice: '', page: 1 });
    } else if (key === 'brand') {
      handleFilterChange({ brand: '', model: '', page: 1 });
    } else {
      handleFilterChange({ [key]: '', page: 1 });
    }
  };

  const handleClearAllFilters = () => {
    // Clear all filters EXCEPT location (location persists)
    handleFilterChange({
      category: '',
      subcategory: '',
      search: '',
      minPrice: '',
      maxPrice: '',
      condition: '',
      brand: '',
      model: '',
      radius: '50',
      postedTime: '',
      sort: 'newest',
      page: 1,
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

  // Dynamic location display: "city, state" when both present, else location name/slug
  const locationDisplay = useMemo(() => {
    const isAllIndia =
      locationParam?.toLowerCase() === 'india' || locationParam?.toLowerCase() === 'all-india' ||
      persistedLocation?.slug === 'india' || persistedLocation?.slug === 'all-india';
    if (isAllIndia) return 'All India';
    const formatted = formatLocationCityState(
      cityParam || persistedLocation?.city,
      stateParam || persistedLocation?.state
    );
    if (formatted) return formatted;
    return locationParam || persistedLocation?.name || persistedLocation?.slug || 'All Locations';
  }, [locationParam, cityParam, stateParam, persistedLocation?.name, persistedLocation?.slug, persistedLocation?.city, persistedLocation?.state]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden pb-8 sm:pb-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full">
        {/* Breadcrumbs */}
        <nav className="mb-4 sm:mb-6 overflow-x-auto">
          <ol className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
            <li>
              <a href="/" className="hover:text-blue-600 transition-colors font-medium">
                Home
              </a>
            </li>
            {categoryParam && (
              <>
                <li className="text-gray-400">/</li>
                <li>
                  <span className="capitalize font-medium text-gray-900">{categoryParam}</span>
                </li>
              </>
            )}
            {searchParam && !categoryParam && (
              <>
                <li className="text-gray-400">/</li>
                <li>
                  <span className="text-gray-900 font-semibold truncate max-w-[200px]">{searchParam}</span>
                </li>
              </>
            )}
          </ol>
        </nav>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 w-full min-w-0">
          {/* Filter Sidebar - visible on all screens; id for scroll target */}
          <aside
            id="filters-sidebar"
            className="lg:w-[260px] xl:w-[280px] flex-shrink-0 w-full space-y-4 sm:space-y-6 order-first lg:order-none"
            aria-label="Filters"
          >
            <h2 className="text-sm sm:text-base font-semibold text-gray-800 px-0.5">Filters</h2>
            <AdsFilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              categorySlug={categoryParam || undefined}
              subcategorySlug={subcategoryParam || undefined}
              fallbackTotalCount={adsData.pagination?.total}
            />
          </aside>

          <main id="ads-results" className="flex-1 min-w-0 w-full">
            {/* Results Header */}
            <div className="mb-4 sm:mb-6 w-full">
              {/* Service category chips - show when viewing services */}
            {categoryParam === 'services' && (
              <div className="mb-4 sm:mb-6">
                <ServiceButtons />
              </div>
            )}
            <div className="mb-3 sm:mb-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 break-words">
                  {(() => {
                    const parts: string[] = [];
                    if (searchParam) parts.push(`"${searchParam}"`);
                    else if (categoryParam) parts.push(categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1));
                    else parts.push('All Ads');
                    if (subcategoryParam) parts.push(subcategoryParam.replace(/-/g, ' '));
                    const main = parts.join(' ');
                    return <>{main} in {locationDisplay}</>;
                  })()}
                </h1>
                <p className="text-gray-500 text-xs sm:text-sm">
                  {isLoading && adsData.ads.length === 0
                    ? 'Loading...'
                    : `${(adsData.pagination?.total ?? adsData.ads.length).toLocaleString()} ads found`}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 w-full">
                <div className="flex-1 min-w-0 w-full sm:w-auto flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById('filters-sidebar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="lg:hidden inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Filters
                  </button>
                  <FilterChips
                    filters={filters}
                    onRemove={handleRemoveFilter}
                    onClearAll={handleClearAllFilters}
                  />
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Sort:</label>
                  <select
                    value={filters.sort || 'newest'}
                    onChange={(e) => handleFilterChange({ sort: e.target.value, page: 1 })}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-xs sm:text-sm font-medium transition-colors cursor-pointer hover:border-blue-400"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="featured">Featured</option>
                  </select>
                </div>
              </div>
            </div>

            {isLoading && adsData.ads.length === 0 ? (
              <AdsGridSkeleton
                count={12}
                variant={categoryParam === 'services' ? 'service' : 'default'}
              />
            ) : isError && adsData.ads.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                <p className="text-red-500 mb-4">Failed to load ads. Please try again.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : adsData.ads.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <EmptyState
                  title="No ads found"
                  message="We couldn't find any ads matching your criteria. Try adjusting your filters or clearing them to see more results."
                  icon="filter"
                  actionLabel="Clear All Filters"
                  onAction={handleClearAllFilters}
                  className="py-20 px-6"
                />
              </div>
            ) : (
              <>
                <div
                  className={`grid gap-4 sm:gap-5 lg:gap-6 mb-6 sm:mb-8 w-full ${
                    categoryParam === 'services'
                      ? 'grid-cols-1'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  }`}
                >
                  {adsData.ads.map((ad: any, index: number) => {
                    if (ad?._type === 'sponsored') {
                      return (
                        <SponsoredAdFeedCard
                          key={`sp-${ad.id}-${index}`}
                          ad={ad}
                        />
                      );
                    }
                    return (
                      <LazyAdCard
                        key={`${ad.id}-${index}`}
                        ad={ad}
                        variant={categoryParam === 'services' ? 'service' : 'ognox'}
                        priority={index < 6}
                        eager={index < 8}
                      />
                    );
                  })}
                </div>

                {/* Pagination */}
                {adsData.pagination && adsData.pagination.pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8 w-full overflow-x-auto scrollbar-hide pb-4">
                    <button
                      onClick={() => {
                        const currentPage = adsData.pagination?.page || 1;
                        if (currentPage > 1) {
                          handleFilterChange({ page: currentPage - 1 });
                        }
                      }}
                      disabled={!adsData.pagination || adsData.pagination.page <= 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600"
                    >
                      ←
                    </button>
                    
                    {(() => {
                      const currentPage = adsData.pagination?.page || 1;
                      const totalPages = adsData.pagination.pages;
                      const pages: (number | string)[] = [];
                      
                      // Always show first page
                      pages.push(1);
                      
                      // Show pages around current page
                      if (currentPage > 3) {
                        pages.push('...');
                      }
                      
                      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                        if (i !== 1 && i !== totalPages) {
                          pages.push(i);
                        }
                      }
                      
                      // Show last page if not already included
                      if (totalPages > 1) {
                        if (currentPage < totalPages - 2) {
                          pages.push('...');
                        }
                        pages.push(totalPages);
                      }
                      
                      // Remove duplicates and sort
                      const uniquePages = Array.from(new Set(pages));
                      
                      return uniquePages.map((page, index) => {
                        if (page === '...') {
                          return (
                            <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                              ...
                            </span>
                          );
                        }
                        
                        const pageNum = page as number;
                        const isActive = pageNum === currentPage;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handleFilterChange({ page: pageNum })}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-200'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      });
                    })()}
                    
                    <button
                      onClick={() => {
                        const currentPage = adsData.pagination?.page || 1;
                        if (currentPage < (adsData.pagination?.pages || 1)) {
                          handleFilterChange({ page: currentPage + 1 });
                        }
                      }}
                      disabled={!adsData.pagination || adsData.pagination.page >= adsData.pagination.pages}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600"
                    >
                      →
                    </button>
                  </div>
                )}
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
