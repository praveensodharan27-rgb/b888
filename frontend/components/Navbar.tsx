'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { FiMenu, FiX, FiUser, FiLogOut, FiHeart, FiPlus, FiSettings, FiShoppingBag, FiGrid, FiBriefcase, FiGlobe, FiBarChart2, FiMapPin, FiSearch, FiChevronDown, FiMessageCircle, FiShield, FiRefreshCw } from 'react-icons/fi';
import { useTranslation } from '@/hooks/useTranslation';
import { useComparison } from '@/hooks/useComparison';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';
import PlaceAutocompleteInputFirefox from './PlaceAutocompleteInputFirefox';
import { getCurrentPosition, isPermissionDenied } from '@/utils/geolocation';
import { parseLocationSlug, isLocationSlugValid, parsedSlugToLocationData } from '@/lib/locationSlug';
import NotificationIcon from './NotificationIcon';
import ImageWithFallback from './ImageWithFallback';
import { useAuthModal } from '@/contexts/AuthModalContext';
import CategoryChips from './CategoryChips';
import Translator from './Translator';
import { NAVBAR_CONTAINER_CLASS } from '@/lib/layoutConstants';
import { useQueryClient } from '@tanstack/react-query';
import { clearAllCache } from '@/utils/clearCache';
import toast from '@/lib/toast';
// Google Places API for location selection

declare global {
  interface Window {
    google: any;
  }
}

interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

