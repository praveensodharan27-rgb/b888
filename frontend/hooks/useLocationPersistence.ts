import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentPosition, isPermissionDenied } from '@/utils/geolocation';
import { parseLocationSlug, isLocationSlugValid, parsedSlugToLocationData } from '@/lib/locationSlug';

const USER_PROFILE_QUERY_KEY = ['user', 'profile', 'location'] as const;

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
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileLocationFetchedRef = useRef(false);

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

    // Synthetic "All India" slugs don't exist in DB - return synthetic object without API call
    const slugLower = safeSlug.toLowerCase();
    const isAllIndiaSlug = slugLower === 'india' || slugLower === 'all-india';
    if (isAllIndiaSlug) {
      return {
        slug: safeSlug,
        name: 'All India',
        city: undefined,
        state: undefined,
        neighbourhood: undefined,
        latitude: undefined,
        longitude: undefined,
      };
    }

    // Comma-separated display formats (e.g. "ernakulam,-kerala,-india") are not valid slugs
    if (safeSlug.includes(',') || safeSlug.includes(', ')) {
      const displayName = safeSlug.replace(/,\s*-/g, ', ').replace(/^-|,\s*$/g, '').trim() || safeSlug;
      return {
        slug: safeSlug,
        name: displayName,
        city: undefined,
        state: undefined,
        neighbourhood: undefined,
        latitude: undefined,
        longitude: undefined,
      };
    }

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
    // Only try to save if user is authenticated
    if (!isAuthenticated) {
      return; // Silently skip if not authenticated
    }
    
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
    } catch (error: any) {
      // User might not be logged in, token expired, or API might not support this yet
      // Only log if it's not a 401 (expected when not authenticated)
      if (error?.response?.status !== 401) {
        console.log('Could not save location to user profile:', error?.message || 'Unknown error');
      }
    }
  }, [isAuthenticated]);

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

  const locationFromUrlParam = searchParams.get('location');
  const invalidSlugClearedRef = useRef<string | null>(null);

  // Load location from localStorage on mount (and when URL location param or auth changes)
  useEffect(() => {
    const loadPersistedLocation = async () => {
      try {
        const locationFromUrl = locationFromUrlParam ?? undefined;
        
        if (locationFromUrl) {
          // 1. Validate slug before any API call – invalid format → clear URL, no retry
          if (!isLocationSlugValid(locationFromUrl)) {
            removeLocationParamFromUrl();
            localStorage.removeItem(LOCATION_STORAGE_KEY);
            localStorage.removeItem(LOCATION_COORDS_KEY);
            setLocation(null);
            setIsLoading(false);
            return;
          }

          const parsed = parseLocationSlug(locationFromUrl);
          if (!parsed) {
            setIsLoading(false);
            return;
          }

          // 2. Synthetic slugs (india, all-india) – no API call
          if (parsed.name === 'All India') {
            const locationData: LocationData = {
              slug: parsed.slug,
              name: parsed.name,
              city: undefined,
              state: undefined,
              neighbourhood: undefined,
              latitude: undefined,
              longitude: undefined,
            };
            setLocation(locationData);
            saveToLocalStorage(locationData);
            setIsLoading(false);
            return;
          }

          // 3. Try API once; on 404 use parsed data and keep SEO slug in URL (no clear, no retry)
          if (invalidSlugClearedRef.current === locationFromUrl) {
            // Already resolved this slug via parsing – use parsed and avoid repeat API call
            const locationData: LocationData = { ...parsedSlugToLocationData(parsed) };
            setLocation(locationData);
            saveToLocalStorage(locationData);
            setIsLoading(false);
            return;
          }

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

            // API 404 but slug is valid – use parsed city/state/country, keep URL, no retry
            invalidSlugClearedRef.current = locationFromUrl;
            const fallbackData: LocationData = { ...parsedSlugToLocationData(parsed) };
            setLocation(fallbackData);
            saveToLocalStorage(fallbackData);
            setIsLoading(false);
            return;
          } catch (error: any) {
            if (isNotFoundError(error)) {
              invalidSlugClearedRef.current = locationFromUrl;
              const fallbackData: LocationData = { ...parsedSlugToLocationData(parsed) };
              setLocation(fallbackData);
              saveToLocalStorage(fallbackData);
            } else {
              console.warn('Location fetch failed (non-404):', error?.message ?? 'Unknown error');
            }
            setIsLoading(false);
            return;
          }
        }

        invalidSlugClearedRef.current = null;

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
            
            // If location doesn't have coordinates, try to fetch them (once); on 404 keep parsed data
            if (!locationData.latitude || !locationData.longitude) {
              try {
                const locData = await fetchLocationBySlug(locationData.slug);
                if (locData) {
                  locationData.latitude = locData.latitude;
                  locationData.longitude = locData.longitude;
                  saveToLocalStorage(locationData);
                } else {
                  const parsed = parseLocationSlug(locationData.slug);
                  if (parsed) {
                    locationData.name = parsed.name;
                    locationData.city = parsed.city || locationData.city;
                    locationData.state = parsed.state ?? locationData.state;
                    saveToLocalStorage(locationData);
                  } else {
                    localStorage.removeItem(LOCATION_STORAGE_KEY);
                    localStorage.removeItem(LOCATION_COORDS_KEY);
                    setLocation(null);
                  }
                }
              } catch (error) {
                const parsed = parseLocationSlug(locationData.slug);
                if (parsed) {
                  locationData.name = parsed.name;
                  locationData.city = parsed.city || locationData.city;
                  locationData.state = parsed.state ?? locationData.state;
                  saveToLocalStorage(locationData);
                }
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
          // Try to load from user profile (if logged in) - only once per session to avoid 429
          let userProfileLocationFound = false;
          if (isAuthenticated && !profileLocationFetchedRef.current) {
            profileLocationFetchedRef.current = true;
            try {
              const userResponse = await queryClient.fetchQuery({
                queryKey: USER_PROFILE_QUERY_KEY,
                queryFn: async () => {
                  const res = await api.get('/user/profile');
                  return res.data;
                },
                staleTime: 5 * 60 * 1000,
                gcTime: 10 * 60 * 1000,
              });
              const userLocation = userResponse?.user?.preferredLocation;
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
                if (typeof window !== 'undefined') {
                  const currentPath = window.location.pathname;
                  if (currentPath === '/ads' || currentPath.startsWith('/ads?')) {
                    updateUrlWithLocation(locationData.slug);
                  }
                }
              }
            } catch (error: any) {
              if (error?.response?.status !== 401) {
                console.log('No user profile location found:', error?.message || 'Unknown error');
              }
            }
          }
          
          // If no location found yet (no localStorage, no user profile), try auto-detection
          if (!locationFromUrl && !userProfileLocationFound) {
            const hasTriedAutoDetect = localStorage.getItem('location_auto_detect_attempted');
            if (!hasTriedAutoDetect && typeof window !== 'undefined' && 'geolocation' in navigator) {
              // Mark attempt - only block retry on PERMISSION_DENIED (user explicitly denied)
              localStorage.setItem('location_auto_detect_attempted', 'true');

              getCurrentPosition()
                .then(async ({ latitude, longitude }) => {
                  try {
                    const response = await api.post('/geocoding/detect-location', {
                      latitude,
                      longitude,
                    });

                    if (response.data?.success && response.data?.nearestLocation) {
                      const nearestLocation = response.data.nearestLocation;
                      const detectedLocation = response.data.detectedLocation;

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

                        setLocation(locationData);
                        saveToLocalStorage(locationData);
                        saveToUserProfile(locationData).catch(() => {});

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
                    const status = apiError?.response?.status;
                    if (status !== 400) {
                      console.log('Auto-detection failed (optional):', apiError?.message || 'Unknown error');
                    }
                  }
                })
                .catch((err: { code?: number; message?: string }) => {
                  const code = err?.code ?? 2;
                  const msg = err?.message ?? 'Geolocation failed';
                  // Only block retry when user explicitly denied - allow retry on timeout/unavailable (Firefox)
                  if (isPermissionDenied(code)) {
                    console.log('Geolocation permission denied (optional):', msg);
                  } else {
                    // Timeout or position unavailable - clear flag so user can retry
                    localStorage.removeItem('location_auto_detect_attempted');
                    console.log('Geolocation failed (optional, retry allowed):', msg);
                  }
                });
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
  }, [locationFromUrlParam, isAuthenticated, fetchLocationBySlug, saveToLocalStorage, saveToUserProfile, updateUrlWithLocation, removeLocationParamFromUrl]);

  // Sync when Navbar selects/changes location (locationChanged event)
  useEffect(() => {
    const handleLocationChanged = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail === null) {
        setLocation(null);
        return;
      }
      // Navbar wrote to localStorage - re-read to stay in sync
      try {
        const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
        const storedCoords = localStorage.getItem(LOCATION_COORDS_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          if (storedCoords) {
            const coords = JSON.parse(storedCoords);
            data.latitude = coords.latitude;
            data.longitude = coords.longitude;
          }
          setLocation(data);
        } else {
          setLocation(null);
        }
      } catch {
        setLocation(null);
      }
    };
    window.addEventListener('locationChanged', handleLocationChanged as EventListener);
    return () => window.removeEventListener('locationChanged', handleLocationChanged as EventListener);
  }, []);

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
      
      // Clear from user profile (only if authenticated)
      if (isAuthenticated) {
        try {
          await api.put('/user/profile', { preferredLocation: null });
        } catch (error: any) {
          // User might not be logged in or token expired
          // Only log if it's not a 401 (expected when not authenticated)
          if (error?.response?.status !== 401) {
            console.log('Could not clear location from user profile:', error?.message || 'Unknown error');
          }
        }
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

