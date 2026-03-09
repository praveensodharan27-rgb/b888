'use client';

// Note: dynamic and revalidate exports are not supported in client components
// Caching is disabled via React Query settings in useHomeFeed hook

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import ProgressiveLoader from '@/components/ProgressiveLoader';
import { useGoogleLocation } from '@/hooks/useGoogleLocation';
import FreshRecommendationsOGNOX from '@/components/FreshRecommendationsOGNOX';

// Sell Box style Hero component
const HeroOLX = dynamic(() => import('@/components/HeroOLX'), {
  loading: () => (
    <div className="h-[350px] md:h-[400px] bg-gray-900 animate-pulse flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>
  ),
  ssr: false
});

function HomeContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { location: googleLocation } = useGoogleLocation();
  const [locationFilter, setLocationFilter] = useState<{
    latitude?: number;
    longitude?: number;
    locationSlug?: string;
    city?: string;
    state?: string;
  } | undefined>();

  // Get category/subcategory from URL params (optional filter - hero icon click)
  const categorySlug = searchParams.get('category') || undefined;
  const subcategorySlug = searchParams.get('subcategory') || undefined;

  // Load initial location: URL param first (shareable), then localStorage
  useEffect(() => {
    const locationFromUrl = searchParams.get('location');
    if (locationFromUrl) {
      const slugLower = locationFromUrl.toLowerCase();
      const isAllIndia = slugLower === 'india' || slugLower === 'all-india';
      if (isAllIndia) {
        setLocationFilter(undefined);
        return;
      }
      try {
        const storedCoords = localStorage.getItem('selected_location_coords');
        const coords = storedCoords ? JSON.parse(storedCoords) : null;
        const stored = localStorage.getItem('selected_location');
        const locationData = stored ? JSON.parse(stored) : null;
        const sameSlug = locationData?.slug === locationFromUrl;
        setLocationFilter({
          locationSlug: locationFromUrl,
          city: sameSlug ? locationData?.city : undefined,
          state: sameSlug ? locationData?.state : undefined,
          latitude: coords?.latitude ?? locationData?.latitude,
          longitude: coords?.longitude ?? locationData?.longitude,
        });
        return;
      } catch {
        setLocationFilter({ locationSlug: locationFromUrl });
        return;
      }
    }
    try {
      const storedLocation = localStorage.getItem('selected_location');
      const storedCoords = localStorage.getItem('selected_location_coords');
      if (!storedLocation) return;

      const locationData = JSON.parse(storedLocation);
      const coords = storedCoords ? JSON.parse(storedCoords) : null;
      setLocationFilter({
        locationSlug: locationData.slug,
        city: locationData.city,
        state: locationData.state,
        latitude: coords?.latitude ?? locationData.latitude,
        longitude: coords?.longitude ?? locationData.longitude,
      });
    } catch {
      // ignore parse errors
    }
  }, [searchParams]);

  // Sync selected location to URL so it's shareable and survives refresh
  useEffect(() => {
    if (pathname !== '/') return;
    const currentLocationParam = searchParams.get('location') ?? '';
    const slug = locationFilter?.locationSlug?.trim() ?? '';
    const isAllIndia = slug && (slug.toLowerCase() === 'india' || slug.toLowerCase() === 'all-india');
    const wantParam = !slug || isAllIndia ? '' : slug;
    if (currentLocationParam === wantParam) return;
    const params = new URLSearchParams(searchParams.toString());
    if (!wantParam) {
      params.delete('location');
    } else {
      params.set('location', wantParam);
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/', { scroll: false });
  }, [locationFilter?.locationSlug, pathname, router, searchParams]);

  // Handle location change callback from HeroOLX (including default location on page load)
  const handleLocationChange = (location: {
    latitude?: number;
    longitude?: number;
    locationSlug?: string;
    city?: string;
    state?: string;
  }) => {
    // Update location filter to reload products on home page (no route change)
    setLocationFilter(location);
  };

  // Listen for location changes from Navbar (Google Places selection)
  useEffect(() => {
    const handleLocationChanged = (event: CustomEvent) => {
      const locationData = event.detail;
      
      if (locationData && (locationData.latitude && locationData.longitude || locationData.slug || locationData.city)) {
        // Update location filter with full data so feed uses selected location
        setLocationFilter({ 
          latitude: locationData.latitude, 
          longitude: locationData.longitude,
          locationSlug: locationData.slug,
          city: locationData.city,
          state: locationData.state,
        });
      } else if (locationData === null) {
        // Clear location filter
        setLocationFilter(undefined);
      }
    };

    window.addEventListener('locationChanged', handleLocationChanged as EventListener);
    
    return () => {
      window.removeEventListener('locationChanged', handleLocationChanged as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Sell Box Style */}
      <Suspense fallback={
        <div className="h-[350px] md:h-[400px] bg-gray-900 animate-pulse flex items-center justify-center">
          <div className="text-white text-xl">Loading Hero...</div>
        </div>
      }>
        <HeroOLX onLocationChange={handleLocationChange} />
      </Suspense>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Fresh Recommendations Section */}
        <section className="mb-8 sm:mb-12 md:mb-16">
        <ProgressiveLoader
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-md animate-pulse overflow-hidden">
                  <div className="w-full aspect-[4/3] bg-gray-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
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
            <FreshRecommendationsOGNOX 
              key={`${JSON.stringify(locationFilter)}-${categorySlug}-${subcategorySlug}`} 
              location={locationFilter} 
              categorySlug={categorySlug}
              subcategorySlug={subcategorySlug}
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