// Logo component - smaller on mobile for better fit
function LogoImage() {
  return (
    <Image
      src="/logo.png?v=7"
      alt="Sell Box"
      width={200}
      height={56}
      className="h-10 sm:h-12 md:h-16 w-auto object-contain max-w-[140px] sm:max-w-[180px] md:max-w-[200px]"
      priority
    />
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal, openSignupModal } = useAuthModal();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isClearingCache, setIsClearingCache] = useState(false);
  const { count: comparisonCount, mounted: comparisonMounted } = useComparison();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  
  const locationSearchRef = useRef<HTMLDivElement | null>(null);
  const locationButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileLocationRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  
  // Google Places API - loaded by GooglePlacesLoader in AppClientRoot
  const { googlePlacesLoaded } = useGooglePlaces();
  const [locationInputValue, setLocationInputValue] = useState('');
  const [selectedPlaceLocation, setSelectedPlaceLocation] = useState<UserLocation | null>(null);

  // Search bar text animation state
  const [searchText, setSearchText] = useState('');
  const [searchPlaceholder, setSearchPlaceholder] = useState('');
  const [currentSearchExampleIndex, setCurrentSearchExampleIndex] = useState(0);
  const [showSearchCursor, setShowSearchCursor] = useState(true);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTypewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchCursorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const SEARCH_EXAMPLES = [
    'Find Cars, Mobile Phones and more...',
    'Buy smartphones near you',
    'Sell your bike quickly',
    'Discover local deals',
    'Post your ad in minutes'
  ];

  // Location: Google only – no states/cities API
  // Single source of truth for navbar location button label
  const locationDisplayLabel = useMemo(() => {
    const fromInput = (locationInputValue || locationSearchQuery || '').trim();
    return fromInput || 'All India';
  }, [locationInputValue, locationSearchQuery]);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // openLoginModal/openSignupModal events are handled by AuthModalProvider

  // CRITICAL: Load persisted location on mount AND on every navigation
  // This ensures location is always loaded from localStorage
  useEffect(() => {
    if (!mounted) return;
    
    // CRITICAL: Never load/redirect location on ad details page or home page
    // Ad details page must remain stable - no location-based redirects
    // Home page should not redirect to /ads - user can stay on home page
    const isAdDetailsPage = pathname.match(/^\/ads\/[^/]+$/);
    const isOnAdDetailsPageFlag = typeof window !== 'undefined' && sessionStorage.getItem('is_on_ad_details_page') === 'true';
    const isHomePage = pathname === '/';
    
    if (isAdDetailsPage || isOnAdDetailsPageFlag) return;
    
    if (isHomePage) {
      // On home page, just load location state but don't redirect
      const storedLocation = localStorage.getItem('selected_location');
      if (storedLocation) {
        try {
          const locationData = JSON.parse(storedLocation);
          const label = locationData.name || 'All India';
          setLocationSearchQuery(label);
          setLocationInputValue(label);
          setSelectedLocation(locationData.slug || '');
        } catch (error) {
          console.error('Error loading location on home page:', error);
        }
      }
      return;
    }
    
    const loadPersistedLocation = async () => {
      try {
        // Priority 1: Check localStorage first (persisted location - source of truth)
        const storedLocation = localStorage.getItem('selected_location');
        const storedCoords = localStorage.getItem('selected_location_coords');
        
        if (storedLocation) {
          const locationData = JSON.parse(storedLocation);
          let coords = null;
          if (storedCoords) {
            coords = JSON.parse(storedCoords);
          }
          
          // Check if URL has a different location (user explicitly selected new location)
          const locationFromUrl = searchParams.get('location');
          if (locationFromUrl && locationFromUrl !== locationData.slug) {
            setSelectedLocation(locationFromUrl);
            // Skip API for synthetic "All India" slugs - they don't exist in DB
            const locLower = locationFromUrl?.toLowerCase?.() || '';
            const isAllIndiaSlug = locLower === 'india' || locLower === 'all-india';
            if (isAllIndiaSlug) {
              setLocationSearchQuery('All India');
              setLocationInputValue('All India');
              return;
            }
            // Skip API for comma-separated display formats (e.g. "ernakulam,-kerala,-india")
            if (locationFromUrl.includes(',') || locationFromUrl.includes(', ')) {
              const displayName = locationFromUrl.replace(/,\s*-/g, ', ').replace(/^-|,\s*$/g, '').trim();
              setLocationSearchQuery(displayName || locationFromUrl);
              localStorage.setItem('selected_location', JSON.stringify({ slug: locationFromUrl, name: displayName || locationFromUrl }));
              return;
            }
            api.get(`/locations/${locationFromUrl}`)
              .then((response) => {
                const location = response.data?.location;
                if (location) {
                  // CRITICAL: Save new location to localStorage
                  try {
                    const newLocationData = {
                      slug: location.slug,
                      name: location.name,
                      city: location.city,
                      state: location.state,
                      neighbourhood: location.neighbourhood,
                    };
                    localStorage.setItem('selected_location', JSON.stringify(newLocationData));
                    if (location.latitude && location.longitude) {
                      localStorage.setItem('selected_location_coords', JSON.stringify({
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }));
                    }
                  } catch (error) {
                    console.error('❌ Error saving location to localStorage:', error);
                  }
                  
                  const { name, city, state, neighbourhood } = location;
                  if (neighbourhood && name === neighbourhood) {
                    setLocationSearchQuery(`${name}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}`);
                  } else if (city && name === city) {
                    setLocationSearchQuery(`${name}${state ? `, ${state}` : ''}`);
                  } else {
                    setLocationSearchQuery(name);
                  }
                }
              })
              .catch(() => {
                setLocationSearchQuery(locationFromUrl);
              });
            return;
          }
          
          // Use persisted location from localStorage
          // Skip API for synthetic "All India" slugs - they don't exist in DB
          const slugLower = (locationData.slug || '').toLowerCase();
          const isAllIndiaSlug = slugLower === 'india' || slugLower === 'all-india';
          if (isAllIndiaSlug) {
            const label = locationData.name || 'All India';
            setLocationSearchQuery(label);
            setLocationInputValue(label);
            setSelectedLocation(locationData.slug);
            return;
          }
          if (!coords || !coords.latitude || !coords.longitude) {
            // Fetch coordinates if missing
            try {
              const response = await api.get(`/locations/${locationData.slug}`);
              const location = response.data?.location;
              if (location) {
                
                // Update localStorage with coordinates
                if (location.latitude && location.longitude) {
                  localStorage.setItem('selected_location_coords', JSON.stringify({
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }));
                  
                  // CRITICAL: Never redirect from ad details page or home page
                  const isAdDetailsPage = pathname.match(/^\/ads\/[^/]+$/);
                  const isOnAdDetailsPageFlag = typeof window !== 'undefined' && sessionStorage.getItem('is_on_ad_details_page') === 'true';
                  const isHomePage = pathname === '/';
                  
                  if (!isAdDetailsPage && !isOnAdDetailsPageFlag && !isHomePage) {
                    // Update URL with persisted location and coordinates
                    // Only update if on /ads page, not on home page
                    if (pathname === '/ads') {
                      const newParams = new URLSearchParams(searchParams.toString());
                      newParams.set('location', locationData.slug);
                      newParams.set('latitude', String(location.latitude));
                      newParams.set('longitude', String(location.longitude));
                      newParams.set('radius', '50');
                      router.replace(`/ads?${newParams.toString()}`, { scroll: false });
                    }
                  }
                }
                
                const { name, city, state, neighbourhood } = location;
                const displayText = neighbourhood && name === neighbourhood
                  ? `${name}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}`
                  : city && name === city ? `${name}${state ? `, ${state}` : ''}` : name || '';
                setLocationSearchQuery(displayText);
                setLocationInputValue(displayText);
                setSelectedLocation(locationData.slug);
              }
            } catch (error) {
              // Use stored data even if fetch fails
              const label = locationData.name || 'All India';
              setLocationSearchQuery(label);
              setLocationInputValue(label);
              setSelectedLocation(locationData.slug);
              
              // CRITICAL: Never redirect from ad details page or home page
              const isAdDetailsPage = pathname.match(/^\/ads\/[^/]+$/);
              const isOnAdDetailsPageFlag = typeof window !== 'undefined' && sessionStorage.getItem('is_on_ad_details_page') === 'true';
              const isHomePage = pathname === '/';
              
              if (!isAdDetailsPage && !isOnAdDetailsPageFlag && !isHomePage) {
                // Only update URL if on /ads page, not on home page
                if (pathname === '/ads') {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.set('location', locationData.slug);
                  router.replace(`/ads?${newParams.toString()}`, { scroll: false });
                }
              }
            }
          } else {
            // We have coordinates, use stored data directly
            if (locationData.state) setSelectedState(locationData.state);
            if (locationData.city) setSelectedCity(locationData.city);
            const label = locationData.name || 'All India';
            setLocationSearchQuery(label);
            setLocationInputValue(label);
            setSelectedLocation(locationData.slug);
            
            // CRITICAL: Never redirect from ad details page or home page
            const isAdDetailsPage = pathname.match(/^\/ads\/[^/]+$/);
            const isOnAdDetailsPageFlag = typeof window !== 'undefined' && sessionStorage.getItem('is_on_ad_details_page') === 'true';
            const isHomePage = pathname === '/';
            
            // Update URL with persisted location and coordinates (if not already there)
            // Only update if on /ads page, not on home page
            if (!searchParams.get('location') && !isAdDetailsPage && !isOnAdDetailsPageFlag && !isHomePage && pathname === '/ads') {
              const newParams = new URLSearchParams(searchParams.toString());
              newParams.set('location', locationData.slug);
              newParams.set('latitude', String(coords.latitude));
              newParams.set('longitude', String(coords.longitude));
              newParams.set('radius', '50');
              router.replace(`/ads?${newParams.toString()}`, { scroll: false });
            }
          }
        } else {
          // No persisted location - check URL
          const locationFromUrl = searchParams.get('location');
          if (locationFromUrl) {
            // URL has location but no localStorage - save it
            setSelectedLocation(locationFromUrl);
            // Skip API for synthetic "All India" slugs
            const locLower = locationFromUrl?.toLowerCase?.() || '';
            const isAllIndiaSlug = locLower === 'india' || locLower === 'all-india';
            if (isAllIndiaSlug) {
              setLocationSearchQuery('All India');
              setLocationInputValue('All India');
              localStorage.setItem('selected_location', JSON.stringify({ slug: locationFromUrl, name: 'All India' }));
              return;
            }
            // Skip API for comma-separated display formats
            if (locationFromUrl.includes(',') || locationFromUrl.includes(', ')) {
              const displayName = locationFromUrl.replace(/,\s*-/g, ', ').trim();
              const label = displayName || locationFromUrl;
              setLocationSearchQuery(label);
              setLocationInputValue(label);
              localStorage.setItem('selected_location', JSON.stringify({ slug: locationFromUrl, name: label }));
              return;
            }
            api.get(`/locations/${locationFromUrl}`)
              .then((response) => {
                const location = response.data?.location;
                if (location) {
                  try {
                    const locationData = {
                      slug: location.slug,
                      name: location.name,
                      city: location.city,
                      state: location.state,
                      neighbourhood: location.neighbourhood,
                    };
                    localStorage.setItem('selected_location', JSON.stringify(locationData));
                    if (location.latitude && location.longitude) {
                      localStorage.setItem('selected_location_coords', JSON.stringify({
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }));
                    }
                  } catch (error) {
                    console.error('Error saving location:', error);
                  }
                  
                  const { name, city, state, neighbourhood } = location;
                  if (neighbourhood && name === neighbourhood) {
                    setLocationSearchQuery(`${name}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}`);
                  } else if (city && name === city) {
                    setLocationSearchQuery(`${name}${state ? `, ${state}` : ''}`);
                  } else {
                    setLocationSearchQuery(name);
                  }
                }
              })
              .catch(() => {
                setLocationSearchQuery(locationFromUrl);
              });
          } else {
            // No location anywhere - show "All India"
            setLocationSearchQuery('All India');
            setSelectedLocation('');
          }
        }
      } catch (error) {
        console.error('Error loading persisted location:', error);
        setLocationSearchQuery('All India');
        setSelectedLocation('');
      }
    };
    
    loadPersistedLocation();
  }, [mounted, pathname, searchParams]); // Run on mount AND on navigation (pathname/searchParams change)
  
  
  // Separate effect to handle URL location changes (only when user explicitly selects new location)
  useEffect(() => {
    if (!mounted) return;
    
    // CRITICAL: Never process location changes on ad details page
    // Ad details page must remain stable - no location-based redirects
    const isAdDetailsPage = pathname.match(/^\/ads\/[^/]+$/);
    const isOnAdDetailsPageFlag = typeof window !== 'undefined' && sessionStorage.getItem('is_on_ad_details_page') === 'true';
    
    if (isAdDetailsPage || isOnAdDetailsPageFlag) {
      return; // Exit early - don't process location on ad details page
    }
    
    const locationFromUrl = searchParams.get('location');
    
    // Only update if URL has location and it's different from current selection
    // This handles the case when user selects location from Navbar (which updates URL)
    if (locationFromUrl && locationFromUrl !== selectedLocation) {
      // Check if this is a user-initiated change (location exists in localStorage)
      const storedLocation = localStorage.getItem('selected_location');
      if (storedLocation) {
        const locationData = JSON.parse(storedLocation);
        // If URL location matches stored location, don't refetch (already loaded)
        if (locationData.slug === locationFromUrl) {
          return;
        }
      }
      
      // URL has new location - fetch and save it
      setSelectedLocation(locationFromUrl);
      // Skip API for synthetic "All India" slugs
      const locLower = locationFromUrl?.toLowerCase?.() || '';
      const isAllIndiaSlug = locLower === 'india' || locLower === 'all-india';
      if (isAllIndiaSlug) {
        setLocationSearchQuery('All India');
        localStorage.setItem('selected_location', JSON.stringify({ slug: locationFromUrl, name: 'All India' }));
        return;
      }
      // Skip API for comma-separated display formats
      if (locationFromUrl.includes(',') || locationFromUrl.includes(', ')) {
        const displayName = locationFromUrl.replace(/,\s*-/g, ', ').trim();
        setLocationSearchQuery(displayName || locationFromUrl);
        localStorage.setItem('selected_location', JSON.stringify({ slug: locationFromUrl, name: displayName || locationFromUrl }));
        return;
      }
      api.get(`/locations/${locationFromUrl}`)
        .then((response) => {
          const location = response.data?.location;
          if (location) {
            // Save to localStorage
            try {
              const locationData = {
                slug: location.slug,
                name: location.name,
                city: location.city,
                state: location.state,
                neighbourhood: location.neighbourhood,
              };
              localStorage.setItem('selected_location', JSON.stringify(locationData));
              if (location.latitude && location.longitude) {
                localStorage.setItem('selected_location_coords', JSON.stringify({
                  latitude: location.latitude,
                  longitude: location.longitude,
                }));
              }
            } catch (error) {
              console.error('Error saving location:', error);
            }
            
            const { name, city, state, neighbourhood } = location;
            if (neighbourhood && name === neighbourhood) {
              setLocationSearchQuery(`${name}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}`);
            } else if (city && name === city) {
              setLocationSearchQuery(`${name}${state ? `, ${state}` : ''}`);
            } else {
              setLocationSearchQuery(name);
            }
          }
        })
        .catch(() => {
          setLocationSearchQuery(locationFromUrl);
        });
    }
  }, [searchParams.get('location'), mounted, selectedLocation]); // Only respond to location URL param changes

  // Handle place selection from Google Places (PlaceAutocompleteElement)
  const handlePlaceSelect = useCallback((result: { latitude: number; longitude: number; address: string; city?: string; state?: string }) => {
    const { latitude: lat, longitude: lng, address, city = '', state = '' } = result;
    setShowLocationDropdown(false);
    setSelectedPlaceLocation({ latitude: lat, longitude: lng, address });
    setLocationInputValue(address);
    setLocationSearchQuery(address);
    const slug = address.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setSelectedLocation(slug);

    try {
      const locationData = {
        slug,
        name: address,
        city,
        state,
        latitude: lat,
        longitude: lng,
      };
      localStorage.setItem('selected_location', JSON.stringify(locationData));
      localStorage.setItem('selected_location_coords', JSON.stringify({ latitude: lat, longitude: lng }));
      localStorage.setItem('google_location_data', JSON.stringify({ city, state, lat, lng, address }));

      const locationPayload = { latitude: lat, longitude: lng, address, city, state, slug };
      const isAdDetailsPage = pathname.match(/^\/ads\/[^/]+$/);
      const isOnAdDetailsPageFlag = typeof window !== 'undefined' && sessionStorage.getItem('is_on_ad_details_page') === 'true';

      if (isAdDetailsPage || isOnAdDetailsPageFlag) {
        window.dispatchEvent(new CustomEvent('locationChanged', { detail: locationPayload }));
        return;
      }

      window.dispatchEvent(new CustomEvent('locationChanged', { detail: locationPayload }));
      if (pathname === '/ads') {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('latitude', lat.toString());
        newParams.set('longitude', lng.toString());
        newParams.set('radius', '50');
        if (city) newParams.set('city', city);
        if (state) newParams.set('state', state);
        newParams.set('location', slug);
        router.push(`/ads?${newParams.toString()}`, { scroll: false });
      }
    } catch (error) {
      console.error('Error saving location:', error);
    }
  }, [pathname, searchParams, router]);

  // Load persisted location from localStorage and auto-detect if not found
  useEffect(() => {
    if (!mounted) return;
    
    // Hidden: No hardcoded default location - user selects from dropdown
    
    const loadLocation = async () => {
      try {
        // Priority 1: Check URL params
        const locationFromUrl = searchParams.get('location');
        if (locationFromUrl) {
          // Validate before API – invalid slug: skip API and don't clear (useLocationPersistence may clear)
          if (!isLocationSlugValid(locationFromUrl)) {
            return;
          }
          const parsed = parseLocationSlug(locationFromUrl);
          if (!parsed) return;
          // Synthetic (All India) – no API call
          if (parsed.name === 'All India') {
            setLocationInputValue('All India');
            localStorage.setItem('selected_location', JSON.stringify({ slug: parsed.slug, name: 'All India' }));
            return;
          }
          try {
            const response = await api.get(`/locations/${encodeURIComponent(locationFromUrl)}`);
            const locData = response.data?.location;
            if (locData) {
              setLocationInputValue(locData.name || locData.city || locationFromUrl);
              const locationToStore = {
                slug: locData.slug,
                name: locData.name,
                city: locData.city,
                state: locData.state,
                neighbourhood: locData.neighbourhood,
              };
              localStorage.setItem('selected_location', JSON.stringify(locationToStore));
              if (locData.latitude && locData.longitude) {
                localStorage.setItem('selected_location_coords', JSON.stringify({
                  latitude: locData.latitude,
                  longitude: locData.longitude,
                }));
              }
              return;
            }
            // API 200 but no location (edge case) – use parsed, keep URL
            const fallback = parsedSlugToLocationData(parsed);
            setLocationInputValue(fallback.name);
            localStorage.setItem('selected_location', JSON.stringify({ slug: fallback.slug, name: fallback.name, city: fallback.city, state: fallback.state }));
            return;
          } catch (error: any) {
            // 404 or network – use parsed data so UI shows location and we don't clear URL
            if (error?.response?.status === 404 || !error?.response) {
              const fallback = parsedSlugToLocationData(parsed);
              setLocationInputValue(fallback.name);
              localStorage.setItem('selected_location', JSON.stringify({ slug: fallback.slug, name: fallback.name, city: fallback.city, state: fallback.state }));
            }
            return;
          }
        }

        // Priority 2: Check localStorage
        const storedLocation = localStorage.getItem('selected_location');
        
        if (storedLocation) {
          const locationData = JSON.parse(storedLocation);
          if (locationData.name) {
            setLocationInputValue(locationData.name);
            return; // Found location in localStorage, exit early
          }
        }

        // Priority 3: Auto-detect DISABLED for performance
        // Location detection now only runs when user clicks "Detect Location" button
        // This prevents:
        // - Geolocation timeout errors on page load
        // - Reverse geocoding 403 errors
        // - Delayed page interactions
        const ENABLE_AUTO_LOCATION_DETECT = false;
        const hasTriedAutoDetect = localStorage.getItem('location_auto_detect_attempted');
        if (ENABLE_AUTO_LOCATION_DETECT && !hasTriedAutoDetect && typeof window !== 'undefined' && 'geolocation' in navigator) {
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

                  try {
                    const locResponse = await api.get(`/locations/${encodeURIComponent(nearestLocation.slug)}`);
                    const locData = locResponse.data?.location;
                    if (locData) {
                      const locationData = {
                        slug: locData.slug,
                        name: locData.name,
                        city: locData.city || detectedLocation?.city,
                        state: locData.state || detectedLocation?.state,
                        neighbourhood: locData.neighbourhood || detectedLocation?.neighbourhood,
                        latitude: locData.latitude || latitude,
                        longitude: locData.longitude || longitude,
                      };

                      localStorage.setItem('selected_location', JSON.stringify({
                        slug: locationData.slug,
                        name: locationData.name,
                        city: locationData.city,
                        state: locationData.state,
                        neighbourhood: locationData.neighbourhood,
                      }));
                      localStorage.setItem('selected_location_coords', JSON.stringify({
                        latitude: locationData.latitude,
                        longitude: locationData.longitude,
                      }));

                      const { name, city, state, neighbourhood } = locationData;
                      const displayText = neighbourhood && name === neighbourhood
                        ? `${name}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}`
                        : city && name === city ? `${name}${state ? `, ${state}` : ''}` : name || '';
                      setLocationInputValue(displayText);
                      setLocationSearchQuery(displayText);
                      setSelectedLocation(locationData.slug);

                      if (isAuthenticated) {
                        api.put('/user/profile', { preferredLocation: locationData }).catch(() => {});
                      }

                      const isAdDetailsPage = pathname.match(/^\/ads\/[^/]+$/);
                      const isOnAdDetailsPageFlag = typeof window !== 'undefined' && sessionStorage.getItem('is_on_ad_details_page') === 'true';

                      if (!isAdDetailsPage && !isOnAdDetailsPageFlag) {
                        const newParams = pathname === '/ads'
                          ? new URLSearchParams(searchParams.toString())
                          : new URLSearchParams();
                        newParams.set('location', locationData.slug);
                        if (locationData.latitude && locationData.longitude) {
                          newParams.set('latitude', String(locationData.latitude));
                          newParams.set('longitude', String(locationData.longitude));
                          newParams.set('radius', '50');
                        }
                        router.push(`/ads?${newParams.toString()}`, { scroll: false });
                      }
                    }
                  } catch (error) {
                    console.warn('Could not fetch location details:', error);
                  }
                }
              } catch (apiError: any) {
                if (apiError.response?.status !== 400) {
                  console.log('Auto-detection failed (optional):', apiError?.message || 'Unknown error');
                }
              }
            })
            .catch((err: { code?: number; message?: string }) => {
              const code = err?.code ?? 2;
              if (isPermissionDenied(code)) {
                console.log('Geolocation permission denied (optional):', err?.message);
              } else {
                localStorage.removeItem('location_auto_detect_attempted');
                console.log('Geolocation failed (optional, retry allowed):', err?.message);
              }
            });
        }
      } catch (error) {
        console.error('Error loading location:', error);
      }
    };
    
    loadLocation();
  }, [mounted, isAuthenticated, user, searchParams]);

  // Clear location (All India)
  const handleLocationChange = (locationSlug: string) => {
    if (locationSlug) {
      setShowLocationDropdown(false);
      return;
    }
    // Clear location
    setLocationSearchQuery('All India');
    setLocationInputValue('All India');
    setSelectedLocation('');
    setSelectedPlaceLocation(null);
    try {
      localStorage.removeItem('selected_location');
      localStorage.removeItem('selected_location_coords');
      localStorage.removeItem('google_location_data');
      api.put('/user/profile', { preferredLocation: null }).catch(() => {});
    } catch (error) {
      console.error('❌ Error clearing location from localStorage:', error);
    }
    // Notify home page and other consumers to clear location filter
    window.dispatchEvent(new CustomEvent('locationChanged', { detail: null }));
    const isAdDetailsPage = pathname.match(/^\/ads\/[^/]+$/);
    const isOnAdDetailsPageFlag = typeof window !== 'undefined' && sessionStorage.getItem('is_on_ad_details_page') === 'true';
    if (!isAdDetailsPage && !isOnAdDetailsPageFlag && pathname !== '/') {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('location');
      newParams.delete('latitude');
      newParams.delete('longitude');
      newParams.delete('radius');
      newParams.delete('city');
      newParams.delete('state');
      router.push(`/ads?${newParams.toString()}`, { scroll: false });
    }
    setShowLocationDropdown(false);
  };

  // Custom location search handler - no Google Places needed

  // Close user menu on outside click or ESC key (but NOT on mouse leave)
  useEffect(() => {
    if (!userMenuOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (userMenuRef.current && target && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  // Update dropdown position when open (for portal) - keeps it aligned with trigger, prevents cut-off
  const updateDropdownPosition = useCallback(() => {
    const dropdownWidth = Math.min(420, (typeof window !== 'undefined' ? window.innerWidth : 420) - 32);
    const dropdownHeight = 380;
    if (typeof window === 'undefined') return;
    if (!locationButtonRef.current) {
      // Fallback: position below navbar (top-left) so dropdown always shows
      setDropdownPosition({ top: 72, left: 16 });
      return;
    }
    const rect = locationButtonRef.current.getBoundingClientRect();
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - dropdownWidth - 16);
    }
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= dropdownHeight ? rect.bottom + 8 : Math.max(8, rect.top - dropdownHeight - 8);
    setDropdownPosition({ top: Math.max(8, Math.min(top, window.innerHeight - dropdownHeight - 16)), left });
  }, []);

  useEffect(() => {
    if (showLocationDropdown) {
      updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      const handleScroll = () => updateDropdownPosition();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true); // capture phase to catch scroll in any container
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    } else {
      setDropdownPosition(null);
    }
  }, [showLocationDropdown, updateDropdownPosition]);

  // Close location dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inDesktop = locationSearchRef.current?.contains(target);
      const inMobile = mobileLocationRef.current?.contains(target);
      const inDropdown = (event.target as HTMLElement).closest?.('[data-location-dropdown]');
      if (!inDesktop && !inMobile && !inDropdown) setShowLocationDropdown(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLocationDropdown(false);
    };

    if (showLocationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showLocationDropdown]);

  // Search bar cursor blinking animation
  useEffect(() => {
    if (searchText) {
      setShowSearchCursor(false);
      if (searchCursorIntervalRef.current) {
        clearInterval(searchCursorIntervalRef.current);
      }
      return;
    }

    searchCursorIntervalRef.current = setInterval(() => {
      setShowSearchCursor(prev => !prev);
    }, 530);

    return () => {
      if (searchCursorIntervalRef.current) {
        clearInterval(searchCursorIntervalRef.current);
      }
    };
  }, [searchText]);

  // Search bar typewriter effect for placeholder
  useEffect(() => {
    if (searchText) {
      setSearchPlaceholder('');
      if (searchTypewriterTimeoutRef.current) {
        clearTimeout(searchTypewriterTimeoutRef.current);
      }
      return;
    }

    const currentExample = SEARCH_EXAMPLES[currentSearchExampleIndex];
    let charIndex = 0;
    let isActive = true;

    const typeChar = () => {
      if (!isActive || searchText) return;

      if (charIndex < currentExample.length) {
        setSearchPlaceholder(currentExample.substring(0, charIndex + 1));
        charIndex++;
        searchTypewriterTimeoutRef.current = setTimeout(typeChar, 80);
      } else {
        searchTypewriterTimeoutRef.current = setTimeout(() => {
          const deleteChars = () => {
            if (!isActive || searchText) return;

            if (charIndex > 0) {
              setSearchPlaceholder(currentExample.substring(0, charIndex - 1));
              charIndex--;
              searchTypewriterTimeoutRef.current = setTimeout(deleteChars, 40);
            } else {
              setCurrentSearchExampleIndex((prev) => (prev + 1) % SEARCH_EXAMPLES.length);
            }
          };
          deleteChars();
        }, 2000);
      }
    };

    searchTypewriterTimeoutRef.current = setTimeout(typeChar, 500);

    return () => {
      isActive = false;
      if (searchTypewriterTimeoutRef.current) {
        clearTimeout(searchTypewriterTimeoutRef.current);
      }
    };
  }, [searchText, currentSearchExampleIndex]);

  return (
    <>
      {/* Navbar: 72px main bar, sticky, Inter font, 20px logo–location gap, 16px item gap */}
      <nav 
        className="sticky top-0 z-[100] w-full max-w-full bg-white border-b border-gray-200"
        style={{ overflow: 'visible', fontFamily: 'var(--font-inter), sans-serif' }}
        role="navigation"
      >
        <div className={`${NAVBAR_CONTAINER_CLASS} overflow-visible relative`} style={{ zIndex: 1000 }}>
          <div className="flex items-center h-[72px] overflow-visible shrink-0 gap-4">
            {/* Left: Logo + Location with 20px gap */}
            <div className="flex items-center gap-5 flex-shrink-0 min-w-0">
              <Link href="/" className="flex items-center cursor-pointer flex-shrink-0 min-w-0">
                <LogoImage />
              </Link>
              {/* Location Selector (Dropdown) */}
              <div
                className="hidden md:flex items-center flex-shrink-0"
                ref={locationSearchRef}
                style={{ position: 'relative', zIndex: 1000 }}
              >
              <div className="relative">
                <button
                  ref={locationButtonRef}
                  type="button"
                  onClick={() => {
                    const next = !showLocationDropdown;
                    setShowLocationDropdown(next);
                    if (next) updateDropdownPosition();
                  }}
                  className="flex items-center gap-2 px-3 py-2 h-9 min-w-[140px] max-w-[220px] text-left rounded-lg border border-gray-200 bg-white hover:border-blue-400 hover:bg-gray-50 transition-all duration-200 text-sm"
                  aria-expanded={showLocationDropdown}
                  aria-haspopup="listbox"
                >
                  <FiMapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate font-bold text-base text-gray-900">
                    {locationDisplayLabel}
                  </span>
                  <FiChevronDown
                    className={`w-4 h-4 flex-shrink-0 text-gray-500 transition-transform duration-200 ${showLocationDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Location Dropdown - rendered via Portal to body so it isn't clipped/overlapped */}
                {showLocationDropdown && dropdownPosition && typeof document !== 'undefined' && createPortal(
                  <div
                    data-location-dropdown
                    className="fixed w-[420px] min-w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-gray-200 shadow-xl ring-1 ring-black/5 z-[99999]"
                    role="listbox"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                  >
                    <div className="p-4">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Choose location</p>
                      {/* All India - always visible at top */}
                      <button
                        type="button"
                        onClick={() => handleLocationChange('')}
                        className={`w-full px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 transition-all border ${
                          !selectedLocation
                            ? 'bg-blue-100 text-blue-900 font-semibold ring-1 ring-blue-300 border-blue-200'
                            : 'hover:bg-gray-100 text-gray-900 border-transparent'
                        }`}
                      >
                        <FiGlobe className="w-4 h-4 flex-shrink-0 text-blue-700" />
                        <span className="font-semibold">All India</span>
                      </button>
                      <p className="text-xs text-gray-500 mt-3 mb-1">Or search your city</p>
                      {googlePlacesLoaded ? (
                        <PlaceAutocompleteInputFirefox
                          visible={showLocationDropdown}
                          placeholder="e.g. Pune, Jaipur..."
                          value=""
                          onPlaceSelect={handlePlaceSelect}
                          includedRegionCodes={['in']}
                          includedPrimaryTypes={['locality', 'administrative_area_level_3']}
                          className="w-full"
                        />
                      ) : (
                        <div className="w-full px-3 py-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                          Loading...
                        </div>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>
            </div>

            {/* Center: Search Bar - 44px height, rounded 10px */}
            <div className="flex-1 flex items-center min-w-0">
              <div className="w-full min-w-0 bg-white border border-gray-200 rounded-[10px] flex items-center overflow-hidden hover:border-blue-400 focus-within:border-blue-500 transition-colors h-11 relative">
                <FiSearch className="w-4 h-4 text-gray-500 ml-2 sm:ml-3 flex-shrink-0" />
                <div className="flex-1 relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && searchText.trim()) {
                        // Use smart search parser
                        const { parseSearchQuery, buildSearchUrl, saveRecentSearch } = require('@/utils/searchParser');
                        const parsed = parseSearchQuery(searchText.trim());
                        saveRecentSearch(searchText.trim());
                        const searchUrl = buildSearchUrl(parsed);
                        router.push(searchUrl);
                      }
                    }}
                    placeholder=""
                    className="flex-1 min-w-0 px-2 sm:px-3 py-1 text-sm text-gray-700 border-none outline-none bg-transparent w-full h-full"
                    onFocus={() => {
                      setShowSearchSuggestions(true);
                    }}
                  />
                  {!searchText && (
                    <div className="absolute inset-0 flex items-center pointer-events-none px-2 sm:px-3">
                      <span className="text-sm text-gray-500">
                        {searchPlaceholder}
                        <span className={`inline-block w-0.5 h-3 bg-blue-500 ml-0.5 align-middle ${showSearchCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}>
                          {' '}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (searchText.trim()) {
                      const { parseSearchQuery, buildSearchUrl, saveRecentSearch } = require('@/utils/searchParser');
                      const parsed = parseSearchQuery(searchText.trim());
                      saveRecentSearch(searchText.trim());
                      const searchUrl = buildSearchUrl(parsed);
                      router.push(searchUrl);
                    } else {
                      router.push('/ads');
                    }
                  }}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 sm:px-4 py-2 flex items-center justify-center gap-1.5 transition-colors flex-shrink-0 h-full rounded-r-[10px] min-w-[44px]"
                >
                  <FiSearch className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Search</span>
                </button>
              </div>
            </div>

            {/* Right: Login / Sell / Profile - 16px gap */}
            <div className="flex items-center gap-4 flex-none min-w-fit overflow-visible" style={{ position: 'relative', zIndex: 1000 }}>
              {mounted && isAuthenticated ? (
                <>
                  {/* Desktop Nav Links - Hidden in reference style */}
                  <div className="hidden lg:flex items-center gap-3" style={{ overflow: 'visible' }}>
                    <Link
                      href="/chat"
                      className="relative text-gray-700 px-3 py-2 hover:bg-gray-50 flex items-center gap-2 transition-colors navbar-icon-hover"
                      title="Messages"
                    >
                      <FiMessageCircle className="w-6 h-6" />
                    </Link>
                    <div className="relative">
                      <NotificationIcon />
                    </div>
                    {comparisonMounted && comparisonCount > 0 && (
                      <Link
                        href="/compare"
                        className="relative text-gray-700 px-3 py-2 hover:bg-gray-50 flex items-center gap-2 navbar-icon-hover"
                        title="Compare Products"
                      >
                        <FiBarChart2 className="w-6 h-6" />
                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full">
                          {comparisonCount}
                        </span>
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <button 
                  onClick={() => openLoginModal()}
                  className="text-sm font-semibold text-gray-700 hover:text-gray-900 cursor-pointer py-2 px-1 min-h-[44px] flex items-center"
                >
                  Login
                </button>
              )}

              {/* Sell Button - #2563eb, 10px radius, 10px 18px padding */}
              <Link
                href="/post-ad"
                className="flex items-center justify-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold py-2.5 px-[18px] rounded-[10px] shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={(e) => {
                  if (!mounted || !isAuthenticated) {
                    e.preventDefault();
                    openLoginModal();
                  }
                }}
              >
                <FiPlus className="w-4 h-4 flex-shrink-0" />
                <span className="tracking-wide">SELL</span>
              </Link>

              {/* Profile Avatar */}
              {mounted && isAuthenticated && (
                <div
                  className="relative"
                  ref={userMenuRef}
                  style={{ zIndex: 1000 }}
                >
                  <button
                    type="button"
                    className="relative flex items-center justify-center cursor-pointer navbar-icon-hover flex-shrink-0"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                    onClick={() => setUserMenuOpen((v) => !v)}
                    title={user?.name || 'Profile'}
                  >
                    {/* Lookback Live: pulse ring around profile pic */}
                    <span
                      className="absolute -inset-0.5 rounded-full border-2 border-blue-500/50 pointer-events-none lookback-live-ring"
                      aria-hidden
                    />
                    <span className="relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-200 hover:border-blue-600 transition-colors bg-gray-100">
                      {user?.avatar ? (
                        <ImageWithFallback
                          src={user.avatar}
                          alt={user.name}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FiUser className="w-5 h-5 text-gray-500" />
                      )}
                    </span>
                  </button>

                    {userMenuOpen && (
                      <div
                        className="absolute right-0 w-56 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          zIndex: 99999,
                          marginTop: '8px',
                          display: 'block',
                          visibility: 'visible',
                          opacity: 1
                        }}
                      >
                        {/* Account Section */}
                        <div className="py-2">
                          <Link
                            href="/profile"
                            className="flex items-center gap-3 px-4 py-3 text-gray-800 hover:bg-blue-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                              <FiUser className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <span className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">My Profile</span>
                          </Link>
                          <Link
                            href="/settings"
                            className="flex items-center gap-3 px-4 py-3 text-gray-800 hover:bg-blue-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                              <FiSettings className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <span className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">Settings</span>
                          </Link>
                        </div>
                        
                        {/* Activity Section */}
                        <div className="border-t border-gray-200 py-2">
                          <Link
                            href="/my-ads"
                            className="flex items-center gap-3 px-4 py-3 text-gray-800 hover:bg-blue-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                              <FiGrid className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <span className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">My Ads</span>
                          </Link>
                          <Link
                            href="/favorites"
                            className="flex items-center gap-3 px-4 py-3 text-gray-800 hover:bg-blue-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                              <FiHeart className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <span className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">Favorites</span>
                          </Link>
                          <Link
                            href="/orders"
                            className="flex items-center gap-3 px-4 py-3 text-gray-800 hover:bg-blue-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                              <FiShoppingBag className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <span className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">My Orders</span>
                          </Link>
                        </div>
                        
                        {/* Business & Admin Section */}
                        <div className="border-t border-gray-200 py-2">
                          <Link
                            href="/business-package"
                            className="flex items-center gap-3 px-4 py-3 text-gray-800 hover:bg-blue-50 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                              <FiBriefcase className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <span className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">Business Package</span>
                          </Link>
                          {user?.role === 'ADMIN' && (
                            <Link
                              href="/admin"
                              className="flex items-center gap-3 px-4 py-3 text-gray-800 hover:bg-blue-50 transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                <FiShield className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                              </div>
                              <span className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">Admin Panel</span>
                            </Link>
                          )}
                        </div>
                        
                        {/* Clear cache – visible so updates show after refresh */}
                        <div className="border-t border-gray-200 py-2">
                          <button
                            type="button"
                            onClick={async () => {
                              setIsClearingCache(true);
                              try {
                                await clearAllCache(false);
                                queryClient.clear();
                                queryClient.invalidateQueries();
                                toast.success('Cache cleared. Page will show fresh data.');
                                setShowProfileDropdown(false);
                              } catch (e) {
                                toast.error('Failed to clear cache');
                              } finally {
                                setIsClearingCache(false);
                              }
                            }}
                            disabled={isClearingCache}
                            className="flex items-center gap-3 px-4 py-3 text-gray-800 hover:bg-blue-50 transition-colors group w-full disabled:opacity-60"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                              <FiRefreshCw className={`w-5 h-5 text-gray-700 group-hover:text-blue-600 ${isClearingCache ? 'animate-spin' : ''}`} />
                            </div>
                            <span className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">{isClearingCache ? 'Clearing...' : 'Clear cache & refresh'}</span>
                          </button>
                        </div>
                        {/* Logout Section */}
                        <div className="border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              logout();
                            }}
                            className="flex items-center gap-3 px-4 py-3 text-gray-800 hover:bg-red-50 transition-colors group w-full"
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                              <FiLogOut className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors" />
                            </div>
                            <span className="text-sm text-gray-800 group-hover:text-red-600 transition-colors">Logout</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Menu Button - always visible on mobile, never shrink */}
                <button
                  className="md:hidden shrink-0 text-gray-700 p-2.5 hover:bg-gray-100 rounded-lg transition-colors navbar-icon-hover min-w-[44px] min-h-[44px] flex items-center justify-center"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

        {/* Second Navbar: Categories – full-width background, no gap */}
        <div className="w-full border-t border-gray-200 bg-white">
          <CategoryChips />
        </div>

        {/* Mobile Menu - scrollable on small screens */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-gray-200 bg-white dark:bg-slate-800 max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain">
            
            {/* Location - Mobile */}
            <div className="px-4 py-3 border-b border-gray-100" ref={mobileLocationRef}>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Location</p>
              <button
                type="button"
                onClick={() => setShowLocationDropdown((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <FiMapPin className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-base font-bold text-gray-900 flex-1 truncate">{locationDisplayLabel}</span>
                <FiChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLocationDropdown && (
                <div className="mt-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100 overflow-visible">
                  {/* All India - top so always visible */}
                  <button
                    type="button"
                    onClick={() => { handleLocationChange(''); setMobileMenuOpen(false); }}
                    className={`w-full px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 mb-3 ${!selectedLocation ? 'bg-blue-100 text-blue-900 font-semibold ring-1 ring-blue-300' : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-200'}`}
                  >
                    <FiGlobe className="w-4 h-4 text-blue-700" />
                    <span className="font-semibold">All India</span>
                  </button>
                  {googlePlacesLoaded ? (
                    <>
                      <p className="text-xs text-gray-500 mb-2">Or search your city</p>
                      <PlaceAutocompleteInputFirefox
                        visible={showLocationDropdown}
                        placeholder="e.g. Kochi, Mumbai..."
                        value=""
                        onPlaceSelect={(r) => { handlePlaceSelect(r); setMobileMenuOpen(false); }}
                        includedRegionCodes={['in']}
                        includedPrimaryTypes={['locality', 'administrative_area_level_3']}
                        className="w-full"
                      />
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">Loading...</p>
                  )}
                </div>
              )}
            </div>

            {/* Translator - Mobile */}
            <div className="px-4 py-2 border-b border-gray-200">
              <Translator />
            </div>

            {/* Home Link - Mobile */}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 transition-colors"
            >
              Home
            </Link>
            
            {!mounted ? (
              <>
                <button
                  onClick={() => {
                    openLoginModal();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    openSignupModal();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 bg-blue-600 text-white transition-colors"
                >
                  Sign Up
                </button>
              </>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/post-ad"
                  className="block px-4 py-2 bg-blue-600 text-white font-semibold text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiPlus className="inline w-4 h-4 mr-1" /> + Post Ad
                </Link>
                <Link
                  href="/chat"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiMessageCircle className="text-blue-600" />
                  <span>Messages</span>
                </Link>
                <div className="px-4 py-2">
                  <NotificationIcon />
                </div>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.profile')}
                </Link>
                <Link
                  href="/favorites"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.favorites')}
                </Link>
                {comparisonMounted && comparisonCount > 0 && (
                  <Link
                    href="/compare"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 relative"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FiBarChart2 className="text-blue-600" />
                    <span>Compare</span>
                    <span className="ml-auto bg-blue-600 text-white text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full">
                      {comparisonCount}
                    </span>
                  </Link>
                )}
                {user?.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.admin')}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setIsClearingCache(true);
                    try {
                      await clearAllCache(false);
                      queryClient.clear();
                      queryClient.invalidateQueries();
                      toast.success('Cache cleared. Page will show fresh data.');
                      setMobileMenuOpen(false);
                    } catch (e) {
                      toast.error('Failed to clear cache');
                    } finally {
                      setIsClearingCache(false);
                    }
                  }}
                  disabled={isClearingCache}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-60"
                >
                  <FiRefreshCw className={isClearingCache ? 'animate-spin' : ''} />
                  {isClearingCache ? 'Clearing...' : 'Clear cache & refresh'}
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    openLoginModal();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => {
                    openSignupModal();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 bg-blue-600 text-white transition-colors"
                >
                  {t('nav.signUp')}
                </button>
                <Link
                  href="/post-ad"
                  className="block px-4 py-2 bg-blue-600 text-white font-semibold text-center mt-2 rounded-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    openLoginModal();
                  }}
                >
                  <FiPlus className="inline w-4 h-4 mr-1" /> Post Ad
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

    </>
  );
}
