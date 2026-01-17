'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Shared hook for loading Google Places API script
 * Prevents multiple script loads across components
 * Reuses the same script that's already working on home page
 */
export function useGooglePlaces() {
  const [googlePlacesLoaded, setGooglePlacesLoaded] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ Google Maps API key not found. Location autocomplete will not work.');
      return;
    }

    // Check if script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('✅ Google Places API already loaded (reusing existing)');
      setGooglePlacesLoaded(true);
      return;
    }

    // Check if script is already in the DOM (reuse from home page)
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    ) as HTMLScriptElement;

    if (existingScript) {
      // Script exists, wait for it to load
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log('✅ Google Places API loaded from existing script');
        setGooglePlacesLoaded(true);
        return;
      }

      // Listen for load event
      const handleLoad = () => {
        if (window.google && window.google.maps && window.google.maps.places) {
          console.log('✅ Google Places API loaded from existing script (load event)');
          setGooglePlacesLoaded(true);
        }
        existingScript.removeEventListener('load', handleLoad);
      };

      existingScript.addEventListener('load', handleLoad);

      // Check if already loaded (in case event already fired)
      if (existingScript.getAttribute('data-loaded') === 'true') {
        if (window.google && window.google.maps && window.google.maps.places) {
          setGooglePlacesLoaded(true);
        }
      }

      return;
    }

    // Prevent multiple simultaneous loads
    if (loadingRef.current) {
      console.log('⏳ Google Maps script is already loading, waiting...');
      return;
    }

    // Mark as loading
    loadingRef.current = true;

    // Load Google Places API script (only if not already loaded)
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-api-key', apiKey.substring(0, 10) + '...');

    console.log('🔑 Loading Google Places API with key:', apiKey.substring(0, 10) + '...');

    script.onload = () => {
      loadingRef.current = false;
      script.setAttribute('data-loaded', 'true');

      // Wait for Google Maps to initialize (sometimes takes a moment after script loads)
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          console.log('✅ Google Places API loaded successfully');
          setGooglePlacesLoaded(true);
          clearInterval(checkGoogleMaps);
        }
      }, 50);

      // Timeout after 3 seconds
      setTimeout(() => {
        clearInterval(checkGoogleMaps);
        if (window.google && window.google.maps && window.google.maps.places) {
          console.log('✅ Google Places API loaded (delayed check)');
          setGooglePlacesLoaded(true);
        } else {
          console.warn('⚠️ Google Places API script loaded but Google Maps not initialized');
        }
      }, 3000);
    };

    script.onerror = (error) => {
      loadingRef.current = false;
      console.error('❌ Failed to load Google Maps/Places API');
      console.error('   Error:', error);
      console.error('   Possible causes:');
      console.error('   1. API key is missing or invalid');
      console.error('   2. RefererNotAllowedMapError - API key HTTP referrer restrictions blocking this domain');
      console.error('   3. "Maps JavaScript API" not enabled in Google Cloud Console');
      console.error('   4. "Places API (New)" not enabled in Google Cloud Console');
      console.error('   5. "Geocoding API" not enabled in Google Cloud Console');
      console.error('   6. Billing not enabled for the Google Cloud project');
      console.error('   Key used:', apiKey?.substring(0, 10) + '...');
      console.error('');
      console.error('🔧 FIX RefererNotAllowedMapError:');
      console.error('   1. Go to Google Cloud Console → APIs & Services → Credentials');
      console.error('   2. Click on your API key');
      console.error('   3. Under "Application restrictions" → "HTTP referrers (web sites)"');
      console.error('   4. Add these referrers:');
      console.error('      - http://localhost:3000/*');
      console.error('      - http://localhost:3001/*');
      console.error('      - http://localhost:*/*');
      console.error('      - http://127.0.0.1:3000/*');
      console.error('      - http://127.0.0.1:3001/*');
      console.error('      - http://127.0.0.1:*/*');
      console.error('      - https://yourdomain.com/*');
      console.error('      - https://*.yourdomain.com/*');
      console.error('   5. Save and wait 5 minutes for changes to propagate');
    };

    document.head.appendChild(script);

    // Cleanup: don't remove script, let it stay for other components
    return () => {
      // Script stays in DOM for reuse
    };
  }, []);

  return { googlePlacesLoaded };
}

// Default export for better module resolution
export default useGooglePlaces;

