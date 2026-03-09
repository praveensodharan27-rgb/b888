'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGooglePlaces } from './useGooglePlaces';
import api from '@/lib/api';
import { getCurrentPosition, isGeolocationInCooldown } from '@/utils/geolocation';

/** 
 * Google location auto-detect - DISABLED by default for performance
 * Location will only be fetched when user explicitly requests it
 */
const ENABLE_AUTO_LOCATION = false;

export interface GoogleLocationData {
  city: string;
  state: string;
  lat: number;
  lng: number;
  address: string;
}

const LOCATION_STORAGE_KEY = 'google_location_data';

/**
 * Hook to get user location using Google Places API
 * OPTIMIZED: Only fetches location on user action, not automatically
 */
export function useGoogleLocation() {
  const { googlePlacesLoaded } = useGooglePlaces();
  const [location, setLocation] = useState<GoogleLocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const hasAutoFetchedRef = useRef(false);

  // Load location from localStorage on mount (instant, no API call)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      try {
        const locationData = JSON.parse(stored);
        setLocation(locationData);
      } catch (err) {
        console.error('Error parsing stored location:', err);
        localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    }
  }, []);

  // Fallback: use backend geocoding API when client-side fails
  const fetchLocationFromBackend = useCallback(async (lat: number, lng: number): Promise<GoogleLocationData | null> => {
    try {
      const res = await api.post('/geocoding/detect-location', { latitude: lat, longitude: lng });
      const data = res.data;
      if (data?.success && data?.detectedLocation) {
        const loc = data.detectedLocation;
        const locationData: GoogleLocationData = {
          city: loc.city || '',
          state: loc.state || '',
          lat,
          lng,
          address: loc.formatted_address || loc.address || '',
        };
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
        setLocation(locationData);
        setError(null);
        return locationData;
      }
    } catch (e: any) {
      // Log error but don't throw - graceful degradation
      console.warn('Backend geocoding failed:', e?.response?.status || e.message);
      
      // If 403, don't retry
      if (e?.response?.status === 403) {
        setError('Location service unavailable');
      }
    }
    return null;
  }, []);

  // Get location from browser geolocation and reverse geocode
  const fetchLocationFromBrowser = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation not supported');
      return null;
    }

    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      return null;
    }

    // Check if in cooldown period
    if (isGeolocationInCooldown()) {
      setError('Location request temporarily disabled. Please try again later.');
      return null;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const { latitude: lat, longitude: lng } = await getCurrentPosition();

      // Try client-side Geocoder first (if Google loaded)
      if (googlePlacesLoaded && window.google?.maps?.Geocoder) {
        try {
          const geocoder = new window.google.maps.Geocoder();
          return await new Promise<GoogleLocationData | null>((resolve) => {
            geocoder.geocode(
              { location: { lat, lng } },
              async (results: any, status: string) => {
                if (status === 'OK' && results && results.length > 0) {
                  const result = results[0];
                  let city = '';
                  let state = '';
                  for (const component of result.address_components) {
                    const types = component.types;
                    if (types.includes('locality')) city = component.long_name;
                    else if (!city && (types.includes('administrative_area_level_2') || types.includes('sublocality_level_1'))) city = component.long_name;
                    if (types.includes('administrative_area_level_1')) state = component.long_name;
                  }
                  const locationData: GoogleLocationData = {
                    city: city || result.address_components[0]?.long_name || '',
                    state: state || '',
                    lat, lng,
                    address: result.formatted_address || '',
                  };
                  localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
                  setLocation(locationData);
                  setError(null);
                  setIsLoading(false);
                  isFetchingRef.current = false;
                  resolve(locationData);
                } else {
                  // Don't retry backend on 403 - just fail gracefully
                  const backendResult = await fetchLocationFromBackend(lat, lng);
                  setIsLoading(false);
                  isFetchingRef.current = false;
                  resolve(backendResult);
                }
              }
            );
          });
        } catch (err) {
          const backendResult = await fetchLocationFromBackend(lat, lng);
          setIsLoading(false);
          isFetchingRef.current = false;
          return backendResult;
        }
      }
      const backendResult = await fetchLocationFromBackend(lat, lng);
      setIsLoading(false);
      isFetchingRef.current = false;
      return backendResult;
    } catch (err: any) {
      setIsLoading(false);
      isFetchingRef.current = false;
      const code = err?.code ?? 2;
      let errorMessage = 'Could not get your location';
      if (code === 1) errorMessage = 'Location access denied';
      else if (code === 2) errorMessage = 'Location unavailable';
      else if (code === 3) errorMessage = 'Location request timed out';
      setError(errorMessage);
      return null;
    }
  }, [googlePlacesLoaded, fetchLocationFromBackend]);

  // REMOVED: Auto-fetch on mount (performance optimization)
  // Location is now only fetched when user explicitly requests it
  // This prevents:
  // - Geolocation timeout errors on page load
  // - Reverse geocoding 403 errors
  // - Delayed page interactions
  useEffect(() => {
    if (!ENABLE_AUTO_LOCATION) return;
    
    // Only auto-fetch once, if enabled and no location exists
    if (!location && googlePlacesLoaded && !isLoading && !hasAutoFetchedRef.current) {
      const hasUserSetLocation = localStorage.getItem('selected_location');
      if (!hasUserSetLocation) {
        hasAutoFetchedRef.current = true;
        fetchLocationFromBrowser();
      }
    }
  }, [location, googlePlacesLoaded, isLoading, fetchLocationFromBrowser]);

  // Set location manually (from Google Places selection)
  const setLocationFromPlace = useCallback((place: any) => {
    if (!place.geometry?.location) return;

    const lat = typeof place.geometry.location.lat === 'function'
      ? place.geometry.location.lat()
      : place.geometry.location.lat;
    const lng = typeof place.geometry.location.lng === 'function'
      ? place.geometry.location.lng()
      : place.geometry.location.lng;

    let city = '';
    let state = '';

    if (place.address_components) {
      for (const component of place.address_components) {
        const types = component.types;
        if (types.includes('locality')) {
          city = component.long_name;
        } else if (!city && (types.includes('administrative_area_level_2') || types.includes('sublocality_level_1'))) {
          city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
      }
    }

    const locationData: GoogleLocationData = {
      city: city || place.name || '',
      state: state || '',
      lat,
      lng,
      address: place.formatted_address || place.name || '',
    };

    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
    setLocation(locationData);
    setError(null);
  }, []);

  return {
    location,
    isLoading,
    error,
    fetchLocation: fetchLocationFromBrowser,
    setLocation: setLocationFromPlace,
    clearLocation: () => {
      localStorage.removeItem(LOCATION_STORAGE_KEY);
      setLocation(null);
    },
  };
}
