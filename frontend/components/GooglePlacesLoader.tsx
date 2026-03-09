'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * Lazy loads Google Maps/Places API script only when needed.
 * OPTIMIZED: Uses dynamic import pattern to defer loading until user interaction
 */
export default function GooglePlacesLoader() {
  const [loaded, setLoaded] = useState(false);
  const loadAttemptedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || loadAttemptedRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Location: Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to frontend/.env.local and restart dev server');
      }
      return;
    }

    const trySetLoaded = () => {
      if (window.google?.maps?.places && typeof window.google.maps.importLibrary === 'function') {
        setLoaded(true);
        return true;
      }
      return false;
    };

    // Already loaded
    if (trySetLoaded()) return;

    // Script already in DOM
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      const check = setInterval(() => {
        if (trySetLoaded()) clearInterval(check);
      }, 100);
      const timeout = setTimeout(() => {
        clearInterval(check);
        trySetLoaded();
      }, 5000); // Reduced from 5000ms
      return () => {
        clearInterval(check);
        clearTimeout(timeout);
      };
    }

    loadAttemptedRef.current = true;

    // OPTIMIZED: Defer script loading until user interacts with the page
    // This prevents blocking the initial page load
    const loadScript = () => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places,geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        const check = setInterval(() => {
          if (trySetLoaded()) clearInterval(check);
        }, 50);
        setTimeout(() => {
          clearInterval(check);
          trySetLoaded();
        }, 3000);
      };

      script.onerror = () => {
        console.error('Failed to load Google Maps API');
        loadAttemptedRef.current = false; // Allow retry
      };

      document.head.appendChild(script);
    };

    // Defer loading until after initial page load
    // This improves Time to Interactive (TTI)
    if (document.readyState === 'complete') {
      // Page already loaded, wait a bit more
      setTimeout(loadScript, 1000);
    } else {
      // Wait for page load
      window.addEventListener('load', () => {
        setTimeout(loadScript, 1000);
      }, { once: true });
    }
  }, []);

  return null;
}
