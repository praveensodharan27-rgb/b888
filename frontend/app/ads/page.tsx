'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAds } from '@/hooks/useAds';
import { useInfiniteAds } from '@/hooks/useInfiniteAds';
import dynamic from 'next/dynamic';
import AdCard from '@/components/AdCard';

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
  const [filters, setFilters] = useState<{
    page: number;
    limit: number;
    category?: string;
    subcategory?: string;
    location?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
    condition?: string;
    sort?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped';
    latitude?: string;
    longitude?: string;
    radius?: string;
  }>({
    page: parseInt(searchParams.get('page') || '1'),
    limit: 20,
    category: searchParams.get('category') || undefined,
    subcategory: searchParams.get('subcategory') || undefined,
    location: searchParams.get('location') || undefined,
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
    search: searchParams.get('search') || undefined,
    condition: searchParams.get('condition') || undefined,
    sort: (searchParams.get('sort') || 'newest') as 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped',
    latitude: searchParams.get('latitude') || undefined,
    longitude: searchParams.get('longitude') || undefined,
    radius: searchParams.get('radius') || '50',
  });

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(true);


  // Use infinite scroll for better performance
  const infiniteQuery = useInfiniteAds(filters);
  const regularQuery = useAds(filters);
  
  // Choose which query to use
  const query = useInfiniteScroll ? infiniteQuery : regularQuery;
  
  // Flatten infinite query pages
  const adsData = useInfiniteScroll && infiniteQuery.data
    ? {
        ads: infiniteQuery.data.pages.flatMap(page => page.ads || []),
        pagination: infiniteQuery.data.pages[infiniteQuery.data.pages.length - 1]?.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
      }
    : (regularQuery.data?.ads && regularQuery.data.ads.length > 0) 
      ? regularQuery.data 
      : { 
          ads: dummyAds, 
          pagination: { page: 1, limit: 20, total: dummyAds.length, pages: 1 } 
        };
  
  const isLoading = useInfiniteScroll 
    ? (infiniteQuery.isLoading || infiniteQuery.isFetchingNextPage)
    : regularQuery.isLoading;
  const isError = useInfiniteScroll ? infiniteQuery.isError : regularQuery.isError;
  const hasNextPage = useInfiniteScroll ? infiniteQuery.hasNextPage : false;
  const fetchNextPage = useInfiniteScroll ? infiniteQuery.fetchNextPage : () => {};

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

  const handleFilterChange = (newFilters: any) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);
    
    // Update URL with new filters
    const params = new URLSearchParams();
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value && key !== 'page' && key !== 'limit') {
        params.append(key, String(value));
      }
    });
    router.push(`/ads?${params.toString()}`, { scroll: false });
  };

  const handleRemoveFilter = (key: string) => {
    handleFilterChange({ [key]: '' });
  };

  const handleClearAllFilters = () => {
    handleFilterChange({
      category: '',
      subcategory: '',
      location: '',
      minPrice: '',
      maxPrice: '',
      condition: '',
      search: '',
    });
  };

  const handleSearch = (searchTerm: string) => {
    handleFilterChange({ search: searchTerm });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Banners position="search" />
        
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
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {adsData.ads.map((ad: any, index: number) => (
                    <AdCard key={ad.id} ad={ad} priority={index < 6} />
                  ))}
                </div>

                {adsData.ads.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No ads found</p>
                    <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
                  </div>
                )}

                {/* Infinite Scroll Load More Trigger */}
                {useInfiniteScroll && (
                  <div ref={loadMoreRef} className="py-8">
                    {hasNextPage && (
                      <div className="text-center">
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2 text-gray-500">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                            <span>Loading more ads...</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => fetchNextPage()}
                            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                          >
                            Load More
                          </button>
                        )}
                      </div>
                    )}
                    {!hasNextPage && adsData.ads.length > 0 && (
                      <div className="text-center text-gray-500 py-4">
                        <p>No more ads to load</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pagination - Only show if not using infinite scroll */}
                {!useInfiniteScroll && adsData.pagination && adsData.pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: adsData.pagination.pages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-4 py-2 rounded transition-colors ${
                          page === filters.page
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Toggle between infinite scroll and pagination */}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      setUseInfiniteScroll(!useInfiniteScroll);
                      // Reset to page 1 when switching
                      handlePageChange(1);
                    }}
                    className="text-sm text-gray-500 hover:text-primary-600"
                  >
                    {useInfiniteScroll ? 'Switch to Pagination' : 'Switch to Infinite Scroll'}
                  </button>
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
