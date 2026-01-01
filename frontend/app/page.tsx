'use client';

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import ProgressiveLoader from '@/components/ProgressiveLoader';

// OLX-style Hero component
const HeroOLX = dynamic(() => import('@/components/HeroOLX'), {
  loading: () => (
    <div className="h-[500px] md:h-[600px] bg-gray-900 animate-pulse flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>
  ),
  ssr: true
});

// OLX-style Fresh Recommendations component
const FreshRecommendationsOLX = dynamic(() => import('@/components/FreshRecommendationsOLX'), {
  ssr: false
});

function HomeContent() {
  const searchParams = useSearchParams();
  const [locationFilter, setLocationFilter] = useState<{
    latitude?: number;
    longitude?: number;
    locationSlug?: string;
  } | undefined>();

  // Get category from URL params (optional filter)
  const categorySlug = searchParams.get('category') || undefined;

  // Handle location change callback from HeroOLX
  const handleLocationChange = (location: {
    latitude?: number;
    longitude?: number;
    locationSlug?: string;
  }) => {
    // Update location filter to reload products on home page
    setLocationFilter(location);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - OLX Style */}
      <Suspense fallback={
        <div className="h-[500px] md:h-[600px] bg-gray-900 animate-pulse flex items-center justify-center">
          <div className="text-white text-xl">Loading Hero...</div>
        </div>
      }>
        <HeroOLX onLocationChange={handleLocationChange} />
      </Suspense>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Fresh Recommendations Section */}
        <section className="mb-12 md:mb-16">
          <ProgressiveLoader
            fallback={
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
            }
            threshold={0.1}
            rootMargin="100px"
          >
            <FreshRecommendationsOLX 
              key={`${JSON.stringify(locationFilter)}-${categorySlug}`} 
              location={locationFilter} 
              categorySlug={categorySlug}
            />
          </ProgressiveLoader>
        </section>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
