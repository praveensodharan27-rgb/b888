'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { FiMenu, FiX, FiUser, FiLogOut, FiHeart, FiPlus, FiSettings, FiShoppingBag, FiGrid, FiBriefcase, FiGlobe, FiBarChart2, FiMapPin, FiSearch, FiCheck, FiMessageCircle } from 'react-icons/fi';
import { useTranslation } from '@/hooks/useTranslation';
import { useComparison } from '@/hooks/useComparison';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import NotificationIcon from './NotificationIcon';
import ImageWithFallback from './ImageWithFallback';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';
import CategoryChips from './CategoryChips';
import Translator from './Translator';
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

// Logo component
function LogoImage() {
  return (
    <Image
      src="/logo.png"
      alt="SellIt Logo"
      width={180}
      height={50}
      className="h-12 md:h-14 w-auto object-contain"
      priority
    />
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const { count: comparisonCount, mounted: comparisonMounted } = useComparison();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  
  // Debug: Log state changes (throttled to prevent spam)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('📍 Location State:', {
        selectedLocation,
        locationSearchQuery,
        selectedState,
        selectedCity,
        showLocationDropdown
      });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedLocation, locationSearchQuery, selectedState, selectedCity, showLocationDropdown]);
  const locationSearchRef = useRef<HTMLDivElement | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Google Places API state
  const [googlePlacesLoaded, setGooglePlacesLoaded] = useState(false);
  const [locationInputValue, setLocationInputValue] = useState('');
  const [selectedPlaceLocation, setSelectedPlaceLocation] = useState<UserLocation | null>(null);
  const autocompleteRef = useRef<any>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const handleFocusRef = useRef<(() => void) | null>(null);
  const [inputMounted, setInputMounted] = useState(false);

  // Search bar text animation state
  const [searchText, setSearchText] = useState('');
  const [searchPlaceholder, setSearchPlaceholder] = useState('');
  const [currentSearchExampleIndex, setCurrentSearchExampleIndex] = useState(0);
  const [showSearchCursor, setShowSearchCursor] = useState(true);
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

  // Fetch states (lightweight, cached)
  const { data: statesData, isLoading: statesLoading, error: statesError } = useQuery({
    queryKey: ['locations', 'states'],
    queryFn: async () => {
      try {
        const response = await api.get('/locations/states');
        console.log('📊 States API Response:', response.data);
        const states = response.data?.states || response.data || [];
        console.log('✅ States loaded:', states.length);
        return Array.isArray(states) ? states : [];
      } catch (error: any) {
        // Handle network errors gracefully - don't break the UI
        const isNetworkError = !error.response && error.message;
        if (isNetworkError) {
          console.warn('⚠️ Network error fetching states (backend may not be running):', error.message);
        } else {
          console.error('❌ Error fetching states:', error.response?.status || error.message);
        }
        // Return empty array - Navbar will work without states
        return [];
      }
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    retry: false, // Don't retry network errors (prevents console spam)
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid repeated errors
  });

  const states = Array.isArray(statesData) ? statesData : [];
  
  // Debug states (use length instead of array to prevent infinite loop)
  useEffect(() => {
    if (states.length > 0 || statesError) {
      console.log('📋 States:', {
        count: states.length,
        loading: statesLoading,
        error: statesError,
        data: states.slice(0, 5) // First 5 for debugging
      });
    }
  }, [states.length, statesLoading, statesError]); // Use states.length instead of states array

  // Fetch cities for selected state (dynamic loading)
  const { data: citiesData, isLoading: citiesLoading, error: citiesError } = useQuery({
    queryKey: ['locations', 'cities', selectedState],
    queryFn: async () => {
      if (!selectedState) {
        console.log('⏭️ No state selected, skipping cities fetch');
        return { cities: [], indexed: {} };
      }
      try {
        const url = `/locations/states/${encodeURIComponent(selectedState)}/cities`;
        console.log('🌆 Fetching cities for state:', selectedState, 'URL:', url);
        const response = await api.get(url);
        console.log('📊 Cities API Response:', response.data);
        const cities = response.data?.cities || [];
        const indexed = response.data?.indexed || {};
        console.log('✅ Cities loaded:', cities.length, 'Indexed keys:', Object.keys(indexed).length);
        console.log('🔍 Sample indexed structure:', {
          firstKey: Object.keys(indexed)[0],
          firstValue: indexed[Object.keys(indexed)[0]]?.slice(0, 1),
          citiesType: typeof cities[0],
          indexedType: typeof indexed[Object.keys(indexed)[0]]
        });
        return {
          cities: Array.isArray(cities) ? cities : [],
          indexed: indexed && typeof indexed === 'object' && !Array.isArray(indexed) ? indexed : {}
        };
      } catch (error: any) {
        // Handle network errors gracefully - don't break the UI
        const isNetworkError = !error.response && error.message;
        if (isNetworkError) {
          console.warn('⚠️ Network error fetching cities (backend may not be running):', error.message);
        } else {
          console.error('❌ Error fetching cities:', error.response?.status || error.message);
        }
        // Return empty arrays - Navbar will work without cities
        return { cities: [], indexed: {} };
      }
    },
    enabled: !!selectedState,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const cities = Array.isArray(citiesData?.cities) ? citiesData.cities : [];
  const citiesIndexed = citiesData?.indexed || {};
  
  // Build indexed structure from cities array if indexed is empty (fallback)
  const effectiveIndexed = useMemo(() => {
    if (citiesIndexed && typeof citiesIndexed === 'object' && !Array.isArray(citiesIndexed) && Object.keys(citiesIndexed).length > 0) {
      return citiesIndexed;
    }
    // Fallback: Build indexed structure from cities array
    const indexed: { [key: string]: any[] } = {};
    cities.forEach(city => {
      const cityObj = typeof city === 'string' ? { name: city, city: city } : city;
      const cityName = cityObj?.name || cityObj?.city || '';
      if (cityName) {
        const firstLetter = cityName.charAt(0).toUpperCase();
        if (!indexed[firstLetter]) {
          indexed[firstLetter] = [];
        }
        indexed[firstLetter].push(cityObj);
      }
    });
    return indexed;
  }, [citiesIndexed, cities]);
  
  // Debug: Log cities data structure
  useEffect(() => {
    if (selectedState && citiesData) {
      console.log('🔍 Cities Data Structure Check:', {
        citiesLength: cities.length,
        citiesSample: cities.slice(0, 2),
        indexedKeys: Object.keys(citiesIndexed),
        effectiveIndexedKeys: Object.keys(effectiveIndexed),
        indexedStructure: Object.keys(citiesIndexed).reduce((acc: any, key) => {
          acc[key] = Array.isArray(citiesIndexed[key]) ? citiesIndexed[key].length : 0;
          return acc;
        }, {}),
        citiesIndexedType: typeof citiesIndexed,
        isIndexedObject: citiesIndexed && typeof citiesIndexed === 'object' && !Array.isArray(citiesIndexed)
      });
    }
  }, [selectedState, citiesData, cities.length, citiesIndexed, effectiveIndexed]);
  
  // Debug cities (use useMemo for indexed keys to prevent infinite loop)
  const indexedKeysString = useMemo(() => {
    return Object.keys(effectiveIndexed).sort().join(',');
  }, [effectiveIndexed]);
  
  useEffect(() => {
    if (selectedState && (cities.length > 0 || citiesError)) {
      console.log('🌆 Cities for', selectedState, ':', {
        count: cities.length,
        loading: citiesLoading,
        error: citiesError,
        indexedKeys: Object.keys(citiesIndexed),
        effectiveIndexedKeys: Object.keys(effectiveIndexed),
        indexedStructure: Object.keys(effectiveIndexed).reduce((acc: any, key) => {
          acc[key] = Array.isArray(effectiveIndexed[key]) ? effectiveIndexed[key].length : 0;
          return acc;
        }, {}),
        sampleCities: cities.slice(0, 3),
        sampleIndexed: effectiveIndexed[Object.keys(effectiveIndexed)[0]]?.slice(0, 2) || []
      });
    }
  }, [selectedState, cities.length, citiesLoading, citiesError, indexedKeysString, effectiveIndexed]); // Use memoized indexed keys string

  // Fetch local areas for selected city (dynamic loading)
  const { data: areasData } = useQuery({
    queryKey: ['locations', 'areas', selectedCity, selectedState],
    queryFn: async () => {
      if (!selectedCity) return { areas: [] };
      const url = `/locations/cities/${encodeURIComponent(selectedCity)}/areas${selectedState ? `?state=${encodeURIComponent(selectedState)}` : ''}`;
      const response = await api.get(url);
      return { areas: response.data.areas || [] };
    },
    enabled: !!selectedCity,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const localAreas = areasData?.areas || [];

  // Combine cities and local areas for search
  const locations = [...cities, ...localAreas];

  // Debounced search for better performance
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Enhanced location filtering with debouncing and state-wise search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = locationSearchQuery.trim().toLowerCase();
    
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Debounce search for better performance
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let filtered = [];
        
        // If state is selected, search within that state's cities AND local areas
        if (selectedState) {
          try {
            const response = await api.get(`/locations/states/${encodeURIComponent(selectedState)}/cities?q=${encodeURIComponent(query)}`);
            // When searching, API returns full location objects (cities + areas)
            filtered = Array.isArray(response.data?.cities) ? response.data.cities : [];
            console.log('State search results (cities + areas):', filtered.length, filtered);
          } catch (stateError: any) {
            // If state-specific search fails, fallback to global search
            console.warn('State search failed, falling back to global search:', stateError.message);
            try {
              const response = await api.get(`/locations/mobile/search?q=${encodeURIComponent(query)}&limit=20`);
              filtered = Array.isArray(response.data?.locations) ? response.data.locations : [];
              console.log('Fallback global search results:', filtered.length, filtered);
            } catch (fallbackError: any) {
              console.error('Both state and global search failed:', fallbackError.message);
              filtered = [];
            }
          }
        } else {
          // Global search using API endpoint - returns both cities and local areas
          try {
            const response = await api.get(`/locations/mobile/search?q=${encodeURIComponent(query)}&limit=20`);
            filtered = Array.isArray(response.data?.locations) ? response.data.locations : [];
            console.log('Global search results (cities + areas):', filtered.length, filtered);
          } catch (searchError: any) {
            // If mobile/search endpoint fails, fallback to regular search
            console.warn('Mobile search endpoint failed, trying fallback:', searchError.message);
            try {
              // Fallback: Use /locations/list with query parameter
              const fallbackResponse = await api.get(`/locations/list?limit=20`);
              const allLocations = Array.isArray(fallbackResponse.data?.locations) ? fallbackResponse.data.locations : [];
              // Filter in client-side
              const searchLower = query.toLowerCase();
              filtered = allLocations.filter((loc: any) => {
                const name = (loc.name || '').toLowerCase();
                const city = (loc.city || '').toLowerCase();
                const state = (loc.state || '').toLowerCase();
                const neighbourhood = (loc.neighbourhood || '').toLowerCase();
                return name.includes(searchLower) || 
                       city.includes(searchLower) || 
                       state.includes(searchLower) || 
                       neighbourhood.includes(searchLower);
              }).slice(0, 20);
              console.log('Fallback search results:', filtered.length);
            } catch (fallbackError: any) {
              console.error('Both mobile search and fallback failed:', fallbackError.message);
              filtered = [];
            }
          }
        }
        
        setSearchResults(filtered.slice(0, 20));
      } catch (error: any) {
        console.error('Search error:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response,
          status: error.response?.status,
          url: error.config?.url
        });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce for API calls

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [locationSearchQuery, selectedState]); // Removed locations to prevent infinite loop

  // Use search results if query exists, otherwise show hierarchical navigation
  // Sort results: Cities first (no neighbourhood or name matches city), then local areas (OLX-style)
  const filteredLocations = useMemo(() => {
    if (locationSearchQuery.trim().length < 2 || !Array.isArray(searchResults)) {
      return [];
    }
    
    // Sort to prioritize cities over local areas (OLX-style behavior)
    return [...searchResults].sort((a, b) => {
      // A location is a city if it has no neighbourhood field or the neighbourhood is null/empty
      // A location is a local area if it has a non-empty neighbourhood field
      const aIsCity = !a.neighbourhood || a.neighbourhood === null || a.neighbourhood === '';
      const bIsCity = !b.neighbourhood || b.neighbourhood === null || b.neighbourhood === '';
      
      // Cities come first, then local areas
      if (aIsCity && !bIsCity) return -1;
      if (!aIsCity && bIsCity) return 1;
      
      // Within same type, sort alphabetically
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [locationSearchQuery, searchResults]);
  
  // Debug: Log search state (removed filteredLocations from deps to prevent infinite loop)
  useEffect(() => {
    if (locationSearchQuery.trim().length >= 2) {
      console.log('🔍 Search Debug:', {
        query: locationSearchQuery,
        resultsCount: searchResults.length,
        filteredCount: filteredLocations.length,
        isSearching,
        selectedState
      });
    }
  }, [locationSearchQuery, searchResults, isSearching, selectedState]); // Removed filteredLocations to prevent infinite loop

  // Get selected location name for display - use useMemo to prevent recalculation
  // Use cities and localAreas directly instead of locations array to prevent infinite loop
  const currentSelectedLocation = useMemo(() => {
    const allLocations = [...cities, ...localAreas];
    return allLocations.find((loc: any) => loc.slug === selectedLocation);
  }, [cities, localAreas, selectedLocation]); // Use cities and localAreas instead of locations array

  // Get location display text in OLX style (compact breadcrumb format)
  const locationDisplayText = useMemo(() => {
    if (!currentSelectedLocation) {
      return 'All India';
    }
    
    // OLX-style display: Show name with context (City, State or Area, City, State)
    const { name, city, state, neighbourhood } = currentSelectedLocation;
    
    // If it's a neighbourhood, show: "Area, City, State"
    if (neighbourhood && name === neighbourhood) {
      return `${name}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}`;
    }
    
    // If it's a city, show: "City, State"
    if (city && name === city) {
      return `${name}${state ? `, ${state}` : ''}`;
    }
    
    // Otherwise show just the name
    return name || 'All India';
  }, [currentSelectedLocation]);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Allow any page to open the login modal (e.g. ad details -> chat click)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      setSignupModalOpen(false);
      setLoginModalOpen(true);
    };
    window.addEventListener('openLoginModal', handler as EventListener);
    return () => {
      window.removeEventListener('openLoginModal', handler as EventListener);
    };
  }, []);

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
    
    if (isAdDetailsPage || isOnAdDetailsPageFlag) {
      console.log('🛡️ Ad Details Page: Skipping location load to prevent redirect', { isAdDetailsPage, isOnAdDetailsPageFlag });
      return; // Exit early - don't process location on ad details page
    }
    
    if (isHomePage) {
      console.log('🛡️ Home Page: Skipping location redirect - user can stay on home page');
      // On home page, just load location state but don't redirect
      // Location will be used for filtering products on home page
      const storedLocation = localStorage.getItem('selected_location');
      if (storedLocation) {
        try {
          const locationData = JSON.parse(storedLocation);
          setLocationSearchQuery(locationData.name || 'All India');
          setSelectedLocation(locationData.slug);
          if (locationData.state) setSelectedState(locationData.state);
          if (locationData.city) setSelectedCity(locationData.city);
        } catch (error) {
          console.error('Error loading location on home page:', error);
        }
      }
      return; // Exit early - don't redirect from home page
    }
    
    const loadPersistedLocation = async () => {
      try {
        // Priority 1: Check localStorage first (persisted location - source of truth)
        const storedLocation = localStorage.getItem('selected_location');
        const storedCoords = localStorage.getItem('selected_location_coords');
        
        console.log('📍 Loading persisted location from localStorage:', {
          hasStoredLocation: !!storedLocation,
          hasStoredCoords: !!storedCoords,
        });
        
        if (storedLocation) {
          const locationData = JSON.parse(storedLocation);
          let coords = null;
          if (storedCoords) {
            coords = JSON.parse(storedCoords);
          }
          
          console.log('✅ Found persisted location:', {
            slug: locationData.slug,
            name: locationData.name,
            hasCoords: !!(coords && coords.latitude && coords.longitude),
          });
          
          // Check if URL has a different location (user explicitly selected new location)
          const locationFromUrl = searchParams.get('location');
          if (locationFromUrl && locationFromUrl !== locationData.slug) {
            // URL has different location - user selected new location, save it
            console.log('📍 URL has different location, updating localStorage:', locationFromUrl);
            setSelectedLocation(locationFromUrl);
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
                    console.log('✅ Saved new location to localStorage:', newLocationData);
                    if (location.latitude && location.longitude) {
                      localStorage.setItem('selected_location_coords', JSON.stringify({
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }));
                      console.log('✅ Saved coordinates to localStorage');
                    }
                  } catch (error) {
                    console.error('❌ Error saving location to localStorage:', error);
                  }
                  
                  if (location.state) setSelectedState(location.state);
                  if (location.city) setSelectedCity(location.city);
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
          if (!coords || !coords.latitude || !coords.longitude) {
            // Fetch coordinates if missing
            try {
              const response = await api.get(`/locations/${locationData.slug}`);
              const location = response.data?.location;
              if (location) {
                if (location.state) setSelectedState(location.state);
                if (location.city) setSelectedCity(location.city);
                
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
                if (neighbourhood && name === neighbourhood) {
                  setLocationSearchQuery(`${name}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}`);
                } else if (city && name === city) {
                  setLocationSearchQuery(`${name}${state ? `, ${state}` : ''}`);
                } else {
                  setLocationSearchQuery(name);
                }
                setSelectedLocation(locationData.slug);
              }
            } catch (error) {
              // Use stored data even if fetch fails
              setLocationSearchQuery(locationData.name || 'All India');
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
            setLocationSearchQuery(locationData.name || 'All India');
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
                  
                  if (location.state) setSelectedState(location.state);
                  if (location.city) setSelectedCity(location.city);
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
            setSelectedState(null);
            setSelectedCity(null);
          }
        }
      } catch (error) {
        console.error('Error loading persisted location:', error);
        setLocationSearchQuery('All India');
        setSelectedLocation('');
        setSelectedState(null);
        setSelectedCity(null);
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
            
            if (location.state) setSelectedState(location.state);
            if (location.city) setSelectedCity(location.city);
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

  // Load Google Places API script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ Google Maps API key not found. Google Places autocomplete will not work.');
          return;
        }

    // Check if script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('✅ Google Places API already loaded');
      setGooglePlacesLoaded(true);
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    ) as HTMLScriptElement;
    
    if (existingScript) {
      if (existingScript.onload !== null || window.google) {
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            console.log('✅ Google Places API loaded from existing script');
            setGooglePlacesLoaded(true);
            clearInterval(checkLoaded);
          }
        }, 100);
        
        existingScript.addEventListener('load', () => {
          console.log('✅ Google Places API loaded from existing script (load event)');
          setGooglePlacesLoaded(true);
          clearInterval(checkLoaded);
        });
        
        setTimeout(() => {
          clearInterval(checkLoaded);
        }, 5000);
      } else {
        existingScript.addEventListener('load', () => {
          console.log('✅ Google Places API loaded from existing script');
          setGooglePlacesLoaded(true);
        });
        existingScript.addEventListener('error', () => {
          console.error('❌ Existing Google Places API script failed to load');
        });
      }
      return;
    }

    // Load Google Places API script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          console.log('✅ Google Places API loaded successfully in Navbar');
          setGooglePlacesLoaded(true);
          clearInterval(checkGoogleMaps);
        }
      }, 50);
      
      setTimeout(() => {
        clearInterval(checkGoogleMaps);
        if (window.google && window.google.maps && window.google.maps.places) {
          console.log('✅ Google Places API loaded successfully in Navbar (delayed check)');
          setGooglePlacesLoaded(true);
        } else {
          console.warn('⚠️ Google Places API script loaded but Google Maps not initialized');
        }
      }, 3000);
    };
    
    script.onerror = () => {
      console.error('❌ Failed to load Google Places API - check API key restrictions');
    };
    
    document.head.appendChild(script);
  }, []);

  // Initialize Google Places Autocomplete
  const initializeAutocomplete = useCallback(() => {
    if (!window.google || !window.google.maps || !window.google.maps.places || !locationInputRef.current) {
      console.warn('⚠️ Cannot initialize autocomplete - missing requirements');
      return;
    }

    // Clear existing autocomplete if any
    if (autocompleteRef.current) {
      try {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      } catch (e) {
        console.warn('Could not clear instance listeners:', e);
      }
    }

    try {
      // Create autocomplete instance
      const autocomplete = new window.google.maps.places.Autocomplete(
        locationInputRef.current,
        {
          types: ['(cities)'], // Restrict to cities
          fields: ['place_id', 'geometry', 'formatted_address', 'address_components'],
          componentRestrictions: { country: 'in' }, // Restrict to India
        }
      );

      autocompleteRef.current = autocomplete;

      // Function to ensure dropdown z-index is set and styled properly
      const ensureDropdownZIndex = () => {
        try {
          const pacContainer = document.querySelector('.pac-container') as HTMLElement;
          if (pacContainer) {
            pacContainer.style.zIndex = '99999';
            pacContainer.style.position = 'absolute';
            pacContainer.style.overflow = 'visible';
            pacContainer.style.borderRadius = '0.5rem';
            pacContainer.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
            pacContainer.style.marginTop = '4px';
            // Ensure parent containers don't clip
            let parent = pacContainer.parentElement;
            while (parent) {
              const computedStyle = window.getComputedStyle(parent);
              if (computedStyle.overflow === 'hidden' || computedStyle.overflowY === 'hidden') {
                parent.style.overflow = 'visible';
                parent.style.overflowY = 'visible';
              }
              parent = parent.parentElement;
            }
          }
        } catch (error) {
          console.warn('Error styling dropdown:', error);
        }
      };

      // Set z-index immediately
      ensureDropdownZIndex();

      // Watch for dropdown appearance using MutationObserver
      const observer = new MutationObserver(() => {
        ensureDropdownZIndex();
      });
      observerRef.current = observer;

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Also set z-index on input focus
      const handleFocus = () => {
        ensureDropdownZIndex();
        setTimeout(ensureDropdownZIndex, 100);
        setTimeout(ensureDropdownZIndex, 300);
      };
      handleFocusRef.current = handleFocus;

      if (locationInputRef.current) {
        locationInputRef.current.addEventListener('focus', handleFocus);
      }

      console.log('✅ Google Places Autocomplete initialized in Navbar');

      // Handle place selection
      try {
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          
          if (place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const address = place.formatted_address || place.name || '';

            // Extract city and state from address_components
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

            // Update location state
            setSelectedPlaceLocation({
              latitude: lat,
              longitude: lng,
              address: address,
            });

            // Update input value
            setLocationInputValue(address);

            // Save to localStorage (both old format and new Google location format)
            try {
              const locationData = {
                slug: address.toLowerCase().replace(/\s+/g, '-'),
                name: address,
                city: city,
                state: state,
                latitude: lat,
                longitude: lng,
              };
              localStorage.setItem('selected_location', JSON.stringify(locationData));
              localStorage.setItem('selected_location_coords', JSON.stringify({
                latitude: lat,
                longitude: lng,
              }));
              
              // Also save to Google location format
              const googleLocationData = {
                city: city,
                state: state,
                lat: lat,
                lng: lng,
                address: address,
              };
              localStorage.setItem('google_location_data', JSON.stringify(googleLocationData));
              
              // CRITICAL: Never redirect from ad details page (/ads/[id])
              // Ad details page must remain stable - location changes should not affect it
              const isAdDetailsPage = pathname.match(/^\/ads\/[^/]+$/);
              const isOnAdDetailsPageFlag = typeof window !== 'undefined' && sessionStorage.getItem('is_on_ad_details_page') === 'true';
              
              if (isAdDetailsPage || isOnAdDetailsPageFlag) {
                // On ad details page: Just save location silently, don't redirect
                console.log('🛡️ Ad Details Page: Google Places location changed but not redirecting');
                // Still dispatch event for other components, but don't navigate
                window.dispatchEvent(new CustomEvent('locationChanged', {
                  detail: { 
                    latitude: lat, 
                    longitude: lng, 
                    address,
                    city: city,
                    state: state
                  }
                }));
                return; // Exit early - don't navigate away from ad details page
              }
              
              // Only update URL if we're not on home page - stay on home page and just update products
              if (pathname !== '/') {
                // On other pages, navigate to ads page with location
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.set('latitude', lat.toString());
                newParams.set('longitude', lng.toString());
                newParams.set('radius', '50');
                if (city) newParams.set('city', city);
                if (state) newParams.set('state', state);
                router.push(`/ads?${newParams.toString()}`, { scroll: false });
              } else {
                // On home page, just save location - products will update automatically
                // Trigger a custom event to notify home page components with full location data
                window.dispatchEvent(new CustomEvent('locationChanged', {
                  detail: { 
                    latitude: lat, 
                    longitude: lng, 
                    address,
                    city: city,
                    state: state
                  }
                }));
              }
              
              console.log('✅ Location saved from Google Places:', address);
            } catch (error) {
              console.error('Error saving location:', error);
            }
          }
        });
      } catch (error) {
        console.error('❌ Error adding place_changed listener:', error);
      }
    } catch (error) {
      console.error('❌ Error creating Autocomplete:', error);
    }
  }, [searchParams, router]);

  // Detect when input is mounted
  useEffect(() => {
    if (locationInputRef.current) {
      setInputMounted(true);
    }
    
    const observer = new MutationObserver(() => {
      if (locationInputRef.current && !inputMounted) {
        setInputMounted(true);
      }
    });
    
    if (locationSearchRef.current) {
      observer.observe(locationSearchRef.current, {
        childList: true,
        subtree: true,
      });
    }
    
    const checkInterval = setInterval(() => {
      if (locationInputRef.current && !inputMounted) {
        setInputMounted(true);
      }
    }, 100);
    
    return () => {
      observer.disconnect();
      clearInterval(checkInterval);
    };
  }, [inputMounted]);

  // Initialize autocomplete when both Google Places is loaded AND input is mounted
  useEffect(() => {
    if (!googlePlacesLoaded) {
        return;
      }
      
    if (!locationInputRef.current) {
      return;
    }

    if (!window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }

    // Clear existing autocomplete if any before reinitializing
    if (autocompleteRef.current) {
      try {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      } catch (e) {
        console.warn('Could not clear existing autocomplete:', e);
      }
    }

    const initTimeout = setTimeout(() => {
      console.log('🔧 Initializing autocomplete in Navbar (input rendered, API loaded)');
      initializeAutocomplete();
    }, 100);

    return () => {
      clearTimeout(initTimeout);
      try {
        if (autocompleteRef.current && typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.event) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }
        if (locationInputRef.current && handleFocusRef.current) {
          locationInputRef.current.removeEventListener('focus', handleFocusRef.current);
          handleFocusRef.current = null;
        }
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    };
  }, [googlePlacesLoaded, inputMounted, initializeAutocomplete]);

  // Load persisted location from localStorage and auto-detect if not found
  useEffect(() => {
    if (!mounted) return;
    
    // Helper function to set default "India" location
    const setDefaultIndiaLocation = () => {
      // Only set if no location is already set
      if (!locationInputValue && !localStorage.getItem('selected_location')) {
        const indiaLocation = {
          slug: 'india',
          name: 'India',
          city: null,
          state: null,
          neighbourhood: null,
        };
        
        // Save to localStorage
        localStorage.setItem('selected_location', JSON.stringify(indiaLocation));
        
        // Update UI
        setLocationInputValue('India');
        setLocationSearchQuery('India');
        setSelectedLocation('india');
        
        console.log('✅ Set default location: India');
      }
    };
    
    const loadLocation = async () => {
      try {
        // Priority 1: Check URL params
        const locationFromUrl = searchParams.get('location');
        if (locationFromUrl) {
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
              return; // Found location from URL, exit early
            }
          } catch (error) {
            console.warn('Invalid location in URL, clearing it.');
          }
        }

        // Priority 2: Check localStorage
        const storedLocation = localStorage.getItem('selected_location');
        const storedCoords = localStorage.getItem('selected_location_coords');
        
        if (storedLocation) {
          const locationData = JSON.parse(storedLocation);
          if (locationData.name) {
            setLocationInputValue(locationData.name);
            return; // Found location in localStorage, exit early
          }
        }

        // Priority 3: Check user profile (if logged in)
        if (isAuthenticated && user) {
          try {
            const userResponse = await api.get('/user/profile');
            const userLocation = userResponse.data?.user?.preferredLocation;
            if (userLocation) {
              setLocationInputValue(userLocation.name || userLocation.city || '');
              const locationToStore = {
                slug: userLocation.slug,
                name: userLocation.name,
                city: userLocation.city,
                state: userLocation.state,
                neighbourhood: userLocation.neighbourhood,
              };
              localStorage.setItem('selected_location', JSON.stringify(locationToStore));
              if (userLocation.latitude && userLocation.longitude) {
                localStorage.setItem('selected_location_coords', JSON.stringify({
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                }));
              }
              return; // Found location in user profile, exit early
            }
          } catch (error) {
            console.log('No user profile location found');
          }
        }

        // Priority 4: Auto-detect location if not found and geolocation is available
        const hasTriedAutoDetect = localStorage.getItem('location_auto_detect_attempted');
        if (!hasTriedAutoDetect && typeof window !== 'undefined' && 'geolocation' in navigator) {
          localStorage.setItem('location_auto_detect_attempted', 'true');
          try {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude, longitude } = position.coords;
                // Validate coordinates before sending
                if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
                    isNaN(latitude) || isNaN(longitude) || 
                    latitude < -90 || latitude > 90 || 
                    longitude < -180 || longitude > 180) {
                  console.warn('Invalid geolocation coordinates received, skipping API call.');
                  return;
                }
                try {
                  const response = await api.post('/geocoding/detect-location', {
                    latitude,
                    longitude,
                  });
                  if (response.data?.success && response.data?.nearestLocation) {
                    const nearestLocation = response.data.nearestLocation;
                    const detectedLocation = response.data.detectedLocation;
                    
                    // Fetch full location details
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
                        
                        // Save to localStorage
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
                        
                        // Update UI
                        setLocationInputValue(locationData.name);
                        
                        // Update location state to match handleLocationChange behavior
                        if (locationData.state) setSelectedState(locationData.state);
                        if (locationData.city) setSelectedCity(locationData.city);
                        setSelectedLocation(locationData.slug);
                        
                        // Set location search query to display text
                        const { name, city, state, neighbourhood } = locationData;
                        if (neighbourhood && name === neighbourhood) {
                          setLocationSearchQuery(`${name}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}`);
                        } else if (city && name === city) {
                          setLocationSearchQuery(`${name}${state ? `, ${state}` : ''}`);
                        } else {
                          setLocationSearchQuery(name);
                        }
                        
                        // Save to user profile if logged in (async, don't block)
                        if (isAuthenticated) {
                          api.put('/user/profile', {
                            preferredLocation: locationData,
                          }).catch(() => {
                            // User might not be logged in, ignore
                          });
                        }
                        
                        // Update URL if on appropriate page (but not ad details page)
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
                        
                        console.log('✅ Auto-detected location:', locationData.name);
                      }
                    } catch (error) {
                      console.warn('Could not fetch location details:', error);
                    }
                  }
                } catch (apiError: any) {
                  if (apiError.response?.status !== 400) {
                    console.log('Auto-detection failed (optional):', apiError?.message || 'Unknown error');
                  }
                  // Set default "India" location when API call fails
                  setDefaultIndiaLocation();
                }
              },
              (error) => {
                console.log('Geolocation permission denied or failed (optional):', error.message);
                // Set default "India" location when geolocation fails
                setDefaultIndiaLocation();
              },
              {
                timeout: 5000,
                maximumAge: 600000,
                enableHighAccuracy: false,
              }
            );
          } catch (geolocationError) {
            console.log('Geolocation not available (optional):', geolocationError);
            // Set default "India" location when geolocation is not available
            setDefaultIndiaLocation();
          }
        } else {
          // No auto-detection attempted, set default "India" location
          setDefaultIndiaLocation();
        }
      } catch (error) {
        console.error('Error loading location:', error);
        // Set default "India" location on error
        setDefaultIndiaLocation();
      }
    };
    
    loadLocation();
  }, [mounted, isAuthenticated, user, searchParams]);

  const handleLocationChange = async (locationSlug: string) => {
    if (locationSlug) {
      const allLocations = [...cities, ...localAreas];
      const location = allLocations.find((loc: any) => loc.slug === locationSlug);
      
      if (location) {
      // Prepare location data for persistence
        const locationData = {
          slug: location.slug,
          name: location.name,
          city: location.city,
          state: location.state,
          neighbourhood: location.neighbourhood,
          latitude: location.latitude,
          longitude: location.longitude,
      };
      
      // Fetch full location details if coordinates are missing
      if (!locationData.latitude || !locationData.longitude) {
        try {
          const response = await api.get(`/locations/${locationSlug}`);
          const locData = response.data?.location;
          if (locData) {
              locationData.latitude = locData.latitude;
              locationData.longitude = locData.longitude;
          }
        } catch (error) {
          console.error('Error fetching location coordinates:', error);
        }
      }
      
      // CRITICAL: Save to localStorage FIRST - this is the source of truth
      try {
        const locationToStore = {
          slug: locationData.slug,
          name: locationData.name,
          city: locationData.city,
          state: locationData.state,
          neighbourhood: locationData.neighbourhood,
        };
        
        localStorage.setItem('selected_location', JSON.stringify(locationToStore));
        console.log('✅ [Navbar handleLocationChange] Saved location to localStorage:', locationToStore);
        
        // Verify it was saved
        const verifySaved = localStorage.getItem('selected_location');
        if (verifySaved) {
          console.log('✅ [Navbar handleLocationChange] Verified location saved:', JSON.parse(verifySaved));
    } else {
          console.error('❌ [Navbar handleLocationChange] Location save failed - not found in localStorage!');
        }
        
        if (locationData.latitude && locationData.longitude) {
          const coordsToStore = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
          };
          localStorage.setItem('selected_location_coords', JSON.stringify(coordsToStore));
          console.log('✅ [Navbar handleLocationChange] Saved coordinates to localStorage:', coordsToStore);
          
          // Verify coordinates were saved
          const verifyCoords = localStorage.getItem('selected_location_coords');
          if (verifyCoords) {
            console.log('✅ [Navbar handleLocationChange] Verified coordinates saved:', JSON.parse(verifyCoords));
          }
        }
        
        // Try to save to user profile if logged in (async, don't block)
        api.put('/user/profile', {
          preferredLocation: locationData,
        }).catch(() => {
          // User might not be logged in, ignore
        });
      } catch (error) {
        console.error('❌ Error saving location to localStorage:', error);
      }
      
        // Set location search query to display text (OLX style)
      const { name, city, state, neighbourhood } = location;
      if (neighbourhood && name === neighbourhood) {
          setLocationSearchQuery(`${name}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}`);
      } else if (city && name === city) {
          setLocationSearchQuery(`${name}${state ? `, ${state}` : ''}`);
        } else {
          setLocationSearchQuery(name);
      }
      
        // Set state and city if location has them
        if (location.state) setSelectedState(location.state);
        if (location.city) setSelectedCity(location.city);
      setSelectedLocation(locationSlug);
      
      // CRITICAL: Never redirect from ad details page (/ads/[id])
      // Ad details page must remain stable - location changes should not affect it
      const isAdDetailsPage = pathname.match(/^\/ads\/[^/]+$/);
      const isOnAdDetailsPageFlag = typeof window !== 'undefined' && sessionStorage.getItem('is_on_ad_details_page') === 'true';
      
      if (isAdDetailsPage || isOnAdDetailsPageFlag) {
        // On ad details page: Just save location silently, don't redirect
        console.log('🛡️ Ad Details Page: Location changed but not redirecting');
        return; // Exit early - don't navigate away from ad details page
      }
      
      // Update URL immediately - navigate to /ads page with location filter
      // Preserve other params if already on /ads page, otherwise start fresh with location
      const newParams = pathname === '/ads' 
        ? new URLSearchParams(searchParams.toString())
        : new URLSearchParams();
      newParams.set('location', locationSlug);
      // Add coordinates to URL for backend radius filtering
      if (locationData.latitude && locationData.longitude) {
        newParams.set('latitude', String(locationData.latitude));
        newParams.set('longitude', String(locationData.longitude));
        newParams.set('radius', '50'); // Default 50km radius
      }
      // Navigate to /ads page when location is selected (but not from ad details page)
      router.push(`/ads?${newParams.toString()}`, { scroll: false });
      }
    } else {
      // Clear location
      setLocationSearchQuery('All India');
      setSelectedState(null);
      setSelectedCity(null);
      setSelectedLocation('');
      
      // Remove from localStorage
      try {
        localStorage.removeItem('selected_location');
        localStorage.removeItem('selected_location_coords');
        console.log('✅ Cleared location from localStorage');
        
        // Clear from user profile if logged in (async, don't block)
        api.put('/user/profile', { preferredLocation: null }).catch(() => {
          // User might not be logged in, ignore
        });
      } catch (error) {
        console.error('❌ Error clearing location from localStorage:', error);
      }
      
      // CRITICAL: Never redirect from ad details page
      const isAdDetailsPage = pathname.match(/^\/ads\/[^/]+$/);
      const isOnAdDetailsPageFlag = typeof window !== 'undefined' && sessionStorage.getItem('is_on_ad_details_page') === 'true';
      if (!isAdDetailsPage && !isOnAdDetailsPageFlag) {
        // Remove location from URL - preserve other params
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('location');
        newParams.delete('latitude');
        newParams.delete('longitude');
        newParams.delete('radius');
        router.push(`/ads?${newParams.toString()}`, { scroll: false });
      }
    }
    setShowLocationDropdown(false);
  };

  // Custom location search handler - no Google Places needed

  // Handle hover for user menu
  const handleMouseEnter = () => {
    setUserMenuOpen(true);
  };

  const handleMouseLeave = () => {
    setUserMenuOpen(false);
  };

  // Close location dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationSearchRef.current && !locationSearchRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };

    if (showLocationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
      <nav 
        className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm" 
        style={{ position: 'sticky', top: 0, zIndex: 50, overflow: 'visible' }}
        role="navigation"
      >
        {/* Main Navbar: Logo + Location + Search + Actions */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8" style={{ overflow: 'visible', position: 'relative', zIndex: 1000 }}>
          <div className="flex items-center gap-3 py-2" style={{ overflow: 'visible', position: 'relative', height: '4.5rem' }}>
            {/* Left: Logo */}
            <Link href="/" className="flex items-center gap-2 cursor-pointer flex-shrink-0">
              <LogoImage />
            </Link>
              
            {/* Location Selector (Dropdown) - Fixed Width */}
            <div 
              className="hidden md:flex items-center flex-shrink-0" 
              ref={locationSearchRef} 
              style={{ position: 'relative', zIndex: 1000, width: '180px', minWidth: '180px', maxWidth: '180px' }}
            >
              <div className="relative w-full">
                <button
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 cursor-pointer w-full"
                >
                  <FiMapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-left">
                    {locationInputValue || locationSearchQuery || 'Mumbai, India'}
                  </span>
                  <span className="material-symbols-outlined text-sm flex-shrink-0">expand_more</span>
                </button>
                
                {/* Location Dropdown */}
                {showLocationDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-2">
                      <input
                        ref={locationInputRef}
                        type="text"
                        placeholder="Search location..."
                        value={locationInputValue || ''}
                        onChange={(e) => {
                          setLocationInputValue(e.target.value);
                          if (selectedPlaceLocation) {
                            setSelectedPlaceLocation(null);
                          }
                        }}
                        onFocus={() => {}}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {/* Location suggestions would go here */}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Center: Search Bar (Full Width - Stable) */}
            <div className="flex-1 flex items-center min-w-0 mx-2">
              <div className="w-full bg-white border border-gray-300 rounded-md flex items-center overflow-hidden hover:border-blue-500 transition-colors h-9">
                <FiSearch className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                <div className="flex-1 relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && searchText.trim()) {
                        router.push(`/ads?search=${encodeURIComponent(searchText.trim())}`);
                      }
                    }}
                    placeholder=""
                    className="flex-1 px-3 py-1 text-sm text-gray-700 border-none outline-none bg-transparent w-full h-full"
                    onFocus={() => {
                      // Keep focus on input, don't navigate immediately
                    }}
                  />
                  {!searchText && (
                    <div className="absolute inset-0 flex items-center pointer-events-none px-3">
                      <span className="text-sm text-gray-400">
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
                      router.push(`/ads?search=${encodeURIComponent(searchText.trim())}`);
                    } else {
                      router.push('/ads');
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 flex items-center gap-1.5 transition-colors flex-shrink-0 h-full"
                >
                  <FiSearch className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Search</span>
                </button>
              </div>
            </div>

            {/* Right: Login / Sell / Profile */}
            <div className="flex items-center gap-3 flex-shrink-0" style={{ overflow: 'visible', position: 'relative', zIndex: 1000 }}>
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
                  onClick={() => setLoginModalOpen(true)}
                  className="text-sm font-semibold text-gray-700 hover:text-gray-900 cursor-pointer"
                >
                  Login
                </button>
              )}

              {/* Sell Button (Primary CTA - Pill Style) */}
              <Link
                href="/post-ad"
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-bold py-2 px-4 rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                onClick={(e) => {
                  if (!mounted || !isAuthenticated) {
                    e.preventDefault();
                    setSignupModalOpen(false);
                    setLoginModalOpen(true);
                  }
                }}
              >
                <FiPlus className="w-4 h-4" />
                <span className="tracking-wide">SELL</span>
              </Link>

              {/* Profile Avatar */}
              {mounted && isAuthenticated && (
                <div
                  className="relative"
                  ref={userMenuRef}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  style={{ zIndex: 1000 }}
                >
                  <button
                    type="button"
                    className="flex items-center justify-center cursor-pointer navbar-icon-hover"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                    onClick={() => setUserMenuOpen((v) => !v)}
                    title={user?.name || 'Profile'}
                  >
                    {user?.avatar ? (
                      <ImageWithFallback
                        src={user.avatar}
                        alt={user.name}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 hover:border-blue-600 transition-colors"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200 hover:border-blue-600 transition-colors">
                        <FiUser className="w-5 h-5" />
                      </div>
                    )}
                  </button>

                    {userMenuOpen && (
                      <div
                        className="absolute right-0 w-48 bg-white border border-gray-200 shadow-xl py-1"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          zIndex: 99999,
                          marginTop: 0,
                          paddingTop: 0,
                          marginBottom: 0,
                          display: 'block',
                          visibility: 'visible',
                          opacity: 1
                        }}
                      >
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 navbar-icon-hover"
                        >
                          <FiUser className="w-5 h-5" /> <span>{t('nav.profile')}</span>
                        </Link>
                        <Link
                          href="/my-ads"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 navbar-icon-hover"
                        >
                          <FiGrid className="w-5 h-5" /> <span>{t('nav.myAds')}</span>
                        </Link>
                        <Link
                          href="/favorites"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 navbar-icon-hover"
                        >
                          <FiHeart className="w-5 h-5" /> <span>{t('nav.favorites')}</span>
                        </Link>
                        <Link
                          href="/orders"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 navbar-icon-hover"
                        >
                          <FiShoppingBag className="w-5 h-5" /> <span>{t('nav.orders')}</span>
                        </Link>
                        <Link
                          href="/business-package"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 navbar-icon-hover"
                        >
                          <FiBriefcase className="w-5 h-5" /> <span>{t('nav.businessPackage')}</span>
                        </Link>
                        {user?.role === 'ADMIN' && (
                          <Link
                            href="/admin"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 navbar-icon-hover"
                          >
                            <FiSettings className="w-5 h-5" /> <span>{t('nav.admin')}</span>
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            logout();
                          }}
                          className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 navbar-icon-hover"
                        >
                          <FiLogOut className="w-5 h-5" /> <span>{t('nav.logout')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Menu Button */}
                <button
                  className="md:hidden text-gray-700 p-2 hover:bg-gray-100 transition-colors navbar-icon-hover"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

        {/* Second Navbar: Categories (Below Main Navbar) */}
        <div className="border-t border-gray-200 bg-white">
          <CategoryChips />
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-gray-200 bg-white dark:bg-slate-800">
            
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
                    setLoginModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setSignupModalOpen(true);
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
                    setLoginModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => {
                    setSignupModalOpen(true);
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
                    setSignupModalOpen(false);
                    setLoginModalOpen(true);
                  }}
                >
                  <FiPlus className="inline w-4 h-4 mr-1" /> Post Ad
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Login Modal */}
      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)}
        onSwitchToSignup={() => setSignupModalOpen(true)}
      />

      {/* Signup Modal */}
      <SignupModal 
        isOpen={signupModalOpen} 
        onClose={() => setSignupModalOpen(false)}
        onSwitchToLogin={() => setLoginModalOpen(true)}
      />
    </>
  );
}
