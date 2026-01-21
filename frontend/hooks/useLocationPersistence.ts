import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

export interface LocationData {
  slug: string;
  name: string;
  city?: string;
  state?: string;
  neighbourhood?: string;
  latitude?: number;
  longitude?: number;
}

const LOCATION_STORAGE_KEY = 'selected_location';
const LOCATION_COORDS_KEY = 'selected_location_coords';

/**
 * Hook to persist selected location across navigation, searches, and page refreshes
 * Stores location in localStorage and syncs with user profile if logged in
 */
export function useLocationPersistence() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const removeLocationParamFromUrl = useCallback(() => {
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('location');
      const qs = params.toString();
      const newUrl = qs ? `?${qs}` : '';
      router.replace(`${window.location.pathname}${newUrl}`, { scroll: false });
    } catch {
      // noop
    }
  }, [router, searchParams]);

  const isNotFoundError = (error: any) => {
    const status = error?.response?.status;
    return status === 404;
  };

  const fetchLocationBySlug = useCallback(async (slug: string) => {
    const safeSlug = slug.trim();
    if (!safeSlug) return null;

    try {
      // Encode to avoid issues if slug contains spaces/special chars
      const response = await api.get(`/locations/${encodeURIComponent(safeSlug)}`);
      return response.data?.location || null;
    } catch (error: any) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  }, []);

  // Save location to localStorage
  const saveToLocalStorage = useCallback((locationData: LocationData) => {
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
        slug: locationData.slug,
        name: locationData.name,
        city: locationData.city,
        state: locationData.state,
        neighbourhood: locationData.neighbourhood,
      }));
      
      if (locationData.latitude && locationData.longitude) {
        localStorage.setItem(LOCATION_COORDS_KEY, JSON.stringify({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        }));
      }
    } catch (error) {
      console.error('Error saving location to localStorage:', error);
    }
  }, []);

  // Save location to user profile (if logged in)
  const saveToUserProfile = useCallback(async (locationData: LocationData) => {
    try {
      await api.put('/user/profile', {
        preferredLocation: {
          slug: locationData.slug,
          name: locationData.name,
          city: locationData.city,
          state: locationData.state,
          neighbourhood: locationData.neighbourhood,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
      });
    } catch (error) {
      // User might not be logged in, or API might not support this yet
      console.log('Could not save location to user profile:', error);
    }
  }, []);

  // Update URL with location (without triggering navigation)
  const updateUrlWithLocation = useCallback((locationSlug: string) => {
    // CRITICAL: Never update URL on ad details page
    // Ad details page must remain stable - no location-based URL changes
    if (typeof window !== 'undefined') {
      const isAdDetailsPage = window.location.pathname.match(/^\/ads\/[^/]+$/);
      const isOnAdDetailsPageFlag = sessionStorage.getItem('is_on_ad_details_page') === 'true';
      
      if (isAdDetailsPage || isOnAdDetailsPageFlag) {
        console.log('🛡️ Ad Details Page: Blocking URL update from useLocationPersistence');
        return; // Don't update URL on ad details page
      }
      
      // CRITICAL: Never update URL when navigating to home page
      // Allow navigation to home page without interference
      const isHomePage = window.location.pathname === '/';
      if (isHomePage) {
        // On home page, don't update URL with location params
        // Home page should work without location in URL
        return;
      }
    }
    
    const params = new URLSearchParams(searchParams.toString());
    if (locationSlug) {
      params.set('location', locationSlug);
    } else {
      params.delete('location');
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`${window.location.pathname}${newUrl}`, { scroll: false });
  }, [router, searchParams]);

  // Load location from localStorage on mount
  useEffect(() => {
    const loadPersistedLocation = async () => {
      try {
        // Priority: URL param > localStorage > user profile (if logged in)
        const locationFromUrl = searchParams.get('location');
        
        if (locationFromUrl) {
          // If URL has location, fetch details and use it
          try {
            const locData = await fetchLocationBySlug(locationFromUrl);
            if (locData) {
              const locationData: LocationData = {
                slug: locData.slug,
                name: locData.name,
                city: locData.city,
                state: locData.state,
                neighbourhood: locData.neighbourhood,
                latitude: locData.latitude,
                longitude: locData.longitude,
              };
              setLocation(locationData);
              saveToLocalStorage(locationData);
              setIsLoading(false);
              return;
            }
            
            // If slug in URL is invalid (404), clear it to avoid repeated console errors
            removeLocationParamFromUrl();
            localStorage.removeItem(LOCATION_STORAGE_KEY);
            localStorage.removeItem(LOCATION_COORDS_KEY);
          } catch (error) {
            console.warn('Invalid location in URL, clearing it.');
          }
        }

        // Try localStorage
        const storedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
        const storedCoords = localStorage.getItem(LOCATION_COORDS_KEY);
        
        if (storedLocation) {
          try {
            const locationData: LocationData = JSON.parse(storedLocation);
            // If we have coordinates stored separately, merge them
            if (storedCoords) {
              const coords = JSON.parse(storedCoords);
              locationData.latitude = coords.latitude;
              locationData.longitude = coords.longitude;
            }
            
            // If location doesn't have coordinates, try to fetch them
            if (!locationData.latitude || !locationData.longitude) {
              try {
                const locData = await fetchLocationBySlug(locationData.slug);
                if (locData) {
                  locationData.latitude = locData.latitude;
                  locationData.longitude = locData.longitude;
                  saveToLocalStorage(locationData);
                } else {
                  // Stored slug no longer exists in DB - clear persisted location
                  localStorage.removeItem(LOCATION_STORAGE_KEY);
                  localStorage.removeItem(LOCATION_COORDS_KEY);
                  setLocation(null);
                }
              } catch (error) {
                console.warn('Could not refresh location coordinates.');
              }
            }
            
            setLocation(locationData);
            
            // Update URL if not already set
            // CRITICAL: Only update if still on the same page (not navigating away)
            if (!locationFromUrl && typeof window !== 'undefined') {
              const currentPath = window.location.pathname;
              // Only update URL if we're on a page that should have location params
              // Don't update if navigating to home page
              if (currentPath === '/ads' || currentPath.startsWith('/ads?')) {
                updateUrlWithLocation(locationData.slug);
              }
            }
          } catch (error) {
            console.error('Error parsing stored location:', error);
            localStorage.removeItem(LOCATION_STORAGE_KEY);
            localStorage.removeItem(LOCATION_COORDS_KEY);
          }
        } else {
          // Try to load from user profile (if logged in)
          let userProfileLocationFound = false;
          try {
            const userResponse = await api.get('/user/profile');
            const userLocation = userResponse.data?.user?.preferredLocation;
            if (userLocation) {
              userProfileLocationFound = true;
              const locationData: LocationData = {
                slug: userLocation.slug,
                name: userLocation.name,
                city: userLocation.city,
                state: userLocation.state,
                neighbourhood: userLocation.neighbourhood,
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              };
              setLocation(locationData);
              saveToLocalStorage(locationData);
              // CRITICAL: Only update URL if still on a page that should have location
              // Don't update if navigating to home page
              if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname;
                if (currentPath === '/ads' || currentPath.startsWith('/ads?')) {
                  updateUrlWithLocation(locationData.slug);
                }
              }
            }
          } catch (error) {
            // User not logged in or no preferred location
            console.log('No user profile location found');
          }
          
          // If no location found yet (no localStorage, no user profile), try auto-detection
          if (!locationFromUrl && !userProfileLocationFound) {
            const hasTriedAutoDetect = localStorage.getItem('location_auto_detect_attempted');
            if (!hasTriedAutoDetect && typeof window !== 'undefined' && 'geolocation' in navigator) {
            // Mark that we've attempted auto-detection to prevent repeated attempts
            localStorage.setItem('location_auto_detect_attempted', 'true');
            
            // Auto-detect location using browser geolocation
            try {
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  const { latitude, longitude } = position.coords;
                  
                  // Validate coordinates before sending
                  if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
                      isNaN(latitude) || isNaN(longitude) ||
                      latitude < -90 || latitude > 90 || 
                      longitude < -180 || longitude > 180) {
                    console.log('Invalid coordinates from geolocation:', { latitude, longitude });
                    return;
                  }
                  
                  try {
                    // Call backend to detect location from coordinates
                    const response = await api.post('/geocoding/detect-location', {
                      latitude,
                      longitude,
                    });
                    
                    if (response.data?.success && response.data?.nearestLocation) {
                      const nearestLocation = response.data.nearestLocation;
                      const detectedLocation = response.data.detectedLocation;
                      
                      // Fetch full location details by slug
                      const locData = await fetchLocationBySlug(nearestLocation.slug);
                      
                      if (locData) {
                        const locationData: LocationData = {
                          slug: locData.slug,
                          name: locData.name,
                          city: locData.city || detectedLocation?.city,
                          state: locData.state || detectedLocation?.state,
                          neighbourhood: locData.neighbourhood || detectedLocation?.neighbourhood,
                          latitude: locData.latitude || latitude,
                          longitude: locData.longitude || longitude,
                        };
                        
                        // Set the detected location
                        setLocation(locationData);
                        saveToLocalStorage(locationData);
                        
                        // Try to save to user profile (async, don't block)
                        saveToUserProfile(locationData).catch(() => {
                          // Silently fail - user might not be logged in
                        });
                        
                        // Update URL if on appropriate page
                        if (typeof window !== 'undefined') {
                          const currentPath = window.location.pathname;
                          if (currentPath === '/ads' || currentPath.startsWith('/ads?')) {
                            updateUrlWithLocation(locationData.slug);
                          }
                        }
                        
                        console.log('✅ Auto-detected location:', locationData.name);
                      }
                    }
                  } catch (apiError: any) {
                    // Silently fail - auto-detection is optional
                    // Only log if it's not a 400 validation error (those are handled by API interceptor)
                    const status = apiError?.response?.status;
                    if (status !== 400) {
                      console.log('Auto-detection failed (optional):', apiError?.message || 'Unknown error');
                    } else {
                      // 400 errors are logged by API interceptor, just silently continue
                      console.log('Auto-detection validation failed - invalid coordinates or request');
                    }
                  }
                },
                (error) => {
                  // User denied permission or geolocation failed - that's okay
                  console.log('Geolocation permission denied or failed (optional):', error.message);
                },
                {
                  timeout: 5000, // 5 second timeout
                  maximumAge: 600000, // Accept cached position up to 10 minutes old
                  enableHighAccuracy: false, // Don't require high accuracy for faster response
                }
              );
            } catch (geolocationError) {
              // Geolocation API not available or error - that's okay
              console.log('Geolocation not available (optional):', geolocationError);
            }
            }
          }
        }
      } catch (error) {
        console.error('Error loading persisted location:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPersistedLocation();
  }, [fetchLocationBySlug, saveToLocalStorage, saveToUserProfile, updateUrlWithLocation, removeLocationParamFromUrl, searchParams]); // Run only on mount

  // Set location (persists to localStorage and user profile)
  const setPersistedLocation = useCallback(async (locationData: LocationData | null) => {
    if (locationData) {
      setLocation(locationData);
      saveToLocalStorage(locationData);
      updateUrlWithLocation(locationData.slug);
      
      // Try to save to user profile (async, don't block)
      saveToUserProfile(locationData).catch(() => {
        // Silently fail - user might not be logged in
      });
    } else {
      // Clear location
      setLocation(null);
      localStorage.removeItem(LOCATION_STORAGE_KEY);
      localStorage.removeItem(LOCATION_COORDS_KEY);
      updateUrlWithLocation('');
      
      // Clear from user profile
      try {
        await api.put('/user/profile', { preferredLocation: null });
      } catch (error) {
        // User might not be logged in
      }
    }
  }, [saveToLocalStorage, saveToUserProfile, updateUrlWithLocation]);

  // Get location data for API calls (includes coordinates for radius search)
  const getLocationFilters = useCallback(() => {
    if (!location) return {};
    
    const filters: {
      location?: string;
      latitude?: number;
      longitude?: number;
      radius?: number;
    } = {
      location: location.slug,
      radius: 50, // Default 50km radius
    };
    
    if (location.latitude && location.longitude) {
      filters.latitude = location.latitude;
      filters.longitude = location.longitude;
    }
    
    return filters;
  }, [location]);

  return {
    location,
    isLoading,
    setLocation: setPersistedLocation,
    getLocationFilters,
    clearLocation: () => setPersistedLocation(null),
  };
}

