'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGooglePlaces } from './useGooglePlaces';

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
 * Fetches location on site open and saves to localStorage
 */
export function useGoogleLocation() {
  const { googlePlacesLoaded } = useGooglePlaces();
  const [location, setLocation] = useState<GoogleLocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load location from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      try {
        const locationData = JSON.parse(stored);
        setLocation(locationData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error parsing stored location:', err);
        localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  // Get location from browser geolocation and reverse geocode with Google Places
  const fetchLocationFromBrowser = useCallback(async () => {
    if (!googlePlacesLoaded || !window.google?.maps?.places) {
      setError('Google Places API not loaded');
      return null;
    }

    return new Promise<GoogleLocationData | null>((resolve) => {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          try {
            // Use Geocoder to get address from coordinates
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode(
              { location: { lat, lng } },
              (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                  const result = results[0];
                  
                  // Extract city and state from address components
                  let city = '';
                  let state = '';
                  
                  for (const component of result.address_components) {
                    if (component.types.includes('locality')) {
                      city = component.long_name;
                    }
                    if (component.types.includes('administrative_area_level_1')) {
                      state = component.long_name;
                    }
                  }

                  const locationData: GoogleLocationData = {
                    city: city || result.address_components[0]?.long_name || '',
                    state: state || '',
                    lat,
                    lng,
                    address: result.formatted_address || '',
                  };

                  // Save to localStorage
                  localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
                  setLocation(locationData);
                  setError(null);
                  resolve(locationData);
                } else {
                  setError('Could not get address from coordinates');
                  resolve(null);
                }
              }
            );
          } catch (err) {
            console.error('Error geocoding location:', err);
            setError('Failed to get location details');
            resolve(null);
          }
        },
        (error) => {
          // Handle geolocation errors gracefully
          const errorCode = error?.code;
          let errorMessage = 'Could not get your location';
          
          switch (errorCode) {
            case 1: // PERMISSION_DENIED
              // User denied location permission - this is expected, don't log as error
              errorMessage = 'Location access denied';
              // Don't log to console - this is normal user behavior
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = 'Location unavailable';
              console.warn('Geolocation: Position unavailable', error);
              break;
            case 3: // TIMEOUT
              errorMessage = 'Location request timed out';
              console.warn('Geolocation: Request timeout', error);
              break;
            default:
              // Only log if error object has meaningful information
              if (error && Object.keys(error).length > 0) {
                console.warn('Geolocation error:', error);
              }
          }
          
          setError(errorMessage);
          resolve(null);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  }, [googlePlacesLoaded]);

  // Auto-fetch location on site open (if not in localStorage)
  useEffect(() => {
    if (!location && googlePlacesLoaded && !isLoading) {
      // Only auto-fetch if user hasn't explicitly set a location
      const hasUserSetLocation = localStorage.getItem('selected_location');
      if (!hasUserSetLocation) {
        fetchLocationFromBrowser();
      }
    }
  }, [location, googlePlacesLoaded, isLoading, fetchLocationFromBrowser]);

  // Set location manually (from Google Places selection)
  const setLocationFromPlace = useCallback((place: google.maps.places.PlaceResult) => {
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
        if (component.types.includes('locality')) {
          city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
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
