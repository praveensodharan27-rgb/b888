'use client';

import { useState, useEffect } from 'react';

// Prevent multiple fallback injections across hook instances
let fallbackInjected = false;
let isLoading = false;

/**
 * Shared hook for Google Maps/Places API.
 * OPTIMIZED: Lazy loads only when needed, with faster timeout
 */
export function useGooglePlaces() {
  const [googlePlacesLoaded, setGooglePlacesLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const trySetLoaded = () => {
      if (window.google?.maps?.places && typeof window.google.maps.importLibrary === 'function') {
        setGooglePlacesLoaded(true);
        isLoading = false;
        return true;
      }
      return false;
    };

    // Already loaded
    if (trySetLoaded()) return;

    // Already loading
    if (isLoading) {
      const checkLoaded = setInterval(() => {
        if (trySetLoaded()) clearInterval(checkLoaded);
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(checkLoaded);
        trySetLoaded();
      }, 8000); // Reduced from 12s to 8s

      return () => {
        clearInterval(checkLoaded);
        clearTimeout(timeout);
      };
    }

    isLoading = true;

    // Wait for GooglePlacesLoader to load
    const checkLoaded = setInterval(() => {
      if (trySetLoaded()) clearInterval(checkLoaded);
    }, 100);

    // Fallback: if no script in DOM after 1.5s, inject ourselves
    // Reduced from 2s to 1.5s for faster fallback
    const fallbackTimeout = setTimeout(() => {
      if (trySetLoaded()) return;
      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existing) return; // Loader's script exists, keep waiting
      if (!apiKey || fallbackInjected) return;

      fallbackInjected = true;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const inner = setInterval(() => {
          if (trySetLoaded()) clearInterval(inner);
        }, 50);
        setTimeout(() => clearInterval(inner), 3000);
      };
      document.head.appendChild(script);
    }, 1500); // Reduced from 2000ms

    const timeout = setTimeout(() => {
      clearInterval(checkLoaded);
      trySetLoaded();
      isLoading = false;
    }, 8000); // Reduced from 12000ms

    return () => {
      clearInterval(checkLoaded);
      clearTimeout(fallbackTimeout);
      clearTimeout(timeout);
    };
  }, []);

  return { googlePlacesLoaded };
}

// Default export for better module resolution
export default useGooglePlaces;
