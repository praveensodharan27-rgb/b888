'use client';

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import ProgressiveLoader from '@/components/ProgressiveLoader';
import { useGoogleLocation } from '@/hooks/useGoogleLocation';

// Sell Box style Hero component
const HeroOLX = dynamic(() => import('@/components/HeroOLX'), {
  loading: () => (
    <div className="h-[350px] md:h-[400px] bg-gray-900 animate-pulse flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>
  ),
  ssr: false
});

// Sell Box style Fresh Recommendations component
const FreshRecommendationsOGNOX = dynamic(() => import('@/components/FreshRecommendationsOGNOX'), {
  ssr: false
});

function HomeContent() {
  const searchParams = useSearchParams();
  const { location: googleLocation } = useGoogleLocation();
  const [locationFilter, setLocationFilter] = useState<{
    latitude?: number;
    longitude?: number;
    locationSlug?: string;
  } | undefined>();

  // Get category from URL params (optional filter - only if user clicked)
  const categorySlug = searchParams.get('category') || undefined;

  // Priority: Use Google location if available, else use localStorage
  useEffect(() => {
    if (googleLocation) {
      // Use Google location (city, state, lat, lng)
      console.log('📍 Using Google location on home page:', googleLocation);
      setLocationFilter({
        latitude: googleLocation.lat,
        longitude: googleLocation.lng
      });
    } else {
      // Fallback to localStorage
      try {
        const storedLocation = localStorage.getItem('selected_location');
        const storedCoords = localStorage.getItem('selected_location_coords');
        
        if (storedCoords) {
          const coords = JSON.parse(storedCoords);
          if (coords.latitude && coords.longitude) {
            console.log('📍 Loading location from localStorage:', coords);
            setLocationFilter({
              latitude: coords.latitude,
              longitude: coords.longitude
            });
          }
        } else if (storedLocation) {
          // If we have location slug but no coordinates, try to get coordinates
          const locationData = JSON.parse(storedLocation);
          if (locationData.slug) {
            // Location slug available but no coords - will be handled by FreshRecommendationsOLX
            setLocationFilter({
              locationSlug: locationData.slug
            });
          }
        }
      } catch (error) {
        console.error('Error loading location from localStorage:', error);
      }
    }
  }, [googleLocation]);

  // Handle location change callback from HeroOLX (including default location on page load)
  const handleLocationChange = (location: {
    latitude?: number;
    longitude?: number;
    locationSlug?: string;
  }) => {
    // Update location filter to reload products on home page (no route change)
    setLocationFilter(location);
  };

  // Listen for location changes from Navbar (Google Places selection)
  useEffect(() => {
    const handleLocationChanged = (event: CustomEvent) => {
      const locationData = event.detail;
      
      console.log('📍 Home page received locationChanged event:', locationData);
      
      if (locationData && locationData.latitude && locationData.longitude) {
        // Update location filter to reload products on home page (no redirect)
        setLocationFilter({ 
          latitude: locationData.latitude, 
          longitude: locationData.longitude 
        });
        console.log('✅ Home page location filter updated');
      } else if (locationData === null) {
        // Clear location filter
        setLocationFilter(undefined);
        console.log('📍 Home page location filter cleared');
      }
    };

    window.addEventListener('locationChanged', handleLocationChanged as EventListener);
    console.log('✅ Home page listening for locationChanged events');
    
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
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
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
            <FreshRecommendationsOGNOX 
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
