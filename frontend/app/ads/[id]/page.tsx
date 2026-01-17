'use client';

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

import { useParams, useRouter } from 'next/navigation';
import { useAd, useToggleFavorite, useIsFavorite, useAds } from '@/hooks/useAds';
import { useAuth } from '@/hooks/useAuth';
import ImageWithFallback from '@/components/ImageWithFallback';
import { FiHeart, FiShare2, FiMessageCircle, FiPhone, FiMapPin, FiCheck, FiCalendar, FiEye, FiNavigation2, FiStar, FiChevronRight, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import { useState, useMemo, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import AdCardOGNOX from '@/components/AdCardOGNOX';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export default function AdDetailPage() {
  const params = useParams();
  const router = useRouter();
  const adId = params.id as string;
  
  // CRITICAL: This page must NEVER automatically redirect
  // All navigation must be user-initiated only
  // Page is ID-based and stable - no location/auth dependencies
  
  // CRITICAL: Block any automatic redirects from location changes
  // Set a flag in sessionStorage to prevent Navbar from redirecting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('is_on_ad_details_page', 'true');
      console.log('🛡️ Ad Details Page: Set flag to prevent redirects');
      
      return () => {
        // Clear flag when leaving ad details page
        sessionStorage.removeItem('is_on_ad_details_page');
      };
    }
  }, []);
  
  // All hooks must be called unconditionally and in the same order
  const { data: ad, isLoading, isError, error } = useAd(adId);
  const { isAuthenticated, user } = useAuth();
  // Favorite check: Only fetch if authenticated (auth-guarded), but don't redirect on 401
  // This allows unauthenticated users to view ads without redirects
  const { data: isFavorite } = useIsFavorite(adId, isAuthenticated);
  
  // CRITICAL: Never use useEffect to redirect based on ad state
  // This page must remain stable regardless of ad loading state
  // Debug logging to track state changes (for troubleshooting only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Ad Detail Page State:', {
        adId,
        isLoading,
        isError,
        hasAd: !!ad,
        adIsNull: ad === null,
        error: error?.message
      });
    }
    
    // CRITICAL: NEVER call router.back() or router.push() here
    // This useEffect is ONLY for logging - no navigation logic
  }, [adId, isLoading, isError, ad, error]);
  
  // CRITICAL: Prevent any automatic navigation on mount or state changes
  // Track if navigation is user-initiated (from button click)
  const hasNavigatedRef = useRef(false);
  
  // CRITICAL: Monitor router calls to detect automatic navigation attempts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Log any router calls to help debug automatic redirects
    const logRouterCall = (method: string, args: any[]) => {
      if (!hasNavigatedRef.current) {
        console.error(`❌ AUTOMATIC ${method}() CALL DETECTED:`, {
          method,
          args,
          stack: new Error().stack
        });
      }
    };
    
    // Wrap router methods to detect automatic calls
    const originalBack = router.back.bind(router);
    const originalPush = router.push.bind(router);
    const originalReplace = router.replace.bind(router);
    
    // Override to log but still allow (we'll block in useLocationPersistence instead)
    (router as any).back = (...args: any[]) => {
      logRouterCall('router.back', args);
      return originalBack(...args);
    };
    
    (router as any).push = (...args: any[]) => {
      logRouterCall('router.push', args);
      return originalPush(...args);
    };
    
    (router as any).replace = (...args: any[]) => {
      logRouterCall('router.replace', args);
      return originalReplace(...args);
    };
    
    return () => {
      // Restore original methods on unmount
      (router as any).back = originalBack;
      (router as any).push = originalPush;
      (router as any).replace = originalReplace;
    };
  }, [router]);
  const toggleFavorite = useToggleFavorite();
  const [showPhone, setShowPhone] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [mapCoordinates, setMapCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  // Related Ads: Category first → City → Keyword similarity → Premium/Business/Free
  const categorySlug = ad?.category?.slug || undefined;
  const adCity = (ad as any)?.city || (ad as any)?.location?.city || '';

  // A small keyword query built from title (used to widen candidate pool)
  const keywordQuery = useMemo(() => {
    const title = (ad?.title || '').toLowerCase();
    const tokens = title
      .split(/[^a-z0-9]+/i)
      .map(t => t.trim())
      .filter(Boolean)
      .filter(t => t.length >= 3);
    // Keep it short to avoid overly-broad search
    return tokens.slice(0, 5).join(' ');
  }, [ad?.title]);

  const { data: relatedByCategoryData } = useAds({
    category: categorySlug,
    limit: 60,
    sort: 'newest'
  }, {
    enabled: !!categorySlug && !!ad && !!adId
  });

  const { data: relatedByCityData } = useAds({
    city: adCity,
    limit: 60,
    sort: 'newest'
  }, {
    enabled: !!adCity && !!ad && !!adId
  });

  const { data: relatedBySearchData } = useAds({
    search: keywordQuery,
    limit: 60,
    sort: 'newest'
  }, {
    enabled: !!keywordQuery && !!ad && !!adId
  });

  // Get seller's other ads - always call hook
  const sellerUserId = ad?.user?.id || '';
  const { data: sellerAdsData } = useQuery({
    queryKey: ['seller-ads', sellerUserId],
    queryFn: async () => {
      if (!sellerUserId) return { ads: [] };
      const response = await api.get(`/ads?userId=${sellerUserId}&limit=10`);
      return response.data;
    },
    enabled: !!sellerUserId && !!ad && sellerUserId !== '' && !!adId,
    staleTime: 60 * 1000,
  });

  // Check if current user is the ad owner
  const isOwner = user?.id === ad?.user?.id;

  const relatedAds = useMemo(() => {
    if (!ad) return [];

    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'at', 'by', 'from',
      'is', 'are', 'was', 'were', 'be', 'been', 'it', 'this', 'that', 'these', 'those'
    ]);

    const normalize = (v: any) => String(v ?? '').trim().toLowerCase();

    const getCity = (x: any) => normalize(x?.city || x?.location?.city || '');
    const getCategory = (x: any) => x?.category?.id || x?.categoryId || x?.category?.slug || null;

    const packageTier = (x: any) => {
      if (x?.isPremium === true || x?.premiumType) return 3; // Premium
      const pt = x?.packageType;
      if (typeof pt === 'number') return pt > 1 ? 2 : 1;
      if (typeof pt === 'string' && pt && pt !== 'NORMAL') return 2; // Business package
      return 1; // Free/Normal
    };

    const tokenize = (text: string) => {
      const raw = text
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map(t => t.trim())
        .filter(Boolean)
        .filter(t => t.length >= 3)
        .filter(t => !stopwords.has(t));
      return new Set(raw.slice(0, 60));
    };

    const similarity = (aText: string, bText: string) => {
      const aSet = tokenize(aText);
      const bSet = tokenize(bText);
      const unionSize = new Set([...aSet, ...bSet]).size;
      if (unionSize === 0) return 0;
      let intersection = 0;
      for (const t of aSet) if (bSet.has(t)) intersection++;
      return intersection / unionSize; // 0..1
    };

    const adCategory = getCategory(ad);
    const adCityNorm = getCity(ad);
    const adText = `${ad.title || ''} ${ad.description || ''}`;

    const candidates = [
      ...((relatedByCategoryData as any)?.ads || []),
      ...((relatedByCityData as any)?.ads || []),
      ...((relatedBySearchData as any)?.ads || []),
    ];

    const byId = new Map<string, any>();
    for (const c of candidates) {
      if (!c?.id) continue;
      if (c.id === ad.id) continue;
      if (!byId.has(c.id)) byId.set(c.id, c);
    }

    const scored = Array.from(byId.values()).map((c) => {
      const sameCategory = adCategory && getCategory(c) === adCategory ? 1 : 0;
      const sameCity = adCityNorm && getCity(c) === adCityNorm ? 1 : 0;
      const sim = similarity(adText, `${c?.title || ''} ${c?.description || ''}`); // 0..1
      const tier = packageTier(c); // 1..3
      const createdAt = c?.createdAt ? new Date(c.createdAt).getTime() : 0;
      return { c, sameCategory, sameCity, sim, tier, createdAt };
    });

    scored.sort((a, b) => {
      // 1) Same category first
      if (b.sameCategory !== a.sameCategory) return b.sameCategory - a.sameCategory;
      // 2) Same city next
      if (b.sameCity !== a.sameCity) return b.sameCity - a.sameCity;
      // 3) Keyword similarity
      if (b.sim !== a.sim) return b.sim - a.sim;
      // 4) Premium → Business → Free
      if (b.tier !== a.tier) return b.tier - a.tier;
      // 5) Newest first as final tie-breaker
      return b.createdAt - a.createdAt;
    });

    return scored.slice(0, 5).map(s => s.c);
  }, [ad, relatedByCategoryData, relatedByCityData, relatedBySearchData]);

  const sellerOtherAds = useMemo(() => {
    if (!sellerAdsData?.ads || !ad) return [];
    return sellerAdsData.ads
      .filter((sellerAd: any) => sellerAd.id !== ad.id)
      .slice(0, 5);
  }, [sellerAdsData, ad]);

  // Filter and normalize images - must be before early returns
  const validImages = useMemo(() => {
    if (!ad?.images) return [];
    return (ad.images || [])
      .filter((img: any) => {
        if (!img) return false;
        const imgStr = typeof img === 'string' ? img.trim() : String(img).trim();
        return imgStr !== '' && imgStr !== 'null' && imgStr !== 'undefined';
      })
      .map((img: any) => {
        const imgStr = typeof img === 'string' ? img.trim() : String(img).trim();
        if (imgStr.startsWith('/uploads/')) {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
          return `${baseUrl}${imgStr}`;
        }
        return imgStr;
      });
  }, [ad?.images]);

  const displayImages = useMemo(() => {
    return validImages.length > 0 
      ? validImages 
      : ['https://via.placeholder.com/800x600?text=No+Image'];
  }, [validImages]);

  const locationDisplay = useMemo(() => {
    if (!ad) return 'Location not specified';
    return [
      ad.location?.name,
      ad.location?.city || ad.city,
      ad.location?.state || ad.state,
    ].filter(Boolean).join(', ') || 'Location not specified';
  }, [ad?.location, ad?.city, ad?.state]);

  // Get address for geocoding
  const addressForGeocoding = useMemo(() => {
    if (!ad) return null;
    
    // First priority: Use location coordinates if available
    if (ad.location?.latitude && ad.location?.longitude) {
      return {
        lat: ad.location.latitude,
        lng: ad.location.longitude,
        type: 'coordinates' as const
      };
    }
    
    // Second priority: Build address string from location data for geocoding
    const addressParts = [
      ad.location?.neighbourhood || ad.neighbourhood,
      ad.location?.name,
      ad.location?.city || ad.city,
      ad.location?.state || ad.state,
    ].filter(Boolean);
    
    if (addressParts.length > 0) {
      return {
        address: addressParts.join(', '),
        type: 'address' as const
      };
    }
    
    return null;
  }, [ad]);

  // Load Google Maps API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ Google Maps API key not found');
      return;
    }

    // Check if script is already loaded
    if (window.google && window.google.maps) {
      console.log('✅ Google Maps API already loaded');
      setGoogleMapsLoaded(true);
      return;
    }

    // Check if script is already in the DOM (more accurate check)
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    ) as HTMLScriptElement;
    
    if (existingScript) {
      // Script exists, wait for it to load or check if already loaded
      if (window.google && window.google.maps) {
        setGoogleMapsLoaded(true);
        return;
      }
      
      // Wait for existing script to load
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          console.log('✅ Google Maps API loaded from existing script');
          setGoogleMapsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      
      // Also listen for load event
      existingScript.addEventListener('load', () => {
        console.log('✅ Google Maps API loaded from existing script (load event)');
        setGoogleMapsLoaded(true);
        clearInterval(checkLoaded);
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
      }, 5000);
      
      return;
    }

    // Load Google Maps JavaScript API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Wait for Google Maps to initialize (sometimes takes a moment after script loads)
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps) {
          console.log('✅ Google Maps API loaded');
          setGoogleMapsLoaded(true);
          clearInterval(checkGoogleMaps);
        }
      }, 50);
      
      // Timeout after 3 seconds
      setTimeout(() => {
        clearInterval(checkGoogleMaps);
        if (window.google && window.google.maps) {
          setGoogleMapsLoaded(true);
        }
      }, 3000);
    };
    
    script.onerror = () => {
      console.error('❌ Failed to load Google Maps API - check API key restrictions');
      console.error('   Make sure API key is configured for browser usage (HTTP referrer restrictions)');
      console.error('   Enable "Maps JavaScript API" in Google Cloud Console');
      console.error('   Key used:', apiKey?.substring(0, 10) + '...');
    };
    
    document.head.appendChild(script);
  }, []);

  // Set coordinates directly if available, or geocode address
  useEffect(() => {
    if (!addressForGeocoding) {
      return;
    }

    // If we already have coordinates from ad, use them immediately (don't wait for Google Maps)
    if (addressForGeocoding.type === 'coordinates') {
      if (!mapCoordinates || mapCoordinates.lat !== addressForGeocoding.lat || mapCoordinates.lng !== addressForGeocoding.lng) {
        setMapCoordinates({
          lat: addressForGeocoding.lat,
          lng: addressForGeocoding.lng
        });
      }
      return;
    }

    // If we have an address, geocode it
    if (addressForGeocoding.type === 'address' && addressForGeocoding.address) {
      console.log('📍 Starting geocoding for address:', addressForGeocoding.address);
      setIsLoadingMap(true);
      let coordinatesSet = false;

      // Helper function to set coordinates (only once)
      const setCoordinatesOnce = (lat: number, lng: number) => {
        if (!coordinatesSet) {
          coordinatesSet = true;
          console.log('✅ Coordinates set:', { lat, lng });
          setMapCoordinates({ lat, lng });
          setIsLoadingMap(false);
        }
      };

      // Try backend geocoding first (works even if Google Maps not loaded)
      console.log('🌐 Trying backend geocoding...');
      api.post('/geocoding/geocode-address', {
        address: addressForGeocoding.address
      })
        .then(response => {
          console.log('Backend geocoding response:', response.data);
          if (response.data.success && response.data.coordinates) {
            setCoordinatesOnce(
              response.data.coordinates.latitude,
              response.data.coordinates.longitude
            );
          } else if (response.data.success && response.data.location) {
            // Check if coordinates are in location object
            const loc = response.data.location;
            if (loc.latitude && loc.longitude) {
              setCoordinatesOnce(loc.latitude, loc.longitude);
            }
          } else {
            console.warn('Backend geocoding succeeded but no coordinates:', response.data);
            if (!coordinatesSet && googleMapsLoaded && window.google && window.google.maps) {
              tryGoogleGeocoding();
            }
          }
        })
        .catch(error => {
          console.error('❌ Backend geocoding error:', error);
          if (!coordinatesSet && googleMapsLoaded && window.google && window.google.maps) {
            tryGoogleGeocoding();
          } else if (!coordinatesSet) {
            setTimeout(() => {
              setIsLoadingMap(false);
            }, 2000);
          }
        });

      // Helper function for Google geocoding
      const tryGoogleGeocoding = () => {
        if (coordinatesSet || !googleMapsLoaded || !window.google || !window.google.maps) return;
        
        console.log('🗺️ Trying Google Maps geocoding...');
        try {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode(
            { address: addressForGeocoding.address, region: 'in' },
            (results: any[], status: string) => {
              if (status === 'OK' && results && results.length > 0) {
                const location = results[0].geometry.location;
                setCoordinatesOnce(location.lat(), location.lng());
              } else {
                console.error('❌ Google Geocoding failed:', status);
                if (!coordinatesSet) {
                  setTimeout(() => {
                    setIsLoadingMap(false);
                  }, 1000);
                }
              }
            }
          );
        } catch (error) {
          console.error('❌ Error using Google Geocoder:', error);
          if (!coordinatesSet) {
            setIsLoadingMap(false);
          }
        }
      };

      // Also try with Google Maps if it's loaded (parallel attempt)
      if (googleMapsLoaded && window.google && window.google.maps) {
        tryGoogleGeocoding();
      }
    }
  }, [addressForGeocoding, googleMapsLoaded]);

  // Initialize map when coordinates are available
  useEffect(() => {
    if (!mapCoordinates || !mapRef.current) return;
    
    // If Google Maps is loaded, create interactive map
    if (googleMapsLoaded && window.google && window.google.maps) {
      // Clear existing map if any
      if (mapInstanceRef.current) {
        // Map already exists, just update center
        mapInstanceRef.current.setCenter({ lat: mapCoordinates.lat, lng: mapCoordinates.lng });
        if (markerRef.current) {
          markerRef.current.setPosition({ lat: mapCoordinates.lat, lng: mapCoordinates.lng });
        }
        return;
      }

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: mapCoordinates.lat, lng: mapCoordinates.lng },
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Add marker
      markerRef.current = new window.google.maps.Marker({
        position: { lat: mapCoordinates.lat, lng: mapCoordinates.lng },
        map: map,
        title: ad?.title || 'Ad Location',
        animation: window.google.maps.Animation.DROP,
      });

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <strong>${ad?.title || 'Ad Location'}</strong><br>
            <small>${locationDisplay}</small>
          </div>
        `
      });

      markerRef.current.addListener('click', () => {
        infoWindow.open(map, markerRef.current);
      });
    }
  }, [googleMapsLoaded, mapCoordinates, ad?.title, locationDisplay]);

  const postedTime = useMemo(() => {
    if (!ad?.createdAt) return 'Recently';
    try {
      const date = new Date(ad.createdAt);
      if (isNaN(date.getTime())) return 'Recently';
      const diffInDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffInDays === 0) {
        const diffInHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
        if (diffInHours < 1) {
          const diffInMinutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
          return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
        }
        return `${diffInHours}h ago`;
      }
      if (diffInDays === 1) return '1d ago';
      return `${diffInDays}d ago`;
    } catch (error) {
      return 'Recently';
    }
  }, [ad?.createdAt]);

  // Format condition badge
  const conditionBadge = useMemo(() => {
    if (!ad?.condition) return null;
    const conditionMap: Record<string, string> = {
      'NEW': 'NEW',
      'USED': 'USED',
      'LIKE_NEW': 'USED - LIKE NEW',
      'REFURBISHED': 'REFURBISHED'
    };
    return conditionMap[ad.condition] || ad.condition.replace('_', ' ');
  }, [ad?.condition]);

  // Format member since date
  const memberSince = useMemo(() => {
    if (!ad?.user?.createdAt) return null;
    try {
      const date = new Date(ad.user.createdAt);
      if (isNaN(date.getTime())) return null;
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return `Member since ${month} ${year}`;
    } catch (error) {
      return null;
    }
  }, [ad?.user?.createdAt]);

  // Build breadcrumb path - must be before early returns
  const breadcrumbPath = useMemo(() => {
    const path = [
      { name: 'Home', href: '/' },
      { name: ad?.category?.name || 'Category', href: ad?.category?.slug ? `/${ad.category.slug}` : '/ads' },
    ];
    if (ad?.subcategory) {
      path.push({
        name: ad.subcategory.name,
        href: ad.category?.slug && ad.subcategory?.slug 
          ? `/${ad.category.slug}/${ad.subcategory.slug}` 
          : '/ads'
      });
    }
    return path;
  }, [ad?.category, ad?.subcategory]);

  // Handler functions - must be before early returns
  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please login to add to favorites');
      return;
    }
    toggleFavorite.mutate(adId);
  };

  const handleShowPhone = () => {
    if (!isAuthenticated) {
      toast.error('Please login to view phone number');
      return;
    }
    setShowPhone(true);
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: ad?.title || 'Check out this ad',
      text: `${ad?.title} - ₹${ad?.price?.toLocaleString('en-IN')}`,
      url: url,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          // Fallback to copy link
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // Handle back button - preserve filters from listing page
  // CRITICAL: This is the ONLY place where navigation should happen
  const handleBack = () => {
    // Mark that this is a user-initiated navigation
    hasNavigatedRef.current = true;
    
    try {
      // Priority 1: Get full URL from sessionStorage (stored when clicking ad)
      const storedListingUrl = sessionStorage.getItem('listing_page_url');
      
      if (storedListingUrl) {
        try {
          const url = new URL(storedListingUrl);
          // Check if it's the /ads page
          if (url.pathname === '/ads') {
            // Get persisted location from localStorage
            const storedLocation = localStorage.getItem('selected_location');
            const storedCoords = localStorage.getItem('selected_location_coords');
            
            // Add location params if available
            if (storedLocation) {
              const locationData = JSON.parse(storedLocation);
              url.searchParams.set('location', locationData.slug);
              
              if (storedCoords) {
                const coords = JSON.parse(storedCoords);
                if (coords.latitude && coords.longitude) {
                  url.searchParams.set('latitude', String(coords.latitude));
                  url.searchParams.set('longitude', String(coords.longitude));
                  url.searchParams.set('radius', '50');
                }
              }
            }
            
            router.push(url.pathname + url.search);
            return;
          }
        } catch (error) {
          console.error('Error parsing stored URL:', error);
        }
      }
      
      // Priority 2: Use document.referrer if it's the /ads page
      if (typeof window !== 'undefined' && document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          if (referrerUrl.pathname === '/ads') {
            // Get persisted location from localStorage
            const storedLocation = localStorage.getItem('selected_location');
            const storedCoords = localStorage.getItem('selected_location_coords');
            
            // Add location params if available
            if (storedLocation) {
              const locationData = JSON.parse(storedLocation);
              referrerUrl.searchParams.set('location', locationData.slug);
              
              if (storedCoords) {
                const coords = JSON.parse(storedCoords);
                if (coords.latitude && coords.longitude) {
                  referrerUrl.searchParams.set('latitude', String(coords.latitude));
                  referrerUrl.searchParams.set('longitude', String(coords.longitude));
                  referrerUrl.searchParams.set('radius', '50');
                }
              }
            }
            
            router.push(referrerUrl.pathname + referrerUrl.search);
            return;
          }
        } catch (error) {
          console.error('Error parsing referrer URL:', error);
        }
      }
      
      // Fallback: Navigate to /ads with persisted location
      const storedLocation = localStorage.getItem('selected_location');
      const storedCoords = localStorage.getItem('selected_location_coords');
      
      if (storedLocation) {
        const locationData = JSON.parse(storedLocation);
        const params = new URLSearchParams();
        params.set('location', locationData.slug);
        
        if (storedCoords) {
          const coords = JSON.parse(storedCoords);
          if (coords.latitude && coords.longitude) {
            params.set('latitude', String(coords.latitude));
            params.set('longitude', String(coords.longitude));
            params.set('radius', '50');
          }
        }
        
        router.push(`/ads?${params.toString()}`);
      } else {
        // Final fallback: Just go back
        router.back();
      }
    } catch (error) {
      console.error('Error in handleBack:', error);
      router.back();
    }
  };

  // CRITICAL: Show loading state - NEVER redirect during loading
  if (isLoading) {
    console.log('⏳ Ad Detail Page: Loading state');
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded-lg mb-6"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // CRITICAL: Never redirect based on ad === null
  // Show notFound UI instead of redirecting
  // Page must be stable and ID-based - no automatic navigation
  // IMPORTANT: Only check ad === null AFTER loading is complete
  if (!isLoading && ad === null) {
    console.log('❌ Ad Detail Page: Ad is null, showing notFound UI (NOT redirecting)');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ad not found</h1>
          <p className="text-gray-600 mb-4">
            {isError 
              ? 'Failed to load the ad. Please try again.' 
              : 'The ad you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleBack}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
            <Link 
              href="/ads" 
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
            >
              Browse all ads
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // CRITICAL: If we reach here, ad should exist - render the page
  // NEVER redirect from this point - page must remain stable
  // If ad is still undefined/null at this point, show loading (not redirect)
  if (!ad) {
    console.warn('⚠️ Ad Detail Page: Unexpected state - not loading but no ad, showing loading (NOT redirecting)');
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded-lg mb-6"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Ad exists - render the page content
  // CRITICAL: No redirects from here - page is stable
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Ad Detail Page: Rendering ad content for ad:', ad.id);
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Ads</span>
        </button>

        {/* Breadcrumbs */}
        <nav className="mb-6 text-sm text-gray-600">
          {breadcrumbPath.map((item, index) => (
            <span key={index}>
              {index > 0 && <span className="mx-2">/</span>}
              <Link href={item.href} className="hover:text-blue-600">
                {item.name}
              </Link>
            </span>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side - Product Images */}
          <div className="lg:col-span-2">
            {/* Main Product Image */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="relative w-full h-[600px] bg-gray-100 rounded-lg overflow-hidden mb-4">
                <ImageWithFallback
                  src={displayImages[mainImageIndex]}
                  alt={ad.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 66vw"
                />
                {/* Image count badge */}
                {displayImages.length > 0 && (
                  <div className="absolute top-3 left-3 bg-gray-800 bg-opacity-75 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                    {displayImages.length} image{displayImages.length !== 1 ? 's' : ''}
                  </div>
                )}
                {/* Like button */}
                <button
                  onClick={handleWishlist}
                  className={`absolute bottom-3 right-3 p-3 rounded-full shadow-lg transition-all ${
                    isFavorite
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                >
                  <FiHeart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>
              
              {/* Thumbnail Images */}
              {displayImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {displayImages.map((img: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setMainImageIndex(index)}
                      className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                        mainImageIndex === index 
                          ? 'border-orange-500 ring-2 ring-orange-200' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ImageWithFallback
                        src={img}
                        alt={`${ad.title} - Image ${index + 1}`}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">{ad.description}</p>
              
              {/* Attributes/Specs */}
              {ad.attributes && typeof ad.attributes === 'object' && Object.keys(ad.attributes).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <ul className="space-y-2">
                    {Object.entries(ad.attributes as Record<string, any>).slice(0, 5).map(([key, value]) => {
                      if (value === null || value === undefined || value === '') return null;
                      
                      const formattedKey = key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                      
                      const displayValue = Array.isArray(value) 
                        ? value.join(', ') 
                        : String(value);
                      
                      return (
                        <li key={key} className="flex items-start">
                          <span className="text-gray-600 mr-2">•</span>
                          <span className="text-gray-700">
                            <span className="font-medium">{formattedKey}:</span> {displayValue}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Buyer Protection Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <FiCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Buyer Protection</h3>
                  <p className="text-sm text-gray-700">
                    Your purchase is protected. If the item is not as described, we'll help you get a refund.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Product Details, Seller Info, Actions */}
          <div className="lg:col-span-1">
            {/* Product Details Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              {/* Condition Badge */}
              {conditionBadge && (
                <div className="mb-4">
                  <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {conditionBadge}
                  </span>
                </div>
              )}
              
              {/* Product Name */}
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{ad.title}</h1>
              
              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <p className="text-4xl font-bold text-orange-500">
                    ₹{ad.price.toLocaleString('en-IN')}
                  </p>
                  {ad.originalPrice && ad.originalPrice > ad.price && (
                    <p className="text-lg text-gray-400 line-through">
                      ₹{ad.originalPrice.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>

              {/* Listing Details */}
              <div className="space-y-2 mb-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-4 h-4" />
                  <span>{postedTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiMapPin className="w-4 h-4" />
                  <span>{locationDisplay}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiEye className="w-4 h-4" />
                  <span>{ad.views || 0} views</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mb-6">
                {!isOwner && (
                  <>
                    <Link
                      href={`/chat?adId=${adId}&userId=${ad.user.id}`}
                      className="w-full bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      onClick={(e) => {
                        if (!isAuthenticated) {
                          e.preventDefault();
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('openLoginModal'));
                          }
                        }
                      }}
                    >
                      <FiMessageCircle className="w-5 h-5" />
                      Chat with Seller
                    </Link>

                    {/* Phone number: only shown when seller enabled AND viewer is logged in */}
                    {isAuthenticated ? (
                      ad.user?.phone ? (
                        <a
                          href={`tel:${ad.user.phone}`}
                          className="w-full bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <FiPhone className="w-5 h-5" />
                          {ad.user.phone}
                        </a>
                      ) : null
                    ) : (
                      <button
                        type="button"
                        className="w-full bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('openLoginModal'));
                          }
                        }}
                      >
                        <FiPhone className="w-5 h-5" />
                        Login to view phone number
                      </button>
                    )}
                  </>
                )}
                {isOwner && (
                  <Link
                    href={`/edit-ad/${adId}`}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    Edit Ad
                  </Link>
                )}
              </div>
            </div>

            {/* Local Pickup Location Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Local Pickup Location</h3>
              {/* Map View */}
              <div className="rounded-lg overflow-hidden border border-gray-200 mb-3" style={{ height: '200px', position: 'relative' }}>
                {isLoadingMap ? (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
                      <p className="text-sm">Loading map...</p>
                    </div>
                  </div>
                ) : mapCoordinates ? (
                  <>
                    <div 
                      ref={mapRef}
                      style={{ width: '100%', height: '100%' }}
                    />
                    <div className="absolute top-2 left-2 z-10 bg-white rounded-full p-2 shadow-lg">
                      <FiMapPin className="w-5 h-5 text-orange-500" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <FiMapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Map not available</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">Exact location shown after purchase</p>
              
              {/* Search Radius */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Radius:</label>
                <div className="relative">
                  <input
                    type="text"
                    defaultValue="10 miles"
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white cursor-pointer pr-10"
                  />
                  <FiChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              
              {/* View Directions Button */}
              {mapCoordinates && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapCoordinates.lat},${mapCoordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <FiNavigation2 className="w-5 h-5" />
                  View Directions
                </a>
              )}
            </div>

            {/* Seller Information Card */}
            {ad.user && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">SELLER INFORMATION</h3>
                <div className="flex items-start gap-3 mb-4">
                  {ad.user.avatar ? (
                    <ImageWithFallback
                      src={ad.user.avatar}
                      alt={ad.user.name || 'Seller'}
                      width={56}
                      height={56}
                      className="rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xl font-semibold text-gray-600">
                        {(ad.user.name || 'S')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 truncate">{ad.user.name || 'Unknown Seller'}</h4>
                      {ad.user.isVerified && (
                        <FiCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    {/* Star Rating - using placeholder */}
                    <div className="flex items-center gap-1 mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <FiStar
                            key={i}
                            className={`w-4 h-4 ${
                              i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 ml-1">4.8 (124 reviews)</span>
                    </div>
                    {memberSince && (
                      <p className="text-sm text-gray-600 mb-3">{memberSince}</p>
                    )}
                    <Link 
                      href={`/user/${ad.user.id}`}
                      className="text-sm text-orange-500 hover:text-orange-600 font-medium"
                    >
                      View all listings from {ad.user.name?.split(' ')[0] || 'seller'}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Ads Section */}
        {relatedAds.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Related Ads</h2>
              <Link 
                href={ad?.category?.slug ? `/${ad.category.slug}` : '/ads'}
                className="text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
              >
                See more <FiChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {relatedAds.map((relatedAd: any) => (
                <AdCardOGNOX key={relatedAd.id} ad={relatedAd} />
              ))}
            </div>
          </div>
        )}

        {/* Seller's Other Items */}
        {sellerOtherAds.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">More from this Seller</h2>
              {ad?.user && (
                <Link 
                  href={`/user/${ad.user.id}`}
                  className="text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                >
                  See more <FiChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {sellerOtherAds.map((sellerAd: any) => (
                <AdCardOGNOX key={sellerAd.id} ad={sellerAd} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
