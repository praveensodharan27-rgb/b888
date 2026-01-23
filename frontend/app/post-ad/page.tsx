'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useCreateAd, useFreeAdsStatus, useCreateAdPostingOrder, useVerifyAdPostingPayment, useAdLimitStatus } from '@/hooks/useAds';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { getSocket } from '@/lib/socket';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import CreatableSelect from 'react-select/creatable';
import { FiX, FiUpload, FiCreditCard, FiInfo, FiStar, FiTrendingUp, FiRefreshCw, FiAlertCircle, FiZap, FiNavigation, FiBriefcase, FiFlag, FiCheckCircle, FiPackage, FiUser, FiCamera, FiMapPin, FiSearch, FiMap, FiHome } from 'react-icons/fi';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ImageWithFallback from '@/components/ImageWithFallback';
import ProductSpecifications from '@/components/ProductSpecifications';
import AdLimitAlert from '@/components/AdLimitAlert';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Lazy load PaymentModal (heavy component with Razorpay SDK)
// Using same pattern as other components (AdLimitAlert, PremiumFeatureButton)
const PaymentModal = dynamic(
  () => import('@/components/PaymentModal').catch((error) => {
    console.error('Failed to load PaymentModal:', error);
    // Return a fallback component that just returns null
    return { default: () => null };
  }),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <p className="text-gray-700">Loading payment gateway...</p>
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
);

export default function PostAdPage() {
  // 1. Basic hooks (router, auth, query client, form)
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm();
  
  // 2. ALL useState hooks - must be called unconditionally and in same order
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [adFormData, setAdFormData] = useState<any>(null);
  const [selectedPremium, setSelectedPremium] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showPaymentRequiredModal, setShowPaymentRequiredModal] = useState(false);
  const [paymentRequiredError, setPaymentRequiredError] = useState<any>(null);
  const [isAdLimitAlertDismissed, setIsAdLimitAlertDismissed] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isPaymentVerified, setIsPaymentVerified] = useState(false); // Track if payment is verified
  const [showPhoneInAds, setShowPhoneInAds] = useState(true);
  // Use shared Google Places hook (reuses script from home page)
  const { googlePlacesLoaded } = useGooglePlaces();
  const [locationInputMounted, setLocationInputMounted] = useState(false); // Track if location input is mounted
  const [currentStep, setCurrentStep] = useState(1);
  // Map coordinates state
  const [mapCoordinates, setMapCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  // Brand and Model states
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
  // Brand and Model states for autocomplete
  const [brandOptions, setBrandOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [modelOptions, setModelOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  
  // Color and Storage states for autocomplete
  const [colorOptions, setColorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [storageOptions, setStorageOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isLoadingColors, setIsLoadingColors] = useState(false);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);
  const [colorSearchQuery, setColorSearchQuery] = useState('');
  const [storageSearchQuery, setStorageSearchQuery] = useState('');
  // Location Autocomplete (Typeahead) states
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(-1);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  
  // State dropdown states
  const [stateQuery, setStateQuery] = useState('');
  const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [selectedStateIndex, setSelectedStateIndex] = useState(-1);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const stateInputRef = useRef<HTMLInputElement>(null);
  
  // Neighborhood dropdown states
  const [neighborhoodQuery, setNeighborhoodQuery] = useState('');
  const [neighborhoodSuggestions, setNeighborhoodSuggestions] = useState<any[]>([]);
  const [showNeighborhoodDropdown, setShowNeighborhoodDropdown] = useState(false);
  const [isLoadingNeighborhoods, setIsLoadingNeighborhoods] = useState(false);
  const [selectedNeighborhoodIndex, setSelectedNeighborhoodIndex] = useState(-1);
  const neighborhoodDropdownRef = useRef<HTMLDivElement>(null);
  const neighborhoodInputRef = useRef<HTMLInputElement>(null);
  
  // 3. ALL useRef hooks
  const locationAutocompleteRef = useRef<HTMLInputElement>(null);
  const autocompleteInstanceRef = useRef<any>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  // 4. Custom hooks and useQuery hooks
  const createAd = useCreateAd();
  const { data: freeAdsStatus } = useFreeAdsStatus(isAuthenticated);
  const { data: adLimitStatus, isLoading: isLoadingAdLimit } = useAdLimitStatus(user?.id);
  
  // Also fetch business package status as fallback for button text
  const { data: businessPackageStatus } = useQuery({
    queryKey: ['business-package', 'status', user?.id],
    queryFn: async () => {
      const response = await api.get('/business-package/status');
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 10 * 1000,
    refetchOnMount: true,
  });
  
  const createPaymentOrder = useCreateAdPostingOrder();
  const verifyPayment = useVerifyAdPostingPayment();
  
  const TOTAL_STEPS = 8; // Category & Subcategory (combined), Brand, Specs, Title/Description, Image, Price, Location

  // Sync "show phone in ads" preference from user profile (default true)
  useEffect(() => {
    if (typeof user?.showPhone === 'boolean') {
      setShowPhoneInAds(user.showPhone);
    }
  }, [user?.showPhone]);
  
  // Get premium offers (public endpoint for users) - must be after useState hooks
  const { data: premiumSettings, isLoading: isLoadingOffers } = useQuery({
    queryKey: ['premium-offers'],
    queryFn: async (): Promise<Array<{ id: string; type: string; name: string; description: string; price: number; originalPrice: number; duration: number; hasOffer: boolean }>> => {
      const response = await api.get('/premium/offers');
      const offersData = response.data.offers;
      
      // Transform the object structure into an array format
      // API returns: { prices: {...}, offerPrices: {...}, durations: {...} }
      // We need: [{ type: 'TOP', name: '...', price: ..., duration: ... }, ...]
      if (offersData && typeof offersData === 'object' && !Array.isArray(offersData)) {
        const offersArray: Array<{ id: string; type: string; name: string; description: string; price: number; originalPrice: number; duration: number; hasOffer: boolean }> = [];
        const premiumTypes = ['TOP', 'FEATURED', 'BUMP_UP', 'URGENT'];
        
        premiumTypes.forEach((type) => {
          const originalPrice = offersData.prices?.[type] || 0;
          const offerPrice = offersData.offerPrices?.[type];
          // Use offer price if available (discounted), otherwise use regular price
          const finalPrice = offerPrice && offerPrice < originalPrice ? offerPrice : originalPrice;
          const duration = offersData.durations?.[type] || 7;
          
          if (finalPrice > 0) {
            offersArray.push({
              id: type,
              type: type,
              name: type === 'TOP' ? 'Top Ad' : 
                    type === 'FEATURED' ? 'Featured Ad' : 
                    type === 'BUMP_UP' ? 'Bump Up' : 
                    type === 'URGENT' ? 'Mark as Urgent' : 'Urgent Ad',
              description: type === 'TOP' ? 'Stand out with a bright badge and priority search ranking' :
                           type === 'FEATURED' ? 'Stay at the top of the category for 7 days' :
                           type === 'BUMP_UP' ? 'Bump your ad to the top of listings' :
                           type === 'URGENT' ? 'Stand out with a bright badge and priority search ranking' :
                           'Mark your ad as urgent for priority placement',
              price: finalPrice, // Price from backend (already in correct format, not cents)
              originalPrice: originalPrice, // Original price for comparison
              duration: duration,
              hasOffer: !!(offerPrice && offerPrice < originalPrice),
            });
          }
        });
        
        return offersArray;
      }
      
      // If it's already an array, return as is
      return Array.isArray(offersData) ? offersData : [];
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes (shorter to get updates faster)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus to get latest offers
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data.categories;
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
  });
  
  // ALL watch() calls must be at top level, before useEffect hooks
  const selectedCategoryId = watch('categoryId');
  const selectedSubcategoryId = watch('subcategoryId');
  const attributes = watch('attributes');
  const title = watch('title');
  const description = watch('description');
  const price = watch('price');
  const condition = watch('condition');
  const state = watch('state');
  const city = watch('city');
  
  // Computed values from watched values
  const selectedCategory = categories?.find((c: any) => c.id === selectedCategoryId);
  const selectedSubcategory = selectedCategory?.subcategories?.find((s: any) => s.id === selectedSubcategoryId);
  
  // Check if this is mobile phones subcategory
  const isMobilePhones = selectedCategory?.slug === 'mobiles' && selectedSubcategory?.slug === 'mobile-phones';
  // Check if this is any mobile subcategory
  const isMobileCategory = selectedCategory?.slug === 'mobiles' || selectedCategory?.name?.toLowerCase().includes('mobile');
  
  // Check if premium features are selected
  const hasPremiumFeatures = !!(selectedPremium || isUrgent);
  
  // Ensure premiumSettings is always an array to prevent .find() errors
  const safePremiumSettings = Array.isArray(premiumSettings) ? premiumSettings : [];
  
  // Watch brand from attributes
  const selectedBrandFromForm = watch('attributes.brand');

  // Real-time quota updates via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isAuthenticated) return;

    const handleQuotaUpdate = (quotaData: any) => {
      console.log('📡 Received AD_QUOTA_UPDATED event after purchase/usage:', quotaData);
      
      // CRITICAL: Calculate business ads remaining (only from NON-EXHAUSTED packages)
      // Never count exhausted packages as "0 Available" - they should show as EXHAUSTED
      const businessAdsRemaining = quotaData.packages?.reduce((sum: number, pkg: any) => {
        // Only count packages that are NOT exhausted
        if (pkg.isExhausted || (pkg.adsRemaining === 0 && pkg.totalAds > 0)) {
          return sum; // Skip exhausted packages
        }
        return sum + (pkg.adsRemaining || 0);
      }, 0) || 0;
      
      // Update React Query cache immediately
      queryClient.setQueryData(['ad-limit-status'], (old: any) => ({
        ...old,
        userAdQuota: quotaData,
        freeAdsRemaining: quotaData.monthlyFreeAds?.remaining || 0,
        freeAdsUsed: quotaData.monthlyFreeAds?.used || 0,
        freeAdsLimit: quotaData.monthlyFreeAds?.total || 2,
        businessAdsRemaining: businessAdsRemaining,
        packages: quotaData.packages || [],
        totalRemaining: (quotaData.monthlyFreeAds?.remaining || 0) + businessAdsRemaining,
        activePackagesCount: quotaData.packages?.filter((pkg: any) => !pkg.isExhausted && (pkg.adsRemaining || 0) > 0).length || 0,
        exhaustedPackagesCount: quotaData.packages?.filter((pkg: any) => pkg.isExhausted || (pkg.adsRemaining === 0 && pkg.totalAds > 0)).length || 0,
        totalPackages: quotaData.packages?.length || 0
      }));
      
      // Force immediate refetch to ensure UI updates
      queryClient.refetchQueries({ queryKey: ['ad-limit-status'] });
      queryClient.refetchQueries({ queryKey: ['user-profile'] });
      queryClient.refetchQueries({ queryKey: ['business-package', 'status'] });
      
      console.log('✅ Quota updated in real-time:', {
        freeAds: quotaData.monthlyFreeAds?.remaining || 0,
        businessAds: businessAdsRemaining,
        totalPackages: quotaData.packages?.length || 0,
        activePackages: quotaData.packages?.filter((pkg: any) => !pkg.isExhausted && (pkg.adsRemaining || 0) > 0).length || 0,
        exhaustedPackages: quotaData.packages?.filter((pkg: any) => pkg.isExhausted || (pkg.adsRemaining === 0 && pkg.totalAds > 0)).length || 0
      });
    };

    socket.on('AD_QUOTA_UPDATED', handleQuotaUpdate);
    console.log('✅ Socket listener registered for AD_QUOTA_UPDATED');

    // Also listen for connection events to re-register listener
    socket.on('connect', () => {
      console.log('✅ Socket reconnected - re-registering quota listener');
      socket.on('AD_QUOTA_UPDATED', handleQuotaUpdate);
    });

    return () => {
      if (socket) {
        socket.off('AD_QUOTA_UPDATED', handleQuotaUpdate);
        socket.off('connect');
        console.log('🧹 Cleaned up socket listeners');
      }
    };
  }, [isAuthenticated, queryClient]);

  // Auto-select oldest package when free ads exhausted
  useEffect(() => {
    if (!isLoadingAdLimit && adLimitStatus?.userAdQuota) {
      const { monthlyFreeAds, packages } = adLimitStatus.userAdQuota;
      
      // If free ads exhausted and packages available, auto-select oldest
      if (monthlyFreeAds.remaining === 0 && packages && packages.length > 0) {
        const oldestPackageWithAds = packages.find((pkg: any) => pkg.adsRemaining > 0);
        if (oldestPackageWithAds && !selectedPackageId) {
          setSelectedPackageId(oldestPackageWithAds.packageId);
          console.log('✅ Auto-selected oldest package:', oldestPackageWithAds.packageName);
        }
      } else if (monthlyFreeAds.remaining > 0) {
        // Reset selection when free ads available
        setSelectedPackageId(null);
      }
    }
  }, [isLoadingAdLimit, adLimitStatus, selectedPackageId]);

  // Fallback: Check URL param for purchase redirect and refetch quota
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const fromPurchase = urlParams.get('from') === 'purchase';
    
    if (fromPurchase && isAuthenticated && !isLoadingAdLimit) {
      console.log('🔄 Detected purchase redirect - refetching quota as fallback...');
      queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.refetchQueries({ queryKey: ['ad-limit-status'] });
      queryClient.refetchQueries({ queryKey: ['user-profile'] });
      
      // Clean URL
      urlParams.delete('from');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [isAuthenticated, isLoadingAdLimit, queryClient]);
  
  // Enhanced error handling for payment order creation
  useEffect(() => {
    if (createPaymentOrder.isError) {
      console.error('❌ Payment order creation error:', createPaymentOrder.error);
    }
  }, [createPaymentOrder.isError, createPaymentOrder.error]);

  // Scroll to a specific step - must be before useEffect hooks
  const scrollToStep = useCallback((step: number) => {
    const stepIndex = step - 1; // Convert to 0-based index
    if (stepRefs.current[stepIndex]) {
      stepRefs.current[stepIndex]?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  }, []);
  
  // Step validation functions - uses top-level watched values
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Category & Subcategory (combined)
        return !!(selectedCategoryId && selectedSubcategoryId);
      case 2: // Brand
        if (!selectedCategory || !selectedSubcategory) return false;
        return true;
      case 3: // Specs (other attributes)
        if (!selectedCategory || !selectedSubcategory) return false;
        return true;
      case 4: // Title/Description
        return !!(title && description);
      case 5: // Image
        return images.length > 0;
      case 6: // Price
        return !!(price && parseFloat(price) >= 0);
      case 7: // Location
        return !!(state && city);
      default:
        return false;
    }
  };

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect only once, not on every render
  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  // Fetch popular brands when mobile phones subcategory is selected
  useEffect(() => {
    if (isMobilePhones && !isLoadingBrands) {
      setIsLoadingBrands(true);
      api.get('/categories/brands', {
        params: {
          categorySlug: selectedCategory?.slug,
          subcategorySlug: selectedSubcategory?.slug,
          limit: 10
        }
      })
        .then(response => {
          if (response.data.success && response.data.brands) {
            setBrands(response.data.brands);
            setBrandOptions(response.data.brands.map((brand: { id: string; name: string }) => ({
              value: brand.name,
              label: brand.name
            })));
          }
        })
        .catch(error => {
          console.error('Failed to fetch brands:', error);
          setBrands([]);
          setBrandOptions([]);
        })
        .finally(() => {
          setIsLoadingBrands(false);
        });
    } else if (!isMobilePhones) {
      // Clear brands if not mobile phones
      setBrands([]);
      setBrandOptions([]);
      setSelectedBrand('');
      setValue('attributes.brand', '');
    }
  }, [isMobilePhones, selectedCategory?.slug, selectedSubcategory?.slug, setValue]);

  // Search brands with debounce
  useEffect(() => {
    if (!isMobilePhones || !brandSearchQuery.trim()) {
      // Reset to popular brands if no search
      if (brandOptions.length === 0 && brands.length > 0) {
        setBrandOptions(brands.map((brand: { id: string; name: string }) => ({
          value: brand.name,
          label: brand.name
        })));
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsLoadingBrands(true);
      api.get('/categories/brands', {
        params: {
          categorySlug: selectedCategory?.slug,
          subcategorySlug: selectedSubcategory?.slug,
          limit: 20,
          search: brandSearchQuery
        }
      })
        .then(response => {
          if (response.data.success && response.data.brands) {
            setBrandOptions(response.data.brands.map((brand: { id: string; name: string }) => ({
              value: brand.name,
              label: brand.name
            })));
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingBrands(false);
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [brandSearchQuery, isMobilePhones, selectedCategory?.slug, selectedSubcategory?.slug, brands]);

  // Fetch models when brand is selected
  useEffect(() => {
    const brandName = selectedBrandFromForm || selectedBrand;
    if (isMobilePhones && brandName && !isLoadingModels) {
      setIsLoadingModels(true);
      // Find brand ID from brands list using brand name
      const brandObj = brands.find(b => b.name === brandName);
      const brandId = brandObj?.id || brandName.toLowerCase().replace(/\s+/g, '-');
      
      api.get('/categories/models', {
        params: { brand: brandId, limit: 20 }
      })
        .then(response => {
          if (response.data.success && response.data.models) {
            setModels(response.data.models);
            setModelOptions(response.data.models.map((model: { id: string; name: string }) => ({
              value: model.name,
              label: model.name
            })));
          }
        })
        .catch(error => {
          console.error('Failed to fetch models:', error);
          setModels([]);
          setModelOptions([]);
        })
        .finally(() => {
          setIsLoadingModels(false);
        });
    } else if (!brandName) {
      // Clear models if no brand selected
      setModels([]);
      setModelOptions([]);
      setValue('attributes.model', '');
    }
  }, [isMobilePhones, selectedBrandFromForm, selectedBrand, brands, setValue]);

  // Search models with debounce
  useEffect(() => {
    const brandName = selectedBrandFromForm || selectedBrand;
    if (!isMobilePhones || !brandName || !modelSearchQuery.trim()) {
      // Reset to popular models if no search
      if (modelOptions.length === 0 && models.length > 0) {
        setModelOptions(models.map((model: { id: string; name: string }) => ({
          value: model.name,
          label: model.name
        })));
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsLoadingModels(true);
      const brandObj = brands.find(b => b.name === brandName);
      const brandId = brandObj?.id || brandName.toLowerCase().replace(/\s+/g, '-');
      
      api.get('/categories/models', {
        params: { brand: brandId, limit: 20, search: modelSearchQuery }
      })
        .then(response => {
          if (response.data.success && response.data.models) {
            setModelOptions(response.data.models.map((model: { id: string; name: string }) => ({
              value: model.name,
              label: model.name
            })));
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingModels(false);
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [modelSearchQuery, isMobilePhones, selectedBrandFromForm, selectedBrand, brands, models]);

  // Fetch popular colors when mobile phones subcategory is selected
  useEffect(() => {
    if (isMobilePhones && !isLoadingColors) {
      setIsLoadingColors(true);
      api.get('/categories/mobile/colors', {
        params: { limit: 10 }
      })
        .then(response => {
          if (response.data.success && response.data.colors) {
            setColorOptions(response.data.colors.map((color: string) => ({
              value: color,
              label: color
            })));
          }
        })
        .catch(error => {
          console.error('Failed to fetch colors:', error);
          // Fallback to default colors
          const defaultColors = ['Black', 'White', 'Blue', 'Red', 'Green', 'Gold', 'Silver', 'Grey', 'Midnight', 'Starlight'];
          setColorOptions(defaultColors.map(color => ({ value: color, label: color })));
        })
        .finally(() => {
          setIsLoadingColors(false);
        });
    } else if (!isMobilePhones) {
      setColorOptions([]);
      setValue('attributes.color', '');
    }
  }, [isMobilePhones, setValue]);

  // Fetch popular storage when mobile phones subcategory is selected
  useEffect(() => {
    if (isMobilePhones && !isLoadingStorage) {
      setIsLoadingStorage(true);
      api.get('/categories/mobile/storage', {
        params: { limit: 10 }
      })
        .then(response => {
          if (response.data.success && response.data.storage) {
            setStorageOptions(response.data.storage.map((storage: string) => ({
              value: storage,
              label: storage
            })));
          }
        })
        .catch(error => {
          console.error('Failed to fetch storage:', error);
          // Fallback to default storage
          const defaultStorage = ['128 GB', '256 GB', '64 GB', '512 GB', '32 GB', '1 TB', '16 GB', '8 GB', '2 TB'];
          setStorageOptions(defaultStorage.map(storage => ({ value: storage, label: storage })));
        })
        .finally(() => {
          setIsLoadingStorage(false);
        });
    } else if (!isMobilePhones) {
      setStorageOptions([]);
      setValue('attributes.storage', '');
    }
  }, [isMobilePhones, setValue]);

  // Search colors with debounce
  useEffect(() => {
    if (!isMobilePhones || !colorSearchQuery.trim()) {
      // Reset to popular colors if no search
      if (colorOptions.length === 0) {
        api.get('/categories/mobile/colors', { params: { limit: 10 } })
          .then(response => {
            if (response.data.success && response.data.colors) {
              setColorOptions(response.data.colors.map((color: string) => ({
                value: color,
                label: color
              })));
            }
          })
          .catch(() => {});
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      api.get('/categories/mobile/colors', {
        params: { limit: 20, search: colorSearchQuery }
      })
        .then(response => {
          if (response.data.success && response.data.colors) {
            setColorOptions(response.data.colors.map((color: string) => ({
              value: color,
              label: color
            })));
          }
        })
        .catch(() => {});
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [colorSearchQuery, isMobilePhones]);

  // Search storage with debounce
  useEffect(() => {
    if (!isMobilePhones || !storageSearchQuery.trim()) {
      // Reset to popular storage if no search
      if (storageOptions.length === 0) {
        api.get('/categories/mobile/storage', { params: { limit: 10 } })
          .then(response => {
            if (response.data.success && response.data.storage) {
              setStorageOptions(response.data.storage.map((storage: string) => ({
                value: storage,
                label: storage
              })));
            }
          })
          .catch(() => {});
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      api.get('/categories/mobile/storage', {
        params: { limit: 20, search: storageSearchQuery }
      })
        .then(response => {
          if (response.data.success && response.data.storage) {
            setStorageOptions(response.data.storage.map((storage: string) => ({
              value: storage,
              label: storage
            })));
          }
        })
        .catch(() => {});
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [storageSearchQuery, isMobilePhones]);

  // Navigate to next step
  const goToNextStep = () => {
    // Block navigation if payment is required but not verified
    if (requiresPaymentBeforePosting && !isPaymentVerified) {
      toast.error('Please complete payment before proceeding');
      return;
    }
    
    if (validateStep(currentStep) && currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      toast.error('Please complete all required fields before proceeding');
    }
  };
  
  // Navigate to previous step
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Navigate to a specific step (for clicking on step indicator)
  const goToStep = (step: number) => {
    // Block navigation if payment is required but not verified (except going back)
    if (step > currentStep && requiresPaymentBeforePosting && !isPaymentVerified) {
      toast.error('Please complete payment before proceeding');
      return;
    }
    
    if (step >= 1 && step <= TOTAL_STEPS) {
      // Allow going to any step, but validate if going forward
      if (step > currentStep) {
        // Validate all previous steps before allowing forward navigation
        let canProceed = true;
        for (let i = 1; i < step; i++) {
          if (!validateStep(i)) {
            canProceed = false;
            toast.error(`Please complete step ${i} before proceeding`);
            break;
          }
        }
        if (!canProceed) return;
      }
      setCurrentStep(step);
      // useEffect will handle scrolling
    }
  };

  // Scroll to current step when it changes
  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      scrollToStep(currentStep);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStep, scrollToStep]);

  // Google Places script loading is handled by shared useGooglePlaces hook
  // This reuses the same script that's already working on the home page
  // No duplicate script loads - script is shared across all components

  // Handle place selection from autocomplete
  const handlePlaceSelect = useCallback((place: any) => {
    if (!place.address_components) {
      return;
    }

    // Update the input field with formatted address
    if (locationAutocompleteRef.current && place.formatted_address) {
      locationAutocompleteRef.current.value = place.formatted_address;
    }

    // Parse address components
    let state = '';
    let city = '';
    let neighbourhood = '';

    for (const component of place.address_components) {
      const types = component.types;

      if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        city = component.long_name;
      } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
        neighbourhood = component.long_name;
      } else if (types.includes('neighborhood') && !neighbourhood) {
        neighbourhood = component.long_name;
      }
    }

    // Auto-populate form fields
    if (state) {
      setValue('state', state);
      setStateQuery(state);
    }
    if (city) {
      setValue('city', city);
    }
    if (neighbourhood) {
      setValue('neighbourhood', neighbourhood);
      setNeighborhoodQuery(neighbourhood);
    }

    // Update location query state
    if (city) {
      setLocationQuery(city);
    } else if (place.formatted_address) {
      setLocationQuery(place.formatted_address);
    }

    // Update autocomplete input
    if (locationAutocompleteRef.current) {
      if (city) {
        locationAutocompleteRef.current.value = city;
      } else if (place.formatted_address) {
        locationAutocompleteRef.current.value = place.formatted_address;
      }
    }

    // Update map coordinates if geometry is available
    if (place.geometry && place.geometry.location) {
      const lat = typeof place.geometry.location.lat === 'function' 
        ? place.geometry.location.lat() 
        : place.geometry.location.lat;
      const lng = typeof place.geometry.location.lng === 'function' 
        ? place.geometry.location.lng() 
        : place.geometry.location.lng;
      
      // Validate coordinates are numbers
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        setMapCoordinates({ lat, lng });
      }
    }

    // Hide location dropdown after Google Places selection
    setShowLocationDropdown(false);
    setLocationSuggestions([]);

    if (state || city || neighbourhood) {
      toast.success('Location information auto-filled successfully!');
    }
  }, [setValue, setStateQuery, setNeighborhoodQuery, setLocationQuery, setMapCoordinates, setShowLocationDropdown, setLocationSuggestions]);

  // Use shared autocomplete hook (reuses same logic from home page)
  // MANDATORY: Input DOM ready check is built into the hook
  // Prevents multiple initializations - hook handles all guards
  const { autocompleteInstance, isInitialized: autocompleteInitialized } = usePlacesAutocomplete(
    locationAutocompleteRef,
    {
      country: 'in',
      bounds: {
        southwest: { lat: 28.4, lng: 77.0 },
        northeast: { lat: 28.8, lng: 77.4 }
      },
      types: ['geocode', 'establishment'],
      fields: ['place_id', 'geometry', 'formatted_address', 'address_components', 'name', 'types'],
      onPlaceSelect: handlePlaceSelect
    }
  );

  // Store autocomplete instance reference
  useEffect(() => {
    if (autocompleteInstance) {
      autocompleteInstanceRef.current = autocompleteInstance;
    }
  }, [autocompleteInstance]);
  
  // Initialize map when coordinates are available and valid
  useEffect(() => {
    // Guard: Map coordinates must be valid numbers
    if (!mapCoordinates || 
        typeof mapCoordinates.lat !== 'number' || 
        typeof mapCoordinates.lng !== 'number' ||
        isNaN(mapCoordinates.lat) || 
        isNaN(mapCoordinates.lng)) {
      return;
    }
    
    // Guard: Map ref must exist
    if (!mapRef.current) {
      return;
    }
    
    // Guard: Google Maps must be available
    if (typeof window === 'undefined' || !window.google?.maps?.Map) {
      console.warn('⚠️ Google Maps API not available yet');
      return;
    }
    
    // Guard: Map container must have dimensions
    const mapElement = mapRef.current;
    if (!mapElement.offsetWidth || !mapElement.offsetHeight) {
      console.warn('⚠️ Map container has no dimensions, waiting...');
      // Retry after a short delay
      const timer = setTimeout(() => {
        if (mapElement.offsetWidth && mapElement.offsetHeight) {
          // Retry initialization
          if (!mapInstanceRef.current) {
            // Will be handled by next effect run
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    
    // Guard: Prevent multiple initializations
    if (mapInstanceRef.current) {
      // Update existing map center and marker
      try {
        mapInstanceRef.current.setCenter({ lat: mapCoordinates.lat, lng: mapCoordinates.lng });
        if (markerRef.current) {
          markerRef.current.setPosition({ lat: mapCoordinates.lat, lng: mapCoordinates.lng });
        }
      } catch (error) {
        console.error('Error updating map:', error);
      }
      return;
    }
    
    try {
      // Function to hide Google Maps attribution
      const hideGoogleAttribution = () => {
        try {
          const attributionSelectors = [
            '.gm-style-cc',
            '.gm-style-cc a',
            'a[href*="google.com/maps"]',
            'a[href*="maps.google.com"]',
            '.gm-bundled-control',
            '.gm-style-cc > div',
            '.gm-style-cc > div > a',
            '[title*="Google"]',
            '[aria-label*="Google"]'
          ];
          
          attributionSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el: any) => {
              if (el) {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                el.style.height = '0';
                el.style.width = '0';
                el.style.overflow = 'hidden';
              }
            });
          });
        } catch (error) {
          // Silently fail
        }
      };

      // Create new map instance with error handling
      const map = new window.google.maps.Map(mapElement, {
        center: { lat: mapCoordinates.lat, lng: mapCoordinates.lng },
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        disableDefaultUI: false,
        gestureHandling: 'cooperative',
      });

      // Hide attribution immediately and periodically
      hideGoogleAttribution();
      setTimeout(hideGoogleAttribution, 100);
      setTimeout(hideGoogleAttribution, 500);
      setTimeout(hideGoogleAttribution, 1000);
      setTimeout(hideGoogleAttribution, 2000);
      
      // Wait for map to be ready before adding marker
      window.google.maps.event.addListenerOnce(map, 'idle', () => {
        // Hide attribution again after map loads
        hideGoogleAttribution();
        setTimeout(hideGoogleAttribution, 500);
        setTimeout(hideGoogleAttribution, 1000);
        try {
          // Create draggable marker
          markerRef.current = new window.google.maps.Marker({
            position: { lat: mapCoordinates.lat, lng: mapCoordinates.lng },
            map: map,
            draggable: true,
            title: 'Ad Location',
            animation: window.google.maps.Animation.DROP,
          });
          
          // Update coordinates when marker is dragged
          markerRef.current.addListener('dragend', (e: any) => {
            try {
              const newLat = e.latLng.lat();
              const newLng = e.latLng.lng();
              if (typeof newLat === 'number' && typeof newLng === 'number' && !isNaN(newLat) && !isNaN(newLng)) {
                setMapCoordinates({ lat: newLat, lng: newLng });
              }
            } catch (error) {
              console.error('Error updating coordinates from marker drag:', error);
            }
          });
          
          // Add info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px;">
                <strong>Ad Location</strong><br>
                <small>Lat: ${mapCoordinates.lat.toFixed(6)}, Lng: ${mapCoordinates.lng.toFixed(6)}</small>
              </div>
            `
          });
          
          markerRef.current.addListener('click', () => {
            try {
              if (markerRef.current) {
                infoWindow.open(map, markerRef.current);
              }
            } catch (error) {
              console.error('Error opening info window:', error);
            }
          });

          // Hide attribution after marker is added
          setTimeout(() => {
            hideGoogleAttribution();
          }, 500);
          
          console.log('✅ Map initialized successfully');
        } catch (error) {
          console.error('❌ Error creating marker:', error);
          toast.error('Failed to create map marker. Please try again.');
        }
      });
      
      mapInstanceRef.current = map;
    } catch (error: any) {
      console.error('❌ Error initializing Google Maps:', error);
      const errorMessage = error?.message || 'Unknown error';
      
      // Check for common error messages
      if (errorMessage.includes('InvalidKeyMapError') || errorMessage.includes('ApiNotActivatedMapError')) {
        toast.error('Google Maps API key is invalid or not activated. Please check your API key configuration.');
      } else if (errorMessage.includes('RefererNotAllowedMapError')) {
        toast.error('Google Maps API key domain restrictions are blocking this request.');
      } else {
        toast.error('Failed to load Google Maps. Please refresh the page or check your internet connection.');
      }
    }
  }, [mapCoordinates]);
  
  // Cleanup function (separate effect)
  useEffect(() => {
    return () => {
      if (autocompleteInstanceRef.current && typeof window !== 'undefined' && window.google) {
        try {
        window.google.maps.event.clearInstanceListeners(autocompleteInstanceRef.current);
        } catch (e) {
          // Ignore cleanup errors
      }
        autocompleteInstanceRef.current = null;
      }
    };
  }, []);

  // Location Autocomplete (Typeahead) - Debounced search
  useEffect(() => {
    if (!locationQuery || locationQuery.trim().length < 2) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      return;
    }

    setIsLoadingLocations(true);
    setShowLocationDropdown(true);

    const searchTimeout = setTimeout(async () => {
      try {
        const response = await api.get('/locations/mobile/search', {
          params: { q: locationQuery.trim(), limit: 10 }
        });
        
        if (response.data.success && response.data.locations) {
          setLocationSuggestions(response.data.locations);
          setSelectedLocationIndex(-1);
        } else {
          setLocationSuggestions([]);
        }
      } catch (error) {
        console.error('Location search error:', error);
        setLocationSuggestions([]);
      } finally {
        setIsLoadingLocations(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [locationQuery]);

  // Handle location selection
  const handleLocationSelect = (location: any) => {
    // Update input value
    const locationName = location.name || location.city || '';
    setLocationQuery(locationName);
    setValue('city', locationName);

    // Auto-populate form fields
    if (location.state) {
      setValue('state', location.state);
      setStateQuery(location.state);
    }
    if (location.city) {
      setValue('city', location.city);
    }
    if (location.neighbourhood) {
      setValue('neighbourhood', location.neighbourhood);
      setNeighborhoodQuery(location.neighbourhood);
    }

    // Hide dropdown
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
    setSelectedLocationIndex(-1);

    // Also update Google Places input if it exists
    if (locationAutocompleteRef.current) {
      locationAutocompleteRef.current.value = locationName;
    }
  };

  // Handle keyboard navigation for location dropdown
  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showLocationDropdown || locationSuggestions.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedLocationIndex((prev) => {
          const newIndex = prev < locationSuggestions.length - 1 ? prev + 1 : prev;
          // Scroll selected item into view
          setTimeout(() => {
            const selectedElement = locationDropdownRef.current?.querySelector(
              `li:nth-child(${newIndex + 1})`
            ) as HTMLElement;
            if (selectedElement) {
              selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 0);
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedLocationIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : -1;
          // Scroll selected item into view
          if (newIndex >= 0) {
            setTimeout(() => {
              const selectedElement = locationDropdownRef.current?.querySelector(
                `li:nth-child(${newIndex + 1})`
              ) as HTMLElement;
              if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }
            }, 0);
          }
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedLocationIndex >= 0 && selectedLocationIndex < locationSuggestions.length) {
          handleLocationSelect(locationSuggestions[selectedLocationIndex]);
        }
        break;
      case 'Escape':
        setShowLocationDropdown(false);
        setLocationSuggestions([]);
        setSelectedLocationIndex(-1);
        break;
    }
  };

  // Filter states based on query (removed /api/locations/states call)
  useEffect(() => {
    if (!stateQuery || stateQuery.trim().length === 0) {
      // Clear suggestions if query is empty
      setStateSuggestions([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      // States will be populated from location autocomplete or manual entry
      // No need to fetch all states upfront
      setShowStateDropdown(false);
    }, 200);

    return () => clearTimeout(searchTimeout);
  }, [stateQuery]);

  // Watch state value for neighborhood filtering
  const currentState = watch('state');

  // Fetch neighborhoods based on state and query
  useEffect(() => {
    // Only fetch if dropdown is shown or query exists
    if (!showNeighborhoodDropdown && (!neighborhoodQuery || neighborhoodQuery.trim().length < 1)) {
      return;
    }

    if (!neighborhoodQuery || neighborhoodQuery.trim().length < 1) {
      // If query is empty but dropdown should show, fetch all neighborhoods for current state
      setIsLoadingNeighborhoods(true);
      const params: any = { limit: 50 };
      if (currentState) {
        params.state = currentState;
      }
      
      api.get('/locations/neighborhoods', { params })
        .then(response => {
          if (response.data.success && response.data.neighborhoods) {
            setNeighborhoodSuggestions(response.data.neighborhoods);
          } else {
            setNeighborhoodSuggestions([]);
          }
        })
        .catch(error => {
          // 404 is expected if neighborhoods don't exist for the state - silently handle
          if (error.response?.status === 404 || error.isExpected404) {
            // Suppress error completely - neighborhoods may not exist for this state
            setNeighborhoodSuggestions([]);
            // Don't log or rethrow - prevent error from propagating
            return; // Exit early
          } else if (error.response?.status === 400) {
            // 400 might be validation errors - suppress
            setNeighborhoodSuggestions([]);
            // Don't log or rethrow - prevent error from propagating
            return; // Exit early
          } else {
            // Only log unexpected errors
            console.error('Failed to fetch neighborhoods:', error.response?.status || error.message);
            setNeighborhoodSuggestions([]);
          }
        })
        .finally(() => {
          setIsLoadingNeighborhoods(false);
        });
      return;
    }

    setIsLoadingNeighborhoods(true);
    const searchTimeout = setTimeout(async () => {
      try {
        const params: any = { q: neighborhoodQuery.trim(), limit: 20 };
        if (currentState) {
          params.state = currentState;
        }
        
        try {
          const response = await api.get('/locations/neighborhoods', { params });
          if (response.data.success && response.data.neighborhoods) {
            setNeighborhoodSuggestions(response.data.neighborhoods);
            setShowNeighborhoodDropdown(true);
          } else {
            setNeighborhoodSuggestions([]);
          }
        } catch (apiError: any) {
          // 404 is expected if neighborhoods don't exist for the state/query - silently handle
          if (apiError.response?.status === 404 || apiError.isExpected404) {
            // Suppress error completely - neighborhoods may not exist for this state/query
            setNeighborhoodSuggestions([]);
            // Don't log or rethrow - error is expected
            return; // Exit early to prevent further error handling
          } else if (apiError.response?.status === 400) {
            // 400 might be validation errors - suppress
            setNeighborhoodSuggestions([]);
            // Don't log or rethrow - error is expected
            return; // Exit early to prevent further error handling
          } else {
            // Only log unexpected errors
            console.error('Failed to fetch neighborhoods:', apiError.response?.status || apiError.message);
            setNeighborhoodSuggestions([]);
          }
        }
      } catch (error: any) {
        // Outer catch for any other errors (shouldn't happen, but safety net)
        setNeighborhoodSuggestions([]);
      } finally {
        setIsLoadingNeighborhoods(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [neighborhoodQuery, currentState, showNeighborhoodDropdown]);

  // Handle state selection
  const handleStateSelect = (state: string) => {
    setStateQuery(state);
    setValue('state', state);
    setShowStateDropdown(false);
    setSelectedStateIndex(-1);
    
    // Clear neighborhood if state changes
    if (watch('state') !== state) {
      setValue('neighbourhood', '');
      setNeighborhoodQuery('');
    }
  };

  // Handle neighborhood selection
  const handleNeighborhoodSelect = (neighborhood: any) => {
    const name = neighborhood.neighbourhood || '';
    setNeighborhoodQuery(name);
    setValue('neighbourhood', name);
    setShowNeighborhoodDropdown(false);
    setSelectedNeighborhoodIndex(-1);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Location dropdown
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target as Node) &&
        locationAutocompleteRef.current &&
        !locationAutocompleteRef.current.contains(event.target as Node)
      ) {
        setShowLocationDropdown(false);
      }
      
      // State dropdown
      if (
        stateDropdownRef.current &&
        !stateDropdownRef.current.contains(event.target as Node) &&
        stateInputRef.current &&
        !stateInputRef.current.contains(event.target as Node)
      ) {
        setShowStateDropdown(false);
      }
      
      // Neighborhood dropdown
      if (
        neighborhoodDropdownRef.current &&
        !neighborhoodDropdownRef.current.contains(event.target as Node) &&
        neighborhoodInputRef.current &&
        !neighborhoodInputRef.current.contains(event.target as Node)
      ) {
        setShowNeighborhoodDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // NEW SYSTEM: Check if user has active business package with ads remaining
  // IMPORTANT: Only check if adLimitStatus is loaded to avoid showing premium options during loading
  // If user has active packages with ads remaining, premium payment options should NOT be shown
  const hasActiveBusinessPackage = !isLoadingAdLimit && 
    adLimitStatus && 
    adLimitStatus.success !== false && 
    typeof adLimitStatus.activePackagesCount === 'number' &&
    adLimitStatus.activePackagesCount > 0;
  
  // NEW SYSTEM: Use adsRemaining instead of premiumSlotsAvailable
  const adsRemaining = adLimitStatus?.adsRemaining || 0;
  const hasAdsRemaining = adsRemaining > 0;
  
  // Check if user has free ads remaining
  // IMPORTANT: Default to false if not specified, so premium options show when data is missing
  const hasFreeAdsRemaining = adLimitStatus?.hasFreeAdsRemaining ?? false;
  const freeAdsRemaining = adLimitStatus?.freeAdsRemaining || 0;
  
  // Deprecated: Keep for backward compatibility
  const premiumSlotsAvailable = adLimitStatus?.premiumSlotsAvailable || 0;
  const hasPremiumSlotsAvailable = premiumSlotsAvailable > 0;
  
  // Calculate if premium options should be shown
  // CORE RULE: Hide premium options when business package ads are available
  // Show premium options ONLY when:
  // 1. No business package ads remaining AND no free ads remaining
  // 2. OR no business package at all AND no free ads remaining
  const businessAdsRemaining = adLimitStatus?.businessAdsRemaining || 0;
  const hasBusinessAdsRemaining = businessAdsRemaining > 0;
  
  // CORE RULE: Show premium options ONLY when BOTH free ads AND business package ads are exhausted
  // PRIORITY: 1. Free ads (monthly) 2. Business package ads 3. Payment required
  // IMPORTANT: If user has ANY business package (even exhausted), don't show payment options
  // Only show payment when NO business packages exist AND free ads exhausted
  const hasAnyBusinessPackage = adLimitStatus?.packages && adLimitStatus.packages.length > 0;
  
  // CRITICAL: Hide payment options if user has free ads OR business package ads OR any business package
  // Only show payment when BOTH free ads AND business package ads are exhausted AND no packages exist
  const shouldHidePaymentOptions = hasFreeAdsRemaining || hasBusinessAdsRemaining || hasAnyBusinessPackage;
  
  const shouldShowPremiumOptions = !isLoadingAdLimit && 
    adLimitStatus && // Data exists
    !hasFreeAdsRemaining && // Free ads exhausted FIRST
    businessAdsRemaining === 0 && // Business package ads exhausted SECOND
    !hasAnyBusinessPackage && // NO business packages at all (not even exhausted ones)
    !shouldHidePaymentOptions; // Additional check: ensure no free/business ads available

  // Debug: Log the calculation with detailed breakdown
  useEffect(() => {
    if (!isLoadingAdLimit) {
      const condition1 = !hasFreeAdsRemaining;
      const condition2 = !hasActiveBusinessPackage;
      const condition3 = (hasActiveBusinessPackage && !hasAdsRemaining);
      const anyConditionTrue = condition1 || condition2 || condition3;
      
      if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Premium Options Display Check:', {
        isLoadingAdLimit,
        hasAdLimitStatus: !!adLimitStatus,
        adLimitStatusSuccess: adLimitStatus?.success,
        hasFreeAdsRemaining,
        freeAdsRemaining: adLimitStatus?.freeAdsRemaining,
        hasActiveBusinessPackage,
        activePackagesCount: adLimitStatus?.activePackagesCount,
        hasAdsRemaining,
        adsRemaining: adLimitStatus?.adsRemaining,
        condition1_noFreeAds: condition1,
        condition2_noBusinessPackage: condition2,
        condition3_businessPackageNoAds: condition3,
        anyConditionTrue,
        shouldShowPremiumOptions,
          'FINAL RESULT': shouldShowPremiumOptions ? '✅ WILL SHOW' : '❌ WILL NOT SHOW'
        });
      }
      
      // Removed: This is normal async flow, not an error
      // Conditions may be met but UI not showing due to loading states - this is expected behavior
    }
  }, [isLoadingAdLimit, adLimitStatus, hasFreeAdsRemaining, hasActiveBusinessPackage, hasAdsRemaining, adsRemaining, shouldShowPremiumOptions]);

  // Debug log
  useEffect(() => {
    if (!isLoadingAdLimit && adLimitStatus) {
      if (process.env.NODE_ENV === 'development') {
      console.log('📦 Business Package Status:', {
        hasActiveBusinessPackage,
        activePackagesCount: adLimitStatus.activePackagesCount,
        adsRemaining: adLimitStatus.adsRemaining,
        hasAdsRemaining,
        hasFreeAdsRemaining,
        freeAdsRemaining: adLimitStatus.freeAdsRemaining,
        firstPackageType: adLimitStatus.packages?.[0]?.packageType,
          shouldShowPremiumOptions
      });
      }
    }
  }, [adLimitStatus, isLoadingAdLimit, hasActiveBusinessPackage, hasAdsRemaining, hasFreeAdsRemaining, shouldShowPremiumOptions]);

  // Check if payment is required BEFORE posting
  // Priority: 1. Free ads 2. Business package 3. Payment required
  // Payment is required if:
  // - No free ads remaining AND
  // - No active business package OR no business ads remaining
  const requiresPaymentBeforePosting = !isLoadingAdLimit && 
    !hasFreeAdsRemaining && 
    (!hasActiveBusinessPackage || !hasBusinessAdsRemaining);

  // Early check: If payment is required before posting, show payment modal immediately
  // DISABLED: Payment popup removed on page load - will only show when user tries to submit
  // useEffect(() => {
  //   if (!isLoadingAdLimit && requiresPaymentBeforePosting && !isPaymentVerified && !showPaymentModal) {
  //     console.log('💰 Payment required before posting - showing payment options');
  //     // Create a dummy payment order to show payment modal
  //     // We'll create the actual order when user fills the form
  //     setShowPaymentRequiredModal(true);
  //   }
  // }, [isLoadingAdLimit, requiresPaymentBeforePosting, isPaymentVerified, showPaymentModal]);
  
  // Check if payment is required (for premium features or quota)
  // Premium features ALWAYS require payment (even with business package)
  // OR if no quota remaining (free + business), payment is required
  const requiresPayment = hasPremiumFeatures || requiresPaymentBeforePosting;

  // Compute button text based on premium features and business package
  // Memoized to prevent infinite re-renders - depends only on primitive values
  const buttonText = useMemo(() => {
    // Safe fallback: if adLimitStatus not yet available, return default
    if (!adLimitStatus) {
      return 'Post Ad';
    }
    
    // Try to get package name from adLimitStatus first, then fallback to businessPackageStatus
    let packageType = adLimitStatus?.packages?.[0]?.packageType;
    
    // Fallback: if adLimitStatus doesn't have packages, try businessPackageStatus
    if (!packageType && businessPackageStatus?.packages && businessPackageStatus.packages.length > 0) {
      packageType = businessPackageStatus.packages[0]?.packageType;
    }
    
    // Also check if we have active packages from businessPackageStatus
    const hasPackageFromStatus = businessPackageStatus?.hasActivePackage || 
                                 (businessPackageStatus?.packages && businessPackageStatus.packages.length > 0);
    
    // Use businessPackageStatus as fallback for hasActiveBusinessPackage
    const actuallyHasPackage = hasActiveBusinessPackage || hasPackageFromStatus;
    
    let packageName = 'Business Package';
    
    if (packageType) {
      // Format package type: MAX_VISIBILITY -> "Max Visibility", SELLER_PLUS -> "Seller Plus", etc.
      packageName = packageType
        .split('_')
        .map((word: string) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    if (hasPremiumFeatures) {
      if (actuallyHasPackage) {
        return `Post Ad (Using ${packageName})`;
      } else {
        return 'Continue to Payment';
      }
    } else {
      // Even for regular ads, show package name if business package is active
      if (actuallyHasPackage) {
        return `Post Ad (Using ${packageName})`;
      } else {
        return 'Post Ad (Free)';
      }
    }
  }, [
    // Only primitive values and stable references
    // Extract primitive values from adLimitStatus
    adLimitStatus?.packages?.[0]?.packageType,
    adLimitStatus?.activePackagesCount,
    adLimitStatus?.success,
    isLoadingAdLimit,
    // Extract primitive values from businessPackageStatus
    businessPackageStatus?.hasActivePackage,
    businessPackageStatus?.packages?.length,
    businessPackageStatus?.packages?.[0]?.packageType,
    // hasActiveBusinessPackage is computed from isLoadingAdLimit and adLimitStatus primitives above
    hasActiveBusinessPackage,
    // hasPremiumFeatures is computed from selectedPremium and isUrgent
    hasPremiumFeatures,
    selectedPremium,
    isUrgent
  ]);

  // Log button text changes in useEffect (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && buttonText) {
      console.log('🔘 Button text:', buttonText);
    }
  }, [buttonText]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 4) {
      alert('Maximum 4 images allowed');
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser. Please enter location manually.', { duration: 5000 });
      return;
    }

    // Check if we're on HTTPS (required for geolocation in production)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      toast.error('Location detection requires HTTPS. Please enter location manually.', { duration: 5000 });
      return;
    }

    setIsDetectingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            // Better error handling for geolocation
            let errorMessage = 'Failed to detect location. Please enter location manually.';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location access denied. Please enable location permissions.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable. Please try again.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Location request timed out. Please try again.';
                break;
            }
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: false, // Changed to false for faster response
            timeout: 20000, // Increased timeout
            maximumAge: 300000, // Accept cached position up to 5 minutes
          }
        );
      });

      const { latitude, longitude } = position.coords;

      // Validate coordinates are numbers
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
        toast.error('Invalid location coordinates. Please try again or enter location manually.', { duration: 5000 });
        setIsDetectingLocation(false);
        return;
      }

      // Validate coordinate ranges
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        toast.error('Invalid location coordinates. Please try again or enter location manually.', { duration: 5000 });
        setIsDetectingLocation(false);
        return;
      }

      // Call geocoding API to detect location
      console.log('📍 Calling geocoding API with coordinates:', { latitude, longitude });
      const response = await api.post('/geocoding/detect-location', {
        latitude,
        longitude,
      }).catch((apiError: any) => {
        console.error('❌ Geocoding API call failed:', apiError);
        // Re-throw with more context
        if (apiError.response) {
          // API responded with error
          throw apiError;
        } else if (apiError.request) {
          // Request was made but no response received
          throw new Error('Network error: Could not reach the server. Please check your internet connection.');
        } else {
          // Something else happened
          throw new Error(`Request setup error: ${apiError.message}`);
        }
      });

      if (response.data.success) {
        const { detectedLocation } = response.data;

        // Update map coordinates with detected location
        if (typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude)) {
          setMapCoordinates({ lat: latitude, lng: longitude });
        }

        // Auto-populate state, city, neighbourhood from detected location
        if (detectedLocation) {
          // Build location string for autocomplete input
          const locationParts = [];
          if (detectedLocation.city) locationParts.push(detectedLocation.city);
          if (detectedLocation.state) locationParts.push(detectedLocation.state);
          const locationString = locationParts.join(', ');
          
          // Update location query state for typeahead
          if (detectedLocation.city) {
            setLocationQuery(detectedLocation.city);
          }
          
          // Update autocomplete input field
          if (locationAutocompleteRef.current && locationString) {
            locationAutocompleteRef.current.value = locationString;
          }
          
          if (detectedLocation.state) {
            setValue('state', detectedLocation.state);
            setStateQuery(detectedLocation.state);
          }
          if (detectedLocation.city) {
            setValue('city', detectedLocation.city);
          }
          if (detectedLocation.neighbourhood) {
            setValue('neighbourhood', detectedLocation.neighbourhood);
            setNeighborhoodQuery(detectedLocation.neighbourhood);
          }
          
          // Hide location dropdown after auto-detect
          setShowLocationDropdown(false);
          
          if (detectedLocation.state || detectedLocation.city || detectedLocation.neighbourhood) {
            toast.success('Location detected and auto-filled successfully!');
          } else {
            toast.success('Location detected but no detailed information available');
          }
        } else {
          // Even if no detailed location, update map with coordinates
          toast.success('Location coordinates detected. Map updated.');
        }
      } else {
        const errorMsg = response.data?.message || 'Failed to detect location';
        toast.error(errorMsg, { duration: 5000 });
        console.error('Location detection failed:', response.data);
      }
    } catch (error: any) {
      console.error('Location detection error:', error);
      
      // Handle geolocation API errors
      if (error.code === 'PERMISSION_DENIED') {
        toast.error('Location access denied. Please enable location permissions in your browser settings.', { duration: 5000 });
      } else if (error.code === 'POSITION_UNAVAILABLE') {
        toast.error('Location information unavailable. Please try again or enter location manually.', { duration: 5000 });
      } else if (error.code === 'TIMEOUT') {
        toast.error('Location request timed out. Please try again or enter location manually.', { duration: 5000 });
      } else if (error.response) {
        // Handle API errors with detailed messages
        const errorData = error.response.data;
        const statusCode = error.response.status;
        const errorMessage = errorData?.message || errorData?.error_message || 'Failed to detect location';
        
        console.error('API Error Details:', {
          status: statusCode,
          data: errorData,
          message: errorData?.message || errorData?.error_message,
          error_message: errorData?.error_message,
          status_field: errorData?.status,
          url: error.config?.url
        });
        
        // Handle HTTP status codes
        if (statusCode === 401) {
          toast.error('Please log in to use location detection. You can still enter location manually.', { duration: 5000 });
        } else if (statusCode === 403) {
          // Use backend error message if available, otherwise show generic message
          const backendMessage = errorData?.message || errorData?.error_message;
          if (backendMessage && backendMessage.includes('Geocoding API')) {
            toast.error(backendMessage, { duration: 6000 });
          } else {
            toast.error('Access denied. Please check your permissions.', { duration: 5000 });
          }
        } else if (statusCode === 404) {
          toast.error('No location found for your coordinates. Please enter location manually.', { duration: 5000 });
        } else if (statusCode === 429) {
          toast.error('Location service quota exceeded. Please try again later or enter location manually.', { duration: 6000 });
        } else if (statusCode === 500) {
          toast.error('Server error. Please try again later or enter location manually.', { duration: 5000 });
        } else if (statusCode === 503) {
          toast.error('Location service temporarily unavailable. Please try again later or enter location manually.', { duration: 5000 });
        } else {
          // Show specific error messages based on API status
          if (errorData?.status === 'REQUEST_DENIED') {
            toast.error('Geocoding API error: Please check API configuration. You can still enter location manually.', { duration: 6000 });
          } else if (errorData?.status === 'OVER_QUERY_LIMIT') {
            toast.error('Location service quota exceeded. Please try again later or enter location manually.', { duration: 6000 });
          } else if (errorData?.status === 'ZERO_RESULTS') {
            toast.error('No location found for your coordinates. Please enter location manually.', { duration: 5000 });
          } else if (errorData?.status === 'INVALID_REQUEST') {
            toast.error('Invalid location request. Please try again or enter location manually.', { duration: 5000 });
          } else {
            toast.error(errorMessage, { duration: 5000 });
          }
        }
      } else {
        // Handle network errors or other unexpected errors
        const errorMessage = error.message || 'Failed to detect location';
        console.error('Location detection error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        // Provide more helpful error messages
        if (error.message?.includes('Network') || error.message?.includes('fetch')) {
          toast.error('Network error. Please check your internet connection and try again.', { duration: 5000 });
        } else if (error.message?.includes('CORS')) {
          toast.error('CORS error. Please contact support.', { duration: 5000 });
        } else {
          toast.error(`Failed to detect location: ${errorMessage}. Please enter location manually.`, { duration: 5000 });
        }
      }
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const generateDescription = async () => {
    // Use top-level watched values instead of calling watch() inside function
    if (!title) {
      toast.error('Please enter a title first');
      return;
    }

    setIsGeneratingDescription(true);
    try {
      // Use already computed selectedCategory and selectedSubcategory from top-level

      const response = await api.post('/ai/generate-description', {
        title,
        price: price || undefined,
        condition: condition || undefined,
        category: selectedCategory?.name || undefined,
        subcategory: selectedSubcategory?.name || undefined,
      });

      if (response.data.success && response.data.description) {
        setValue('description', response.data.description);
        toast.success('Description generated successfully!');
      } else {
        toast.error('Failed to generate description');
      }
    } catch (error: any) {
      console.error('Error generating description:', error);
      toast.error(error.response?.data?.message || 'Failed to generate description. Please try again.');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const onSubmit = async (data: any) => {
    // Check authentication before submission
    if (!isAuthenticated || !user) {
      console.error('❌ User not authenticated, redirecting to login');
      toast.error('Please login to post an ad');
      router.push('/login');
      return;
    }
    
    console.log('🚀 onSubmit called', { 
      hasPremiumFeatures, 
      requiresPayment, 
      requiresPaymentBeforePosting,
      isPaymentVerified,
      selectedPremium, 
      imagesCount: images.length,
      isAuthenticated,
      userId: user?.id
    });
    
    // Log form data for debugging
    console.log('📋 Form data:', {
      title: data.title?.substring(0, 50),
      description: data.description?.substring(0, 50),
      price: data.price,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      state: data.state,
      city: data.city,
      attributes: data.attributes,
      attributesKeys: data.attributes ? Object.keys(data.attributes) : [],
      attributesCount: data.attributes ? Object.keys(data.attributes).length : 0
    });

    // CRITICAL: Block submission if payment is required but not verified
    if (requiresPaymentBeforePosting && !isPaymentVerified) {
      toast.error('Please complete payment before posting your ad');
      // Set payment required error data so modal can display
      setPaymentRequiredError({
        message: 'Please purchase a Business Package or Premium Options to continue posting ads.',
        freeAdsUsed: adLimitStatus?.freeAdsUsed || 0,
        freeAdsLimit: adLimitStatus?.freeAdsLimit || 2,
      });
      // Store form data for later use
      setAdFormData({ ...data });
      setShowPaymentRequiredModal(true);
      return;
    }

    // Check ad limit before proceeding
    // Only block if no premium features are selected AND user can't post
    // If premium features are selected, allow posting even if business package slots are exhausted
    if (adLimitStatus?.hasLimit && !adLimitStatus?.canPost && !hasPremiumFeatures) {
      toast.error(adLimitStatus.message || 'You have reached your ad limit. Please select premium features to continue posting.');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    // Check if payment is required (category posting price or premium features)
    if (requiresPayment) {
      console.log('💰 Payment required, creating payment order...');
      // Store form data (without images - we'll use images state directly)
      setAdFormData({ ...data });
      
      // Create payment order with premium options
      const orderData = {
        title: data.title,
        description: data.description,
        price: data.price,
        originalPrice: data.originalPrice,
        // Calculate discount automatically
        discount: data.originalPrice && data.price 
          ? ((parseFloat(data.originalPrice) - parseFloat(data.price)) / parseFloat(data.originalPrice) * 100).toFixed(2)
          : null,
        condition: data.condition,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        state: data.state,
        city: data.city,
        neighbourhood: data.neighbourhood,
        attributes: data.attributes || {}, // Include attributes
        specifications: data._specifications || [], // Include specifications
        premiumType: selectedPremium || null,
        isUrgent: isUrgent || false,
      };

      console.log('💰 Creating payment order for ad:', orderData);
      createPaymentOrder.mutate(orderData, {
        onSuccess: (response) => {
          console.log('✅ Payment order created:', response);
          if (!response.requiresPayment) {
            // No payment needed, create ad directly
            toast.success('No payment required. Creating ad...');
            // Create ad directly without payment
            const formData = new FormData();
            formData.append('title', data.title);
            formData.append('description', data.description);
            formData.append('price', String(data.price || ''));
            if (data.originalPrice) {
              formData.append('originalPrice', data.originalPrice);
              // Calculate discount automatically
              const discount = ((parseFloat(data.originalPrice) - parseFloat(data.price)) / parseFloat(data.originalPrice) * 100).toFixed(2);
              formData.append('discount', discount);
            }
            if (data.condition) formData.append('condition', data.condition);
            formData.append('categoryId', data.categoryId);
            if (data.subcategoryId) formData.append('subcategoryId', data.subcategoryId);
            // Location fields are now required
            formData.append('state', data.state);
            formData.append('city', data.city);
            if (data.neighbourhood) formData.append('neighbourhood', data.neighbourhood);
            formData.append('showPhone', String(showPhoneInAds));
            
            if (data.attributes && Object.keys(data.attributes).length > 0) {
              formData.append('attributes', JSON.stringify(data.attributes));
            }

            // Add specifications if they exist (for new ads)
            if (data._specifications && Array.isArray(data._specifications) && data._specifications.length > 0) {
              formData.append('specifications', JSON.stringify(data._specifications));
            }

            images.forEach((image) => {
              formData.append('images', image);
            });

            createAd.mutate(formData, {
              onSuccess: (data) => {
                console.log('✅ Ad created successfully:', data);
                toast.success('Ad posted successfully! Waiting for approval.');
                // Invalidate ad limit status to refresh it after ad creation
                queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
                queryClient.invalidateQueries({ queryKey: ['business-package', 'status'] });
                setTimeout(() => {
                  console.log('🔄 Redirecting to /my-ads');
                  router.push('/my-ads');
                }, 1500);
              },
              onError: (error: any) => {
                console.error('❌ Ad creation failed:', error);
                const errorData = error.response?.data;
                
                // Handle validation errors
                if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
                  const validationErrors = errorData.errors.map((err: any) => err.msg || err.message).join(', ');
                  toast.error(`Validation failed: ${validationErrors}`, { duration: 5000 });
                  console.error('Validation errors:', errorData.errors);
                } else {
                  toast.error(errorData?.message || 'Failed to create ad');
                }
              },
            });
            return;
          }
          setPaymentOrder(response);
          // Directly open Razorpay checkout instead of showing payment modal popup
          // Pass form data to capture in closure
          openRazorpayCheckout(response, { ...data, attributes: data.attributes || {} });
        },
        onError: (error: any) => {
          console.error('❌ Payment order creation failed:', error);
          console.error('Error response:', error.response);
          console.error('Error data:', error.response?.data);
          toast.error(error.response?.data?.message || 'Failed to create payment order. Please try again.');
        }
      });
      return;
    }

    // No premium features selected OR using business package slots, create ad directly
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('price', String(data.price || ''));
    if (data.originalPrice) {
      formData.append('originalPrice', data.originalPrice);
      // Calculate discount automatically
      const discount = ((parseFloat(data.originalPrice) - parseFloat(data.price)) / parseFloat(data.originalPrice) * 100).toFixed(2);
      formData.append('discount', discount);
    }
    if (data.condition) formData.append('condition', data.condition);
    formData.append('categoryId', data.categoryId);
    if (data.subcategoryId) formData.append('subcategoryId', data.subcategoryId);
    // Location fields are now required
    formData.append('state', data.state);
    formData.append('city', data.city);
    if (data.neighbourhood) formData.append('neighbourhood', data.neighbourhood);
    formData.append('showPhone', String(showPhoneInAds));
    
    // DON'T add premium features to initial submission if business package is active and free ads remain
    // Premium features will be applied after payment is collected (only if user selected them and doesn't have free ads)
    // If business package is active and free ads remain, ignore premium features selection
    if (hasPremiumFeatures && hasActiveBusinessPackage && hasFreeAdsRemaining) {
      // Clear premium features if user has free ads - they should use free ads instead
      console.log('📦 Premium features cleared - user has free ads available');
      setSelectedPremium(null);
    }
    
    // Add attributes if they exist
    // Clean attributes: remove empty strings and null values
    const cleanedAttributes: any = {};
    if (data.attributes) {
      Object.keys(data.attributes).forEach(key => {
        const value = data.attributes[key];
        // Only include non-empty values
        if (value !== null && value !== undefined && value !== '') {
          cleanedAttributes[key] = value;
        }
      });
    }
    
    if (Object.keys(cleanedAttributes).length > 0) {
      console.log('📦 Adding attributes to form:', cleanedAttributes);
      formData.append('attributes', JSON.stringify(cleanedAttributes));
    } else {
      console.log('⚠️ No attributes to add (all empty or undefined)');
    }

    // Add specifications if they exist (for new ads)
    if (data._specifications && Array.isArray(data._specifications) && data._specifications.length > 0) {
      formData.append('specifications', JSON.stringify(data._specifications));
    }

    images.forEach((image) => {
      formData.append('images', image);
    });

    createAd.mutate(formData, {
      onSuccess: (adResponse) => {
        console.log('✅ Ad created successfully:', adResponse);
        console.log('📋 Ad response structure:', {
          hasData: !!adResponse?.data,
          hasAd: !!adResponse?.ad,
          hasId: !!adResponse?.id,
          dataKeys: adResponse ? Object.keys(adResponse) : [],
          adKeys: adResponse?.ad ? Object.keys(adResponse.ad) : [],
          dataAdKeys: adResponse?.data?.ad ? Object.keys(adResponse.data.ad) : []
        });
        
        // Backend returns: { success: true, ad: {...} }
        // Frontend receives: response.data = { success: true, ad: {...} }
        const createdAd = adResponse?.ad || adResponse?.data?.ad;
        const createdAdId = createdAd?.id || adResponse?.data?.id || adResponse?.id;
        
        console.log('🆔 Extracted ad ID:', createdAdId);
        console.log('📋 Created ad details:', {
          id: createdAdId,
          title: createdAd?.title,
          status: createdAd?.status
        });
        
        if (!createdAdId) {
          console.error('❌ No ad ID found in response:', adResponse);
          toast.error('Ad created but ID not found. Please check My Ads page.');
          setTimeout(() => {
            router.push('/my-ads');
          }, 2000);
          return;
        }
        
        // Invalidate queries to ensure My Ads page shows the new ad
        queryClient.invalidateQueries({ queryKey: ['user', 'ads'] });
        queryClient.invalidateQueries({ queryKey: ['my-ads'] });
        
        // Invalidate and refetch ad limit status
        queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
        queryClient.invalidateQueries({ queryKey: ['business-package', 'status'] });
        
        // CRITICAL: Invalidate user ads query to ensure new ad appears in My Ads page
        queryClient.invalidateQueries({ queryKey: ['user', 'ads'] });
        queryClient.invalidateQueries({ queryKey: ['my-ads'] });
        
        // Also set the ad in cache for immediate access
        if (createdAd) {
          queryClient.setQueryData(['ad', createdAdId], createdAd);
          console.log('✅ Ad cached for immediate access:', createdAdId);
        }
        
        // If premium features were selected, show payment modal AFTER posting
        // BUT: Skip payment if business package is active and free ads remain
        if (hasPremiumFeatures && createdAdId && !(hasActiveBusinessPackage && hasFreeAdsRemaining)) {
          console.log('💰 Premium features selected, creating payment order after ad posting...');
          toast.success('Ad posted successfully! Please complete payment for premium features.');
          
          // Create payment order for premium features with ad data
          const premiumOrderData = {
            adId: createdAdId,
            title: data.title,
            description: data.description,
            price: data.price,
            originalPrice: data.originalPrice,
            discount: data.originalPrice && data.price 
              ? ((parseFloat(data.originalPrice) - parseFloat(data.price)) / parseFloat(data.originalPrice) * 100).toFixed(2)
              : null,
            condition: data.condition,
            categoryId: data.categoryId,
            subcategoryId: data.subcategoryId,
            state: data.state,
            city: data.city,
            neighbourhood: data.neighbourhood,
            premiumType: selectedPremium || null,
            isUrgent: isUrgent || false,
          };
          
          createPaymentOrder.mutate(premiumOrderData, {
            onSuccess: (paymentResponse) => {
              console.log('✅ Premium payment order created:', paymentResponse);
              if (paymentResponse.requiresPayment && paymentResponse.razorpayOrder) {
                setPaymentOrder(paymentResponse);
                // Directly open Razorpay checkout instead of showing payment modal popup
                // Note: Ad is already created, so we don't need form data for this flow
                openRazorpayCheckout(paymentResponse);
              } else {
                toast.success('Premium features applied successfully!');
                setTimeout(() => {
                  router.push('/my-ads');
                }, 1500);
              }
            },
            onError: (error: any) => {
              console.error('❌ Premium payment order creation failed:', error);
              toast.error('Ad posted but failed to create premium payment order. You can upgrade later.');
              setTimeout(() => {
                router.push('/my-ads');
              }, 2000);
            }
          });
        } else {
          // No premium features, redirect normally
          toast.success('Ad posted successfully! Waiting for approval.');
          setTimeout(() => {
            console.log('🔄 Redirecting to /my-ads');
            router.push('/my-ads');
          }, 1500);
        }
      },
      onError: (error: any) => {
        console.error('❌ Ad creation failed:', error);
        console.error('❌ Error details:', {
          message: error.message,
          response: error.response,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: error.config,
          requestUrl: error.config?.url,
          requestMethod: error.config?.method
        });
        const errorData = error.response?.data;
        const status = error.response?.status;
        
        // Handle 402 Payment Required - Free ads limit reached
        if (status === 402 && errorData?.requiresPayment) {
          console.log('💰 Payment required - showing payment options modal');
          console.log('📝 Storing form data:', data);
          setPaymentRequiredError(errorData);
          setShowPaymentRequiredModal(true);
          // Store form data for later use (include all fields)
          setAdFormData({ 
            ...data,
            attributes: data.attributes || {},
            images: images // Store image references
          });
          return;
        }
        
        // Handle validation errors
        if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          const validationErrors = errorData.errors.map((err: any) => err.msg || err.message).join(', ');
          toast.error(`Validation failed: ${validationErrors}`, { duration: 5000 });
          console.error('Validation errors:', errorData.errors);
        } else {
          toast.error(errorData?.message || 'Failed to create ad');
        }
      },
    });
  };

  const handlePaymentSuccess = async (paymentId: string, signature: string, orderIdFromResponse?: string, orderOverride?: any, formDataOverride?: any) => {
    // Use orderOverride if provided, otherwise use paymentOrder from state
    const currentOrder = orderOverride || paymentOrder;
    // Use formDataOverride if provided, otherwise use adFormData from state
    const currentFormData = formDataOverride || adFormData;
    
    console.log('💳 Payment success received:', { paymentId, signature, orderIdFromResponse, hasOrder: !!currentOrder, hasFormData: !!currentFormData });
    
    if (!currentOrder) {
      console.error('❌ Payment order missing');
      toast.error('Payment order not found. Please try again.');
      return;
    }

    if (!currentFormData) {
      console.error('❌ Ad form data missing');
      toast.error('Ad form data not found. Please try again.');
      return;
    }

    // Use orderId from response if available, otherwise use from currentOrder
    const orderIdToVerify = orderIdFromResponse || currentOrder.razorpayOrder.id;
    console.log('🔄 Verifying payment with orderId:', orderIdToVerify);
    
    verifyPayment.mutate(
      {
        orderId: orderIdToVerify,
        paymentId,
        signature,
      },
      {
        onSuccess: async (response) => {
          console.log('✅ Payment verified:', response);
          toast.success('Payment verified! Creating your ad...');
          setShowPaymentModal(false);
          // Mark payment as verified - this allows form submission
          setIsPaymentVerified(true);
          // Invalidate ad limit status immediately after payment verification
          queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
          queryClient.invalidateQueries({ queryKey: ['business-package', 'status'] });
          
          // Now create the ad with payment order ID
          console.log('📝 Creating ad with data:', { 
            title: currentFormData.title, 
            imagesCount: currentFormData.images?.length || 0,
            paymentOrderId: currentOrder.razorpayOrder.id 
          });

          const formData = new FormData();
          formData.append('title', currentFormData.title);
          formData.append('description', currentFormData.description);
          formData.append('price', String(currentFormData.price || ''));
          if (currentFormData.originalPrice) formData.append('originalPrice', currentFormData.originalPrice);
          if (currentFormData.discount) formData.append('discount', currentFormData.discount);
          if (currentFormData.condition) formData.append('condition', currentFormData.condition);
          formData.append('categoryId', currentFormData.categoryId);
          if (currentFormData.subcategoryId) formData.append('subcategoryId', currentFormData.subcategoryId);
          if (currentFormData.state) formData.append('state', currentFormData.state);
          if (currentFormData.city) formData.append('city', currentFormData.city);
          if (currentFormData.neighbourhood) formData.append('neighbourhood', currentFormData.neighbourhood);
          formData.append('showPhone', String(showPhoneInAds));
          formData.append('paymentOrderId', currentOrder.razorpayOrder.id);
          
          // IMPORTANT: Add premium features to formData so backend detects it as premium ad
          // This prevents quota check when payment order exists
          if (selectedPremium) {
            formData.append('premiumType', selectedPremium);
            console.log('⭐ Adding premiumType to formData after payment:', selectedPremium);
          }
          
          // Add attributes if they exist
          if (currentFormData.attributes && Object.keys(currentFormData.attributes).length > 0) {
            formData.append('attributes', JSON.stringify(currentFormData.attributes));
          }

          // Use images from state (File objects persist in state)
          if (!images || images.length === 0) {
            console.error('❌ No images found in state');
            toast.error('No images found. Please upload images again.');
            return;
          }

          console.log('📸 Uploading', images.length, 'images');
          images.forEach((image: File) => {
            formData.append('images', image);
          });

          console.log('📤 Submitting ad creation with:', {
            hasPaymentOrder: true,
            paymentOrderId: currentOrder.razorpayOrder.id,
            premiumType: selectedPremium || null,
            isUrgent: isUrgent || false,
            isPremiumAd: !!(selectedPremium || isUrgent)
          });
          createAd.mutate(formData, {
            onSuccess: (data) => {
              console.log('✅ Ad created successfully:', data);
              toast.success('Ad posted successfully! Redirecting to orders...');
              // Invalidate ad limit status to refresh it after ad creation
              queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
              queryClient.invalidateQueries({ queryKey: ['business-package', 'status'] });
              // Redirect to orders page after successful payment and ad creation
              setTimeout(() => {
                console.log('🔄 Redirecting to /orders');
                router.push('/orders');
              }, 1500);
            },
            onError: (error: any) => {
              console.error('❌ Ad creation failed:', error);
              const errorData = error.response?.data;
              
              // Handle validation errors
              if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
                const validationErrors = errorData.errors.map((err: any) => err.msg || err.message).join(', ');
                toast.error(`Validation failed: ${validationErrors}`, { duration: 5000 });
                console.error('Validation errors:', errorData.errors);
              } else {
                toast.error(errorData?.message || 'Failed to create ad. Please contact support.');
              }
            },
          });
        },
        onError: (error: any) => {
          console.error('❌ Payment verification failed:', error);
          toast.error(error.response?.data?.message || 'Payment verification failed. Please contact support.');
          setShowPaymentModal(false);
        },
      }
    );
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    toast.error('Payment failed. Please try again.');
    setShowPaymentModal(false);
  };

  // Function to directly open Razorpay checkout without showing payment modal popup
  const openRazorpayCheckout = useCallback((order: any, formDataToCapture?: any) => {
    if (!order?.razorpayOrder) {
      console.error('❌ Payment order missing required fields');
      toast.error('Invalid payment order. Please try again.');
      return;
    }

    const { razorpayOrder } = order;
    // Capture form data in closure to avoid state timing issues
    const capturedFormData = formDataToCapture || adFormData;

    // Load Razorpay script if not already loaded
    const loadRazorpayScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (window.Razorpay) {
          resolve();
          return;
        }

        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay script')));
          return;
        }

        // Load Razorpay script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay script'));
        document.head.appendChild(script);
      });
    };

    // Load script and open Razorpay
    loadRazorpayScript()
      .then(() => {
        if (!window.Razorpay) {
          toast.error('Payment gateway not loaded. Please refresh and try again.');
          return;
        }

        const amountInPaise = razorpayOrder.amount || Math.round((order.amount || 0) * 100);

        if (isNaN(amountInPaise) || amountInPaise < 100 || amountInPaise > 10000000) {
          console.error('❌ Invalid payment amount:', { amountInPaise, razorpayOrderAmount: razorpayOrder.amount, amount: order.amount });
          toast.error('Invalid payment amount. Please contact support.');
          return;
        }

        const premiumOffer = safePremiumSettings.find((offer: any) => offer.type === selectedPremium);
        const descriptionText = selectedPremium 
          ? `Complete payment to post your ${selectedPremium === 'TOP' ? 'Top' : selectedPremium === 'FEATURED' ? 'Featured' : 'Bump Up'} ad`
          : 'Complete payment to post your ad';

        const options = {
          key: razorpayOrder.key,
          amount: amountInPaise,
          currency: 'INR',
          name: 'SellIt',
          description: descriptionText,
          order_id: razorpayOrder.id,
          handler: function (response: any) {
            console.log('✅ Payment successful:', response);
            // Pass order and form data from closure to handlePaymentSuccess to avoid state timing issues
            handlePaymentSuccess(
              response.razorpay_payment_id,
              response.razorpay_signature,
              response.razorpay_order_id,
              order, // Pass order from closure
              capturedFormData // Pass form data from closure
            );
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || ''
          },
          theme: {
            color: '#4F46E5'
          },
          modal: {
            ondismiss: function() {
              console.log('⚠️ Payment modal dismissed by user');
            }
          },
          'payment.error': function(error: any) {
            console.error('❌ Razorpay payment error:', error);
            let errorMessage = error.error?.description || error.error?.reason || error.error?.code || 'Payment failed. Please try again.';
            if (errorMessage.toLowerCase().includes('international') || errorMessage.toLowerCase().includes('not supported')) {
              errorMessage = 'International cards are not supported. Please use an Indian card.';
            }
            toast.error(errorMessage);
            handlePaymentError(error);
          },
          'payment.cancel': function() {
            console.log('⚠️ Payment cancelled by user');
          },
          'payment.failed': function(error: any) {
            console.error('❌ Payment failed:', error);
            toast.error('Payment could not be completed. Please try again.');
            handlePaymentError(error);
          }
        };

        try {
          const razorpay = new window.Razorpay(options);
          razorpay.open();
        } catch (error: any) {
          console.error('❌ Failed to initialize Razorpay:', error);
          toast.error('Failed to initialize payment');
          handlePaymentError(error);
        }
      })
      .catch((error) => {
        console.error('❌ Failed to load Razorpay script:', error);
        toast.error('Failed to load payment gateway. Please refresh and try again.');
      });
  }, [handlePaymentSuccess, handlePaymentError, selectedPremium, premiumSettings, user]);

  // Remove body padding for post-ad page - must be before any early returns
  useEffect(() => {
    document.body.classList.add('no-navbar-padding');
    return () => {
      document.body.classList.remove('no-navbar-padding');
    };
  }, []);

  // Show loading during initial mount to prevent hydration mismatch
  // Early returns must be AFTER all hooks
  if (!mounted || isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  // FIX: Don't block entire UI - allow form to render so autocomplete can initialize
  // Location input must always render (not dependent on adLimitStatus)
  // Only disable submit button when adLimitStatus is not ready
  const canSubmit = !isLoadingAdLimit && adLimitStatus !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Modern Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a New Ad</h1>
          <p className="text-gray-600">Fill in the details to sell your item quickly and reach thousands of buyers.</p>
        </div>

        {/* Loading indicator for ad limits (non-blocking) */}
        {isLoadingAdLimit && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">Loading ad limits...</p>
          </div>
        )}

        {/* Ad Limit Alert - Only show if not dismissed */}
        {!isLoadingAdLimit && adLimitStatus?.hasLimit && !adLimitStatus?.canPost && !isAdLimitAlertDismissed && (
        <>
          <AdLimitAlert
            packageName={adLimitStatus.packageName || 'Business Package'}
            maxAds={adLimitStatus.maxAds || 0}
            currentAds={adLimitStatus.currentAds || 0}
            message={adLimitStatus.message || 'You have reached your ad limit.'}
            extraAdSlots={adLimitStatus.extraAdSlots || 0}
            totalAllowedAds={adLimitStatus.totalAllowedAds}
            onDismiss={() => setIsAdLimitAlertDismissed(true)}
            dismissible={true}
          />
          {/* Message below banner when business package slots are exhausted */}
          {hasActiveBusinessPackage && !hasAdsRemaining && (
            <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800 font-medium">
                Your business package slots are used, but you can still post ads using Premium features.
              </p>
            </div>
          )}
        </>
        )}

        {/* Payment Required Alert - Show if payment is required but not verified */}
        {!isLoadingAdLimit && requiresPaymentBeforePosting && !isPaymentVerified && (
          <div className="mb-6 p-6 bg-red-50 border-2 border-red-300 rounded-lg shadow-lg">
            <div className="flex items-start gap-4">
              <FiAlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-2">
                  Payment Required to Post Ad
                </h3>
                <p className="text-red-800 mb-4">
                  You have used all your free ads and business package ads. Please complete payment to continue posting ads.
                </p>
                <p className="text-sm text-red-700">
                  Please fill in the form below and click "Post Ad" to proceed with payment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Verified Success Message */}
        {isPaymentVerified && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
            <div className="flex items-center gap-3">
              <FiCheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">
                Payment verified! You can now proceed to post your ad.
              </p>
            </div>
          </div>
        )}

        {/* Sell Box Style Quota Information Banner - HIDDEN */}
        {false && !isLoadingAdLimit && adLimitStatus && (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FREE ADS Box - Sell Box Style */}
            <div className="relative bg-white rounded-lg p-4 border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-2 right-2">
                <FiFlag className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 uppercase">FREE ADS</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-3xl font-bold ${adLimitStatus.freeAdsRemaining > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {adLimitStatus.freeAdsRemaining || 0}
                </span>
                <span className="text-lg text-gray-500">/</span>
                <span className="text-lg text-gray-600 font-medium">{adLimitStatus.freeAdsLimit || 2}</span>
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Remaining this month
              </div>
              <div className="mt-3 text-xs text-gray-600">
                {adLimitStatus.freeAdsUsed || 0} used • Resets on {adLimitStatus.userAdQuota?.monthlyFreeAds?.resetAt ? new Date(adLimitStatus.userAdQuota.monthlyFreeAds.resetAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '1st of next month'}
              </div>
            </div>

            {/* BUSINESS PACKAGE Box - Sell Box Style */}
            <div className="relative bg-white rounded-lg p-4 border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-2 right-2">
                <FiBriefcase className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 uppercase">BUSINESS PACKAGE</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-3xl font-bold ${adLimitStatus.businessAdsRemaining > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {adLimitStatus.businessAdsRemaining || 0}
                </span>
                <span className="text-lg text-gray-500">/</span>
                <span className="text-lg text-gray-600 font-medium">
                  {adLimitStatus.packages?.reduce((sum: number, pkg: any) => sum + (pkg.totalAds || pkg.totalAdsAllowed || 0), 0) || 0}
                </span>
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Active credits available
              </div>
              <div className="mt-3 text-xs text-gray-600">
                {adLimitStatus.totalPurchased || 0} Total Purchase{adLimitStatus.totalPurchased !== 1 ? 's' : ''} • {adLimitStatus.activePackagesCount || 0} Active Package{adLimitStatus.activePackagesCount !== 1 ? 's' : ''}
                {adLimitStatus.exhaustedPackagesCount > 0 && (
                  <> • {adLimitStatus.exhaustedPackagesCount} Exhausted</>
                )}
              </div>
            </div>
          </div>

          {/* Package Details - Collapsible */}
          {adLimitStatus.packages && adLimitStatus.packages.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Package Details</h4>
                <span className="text-xs text-gray-500">
                  {adLimitStatus.packages.filter((p: any) => (p.adsRemaining || 0) > 0).length} Active • {adLimitStatus.packages.filter((p: any) => p.isExhausted || p.status === 'EXHAUSTED').length} Exhausted
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {adLimitStatus.packages.map((pkg: any, index: number) => {
                  const remaining = pkg.adsRemaining || 0;
                  const used = pkg.usedAds || pkg.adsUsed || 0;
                  const total = pkg.totalAds || pkg.totalAdsAllowed || 0;
                  const isExhausted = pkg.isExhausted || (remaining === 0 && total > 0 && !pkg.isExpired);
                  const isExpired = pkg.isExpired || pkg.status === 'EXPIRED';
                  const isActive = !isExhausted && !isExpired && remaining > 0;
                  const isOldestWithAds = index === 0 && isActive;
                  const packageName = pkg.packageName || pkg.packageType?.replace('_', ' ') || 'Package';
                  
                  return (
                    <div 
                      key={pkg.packageId || pkg.id} 
                      className={`text-xs p-2.5 rounded border ${
                        isActive 
                          ? 'bg-green-50 border-green-300' 
                          : isExhausted 
                            ? 'bg-orange-50 border-orange-300' 
                            : isExpired
                              ? 'bg-gray-50 border-gray-300'
                              : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold ${
                          isActive ? 'text-green-700' : isExhausted ? 'text-orange-700' : isExpired ? 'text-gray-600' : 'text-blue-700'
                        }`}>
                          {packageName}
                        </span>
                        <div className="flex items-center gap-1">
                          {isOldestWithAds && (
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded font-bold">
                              USING
                            </span>
                          )}
                          {isExhausted && (
                            <span className="px-1.5 py-0.5 bg-orange-600 text-white text-xs rounded font-bold">
                              EXHAUSTED
                            </span>
                          )}
                          {isExpired && (
                            <span className="px-1.5 py-0.5 bg-gray-600 text-white text-xs rounded font-bold">
                              EXPIRED
                            </span>
                          )}
                          {isActive && !isOldestWithAds && (
                            <span className="font-bold text-green-600">
                              {remaining} left
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Ads: </span>
                          <span className="font-medium">{used}/{total}</span>
                        </div>
                        {pkg.expiresAt && (
                          <div>
                            <span className="text-gray-500">Expires: </span>
                            <span className="font-medium">{new Date(pkg.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Total Ads Available - HIDDEN */}
          {false && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border-2 border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Total Ads Available</div>
                <div className="text-xs text-gray-600">
                  {adLimitStatus.freeAdsRemaining || 0} Free + {adLimitStatus.businessAdsRemaining || 0} Package = <span className="font-bold text-indigo-600">{adLimitStatus.totalRemaining || 0} Total</span>
                </div>
              </div>
              <div className={`text-4xl font-bold ${adLimitStatus.totalRemaining > 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                {adLimitStatus.totalRemaining || 0}
              </div>
            </div>
          </div>
          )}
        </div>
        )}

        {/* Payment Options Hidden Banner - Sell Box Style - HIDDEN */}
        {false && !isLoadingAdLimit && shouldHidePaymentOptions && adLimitStatus && (
        <div className="mb-6 p-4 rounded-lg bg-orange-50 border-2 border-orange-300 flex items-center justify-between">
          <div className="flex items-start gap-3 flex-1">
            <FiInfo className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-orange-900 mb-1">
                Payment Options Hidden
              </p>
              <p className="text-sm text-orange-800">
                Payment steps are hidden because you have {hasFreeAdsRemaining ? `${freeAdsRemaining} free ad${freeAdsRemaining !== 1 ? 's' : ''}` : ''}{hasFreeAdsRemaining && hasBusinessAdsRemaining ? ' and ' : ''}{hasBusinessAdsRemaining ? `${businessAdsRemaining} business package ad${businessAdsRemaining !== 1 ? 's' : ''}` : ''} available. {hasBusinessAdsRemaining ? 'Credits will be deducted automatically.' : 'Free ads are used first.'}
              </p>
            </div>
          </div>
          {hasAnyBusinessPackage && (
            <Link 
              href="/business-package"
              className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              View Packages
            </Link>
          )}
        </div>
        )}

        {/* Info Banner - When no ads available */}
        {!isLoadingAdLimit && adLimitStatus && adLimitStatus.totalRemaining === 0 && !shouldHidePaymentOptions && (
        <div className="mb-6 p-4 rounded-lg flex items-center gap-3 bg-red-50 border-2 border-red-200">
          <FiAlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-semibold text-red-800">
              All Ads Exhausted - Premium Payment Required
            </p>
            <p className="text-sm text-red-700 mt-1">
              You have used all free ads and business package ads. Select premium features below to continue posting ads with enhanced visibility.
            </p>
          </div>
        </div>
        )}

        {/* Form Sections */}
        <div className="space-y-6">

            <form 
              onSubmit={handleSubmit(onSubmit)} 
              className="space-y-6"
            >
              {/* Ad Details Section - Modern Design */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Ad Details</h2>
                
                <div className="space-y-5">
                  {/* Ad Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ad Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('title', { 
                        required: 'Title is required', 
                        maxLength: { value: 70, message: 'Title must not exceed 70 characters' },
                        minLength: { value: 5, message: 'Title must be at least 5 characters' }
                      })}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Keep it short and distinct (e.g. iPhone 14 Pro Max 256GB)"
                    />
                    {errors.title && (
                      <p className="text-red-500 text-sm mt-1">{errors.title.message as string}</p>
                    )}
                  </div>

                  {/* Category & Subcategory */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                        <select
                          {...register('categoryId', { required: 'Category is required' })}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                            errors.categoryId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                          onChange={(e) => {
                            setValue('categoryId', e.target.value);
                          setValue('subcategoryId', '');
                          }}
                        >
                        <option value="">Select Category</option>
                          {categories?.map((cat: any) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        {errors.categoryId && (
                        <p className="text-red-500 text-sm mt-1">{errors.categoryId.message as string}</p>
                        )}
                      </div>
                      <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subcategory <span className="text-red-500">*</span>
                      </label>
                        <select
                          {...register('subcategoryId', { required: 'Subcategory is required' })}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                          errors.subcategoryId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                          disabled={!selectedCategory}
                        >
                        <option value="">Select Subcategory</option>
                          {selectedCategory?.subcategories?.map((sub: any) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </select>
                        {errors.subcategoryId && (
                        <p className="text-red-500 text-sm mt-1">{errors.subcategoryId.message as string}</p>
                        )}
                </div>
              </div>

                  {/* Price - Hidden for Mobile Phones */}
                  {!isMobilePhones && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 font-semibold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          {...register('price', { 
                            required: !isMobilePhones ? 'Price is required' : false, 
                            min: { value: 0, message: 'Price must be greater than or equal to 0' }
                          })}
                          className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                            errors.price ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="mt-2 flex items-center">
                        <input
                          type="checkbox"
                          id="negotiable"
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <label htmlFor="negotiable" className="ml-2 text-sm text-gray-700">
                          Price is negotiable
                        </label>
                      </div>
                      {errors.price && (
                        <p className="text-red-500 text-sm mt-1">{errors.price.message as string}</p>
                      )}
                    </div>
                  )}

                  {/* Description with Rich Text Editor */}
                      <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    {/* Rich Text Toolbar */}
                    <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-t-lg border-b border-gray-200">
                      <button type="button" className="p-2 hover:bg-gray-200 rounded" title="Bold">
                        <span className="font-bold">B</span>
                      </button>
                      <button type="button" className="p-2 hover:bg-gray-200 rounded" title="Italic">
                        <span className="italic">I</span>
                      </button>
                      <button type="button" className="p-2 hover:bg-gray-200 rounded" title="List">
                        <span>•</span>
                      </button>
                    </div>
                        <textarea
                          {...register('description', { 
                            required: 'Description is required',
                            minLength: { value: 10, message: 'Description must be at least 10 characters' },
                        maxLength: { value: 5000, message: 'Description must not exceed 5000 characters' }
                          })}
                      rows={8}
                      className={`w-full px-4 py-3 border rounded-b-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none ${
                            errors.description ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                      placeholder="Describe your item in detail. Include condition, features, and why you are selling it..."
                        />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-500">SUPPORTED FORMATS: Plain text</p>
                      <p className="text-xs text-gray-500">{(watch('description')?.length || 0)}/5000</p>
                    </div>
                        {errors.description && (
                      <p className="text-red-500 text-sm mt-1">{errors.description.message as string}</p>
                    )}
                          </div>
                </div>
              </div>


              {/* Product Specifications - Category Specific */}
              {selectedCategory && selectedSubcategory && (
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Specifications</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mobiles Category Fields */}
                    {(selectedCategory.slug === 'mobiles' || selectedCategory.name?.toLowerCase().includes('mobile')) && (
                      <>
                        {/* Brand Dropdown with Autocomplete */}
                        {isMobilePhones && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Brand <span className="text-red-500">*</span>
                            </label>
                            <CreatableSelect
                              options={brandOptions}
                              value={watch('attributes.brand') ? {
                                value: watch('attributes.brand'),
                                label: watch('attributes.brand')
                              } : null}
                              onChange={(newValue, actionMeta) => {
                                if (actionMeta.action === 'create-option') {
                                  // New value created - add to options and select
                                  const newBrand = actionMeta.option.value;
                                  setBrandOptions(prev => [
                                    { value: newBrand, label: newBrand },
                                    ...prev
                                  ]);
                                  setValue('attributes.brand', newBrand);
                                  setSelectedBrand(newBrand);
                                  // Clear model when brand changes
                                  setValue('attributes.model', '');
                                  setModels([]);
                                  setModelOptions([]);
                                } else if (newValue) {
                                  setValue('attributes.brand', newValue.value);
                                  setSelectedBrand(newValue.value);
                                  // Clear model when brand changes
                                  setValue('attributes.model', '');
                                  setModels([]);
                                  setModelOptions([]);
                                } else {
                                  setValue('attributes.brand', '');
                                  setSelectedBrand('');
                                  setValue('attributes.model', '');
                                  setModels([]);
                                  setModelOptions([]);
                                }
                              }}
                              onInputChange={(inputValue) => {
                                setBrandSearchQuery(inputValue);
                              }}
                              onCreateOption={(inputValue) => {
                                // User typed a new value - create it
                                const newBrand = inputValue.trim();
                                if (newBrand) {
                                  setBrandOptions(prev => [
                                    { value: newBrand, label: newBrand },
                                    ...prev
                                  ]);
                                  setValue('attributes.brand', newBrand);
                                  setSelectedBrand(newBrand);
                                  // Clear model when brand changes
                                  setValue('attributes.model', '');
                                  setModels([]);
                                  setModelOptions([]);
                                }
                              }}
                              placeholder={isLoadingBrands ? 'Loading brands...' : 'Select or type brand'}
                              isClearable
                              isSearchable
                              isLoading={isLoadingBrands}
                              formatCreateLabel={(inputValue) => `+ Add "${inputValue}"`}
                              className="react-select-container"
                              classNamePrefix="react-select"
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  minHeight: '48px',
                                  borderColor: errors.attributes?.brand ? '#ef4444' : '#d1d5db',
                                  '&:hover': {
                                    borderColor: errors.attributes?.brand ? '#ef4444' : '#9ca3af'
                                  }
                                })
                              }}
                            />
                            {errors.attributes?.brand && (
                              <p className="text-red-500 text-sm mt-1">
                                {(errors.attributes.brand as any)?.message || 'Brand is required'}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Model Dropdown with Autocomplete - Show after brand is selected */}
                        {isMobilePhones && selectedBrandFromForm && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Model <span className="text-red-500">*</span>
                            </label>
                            <CreatableSelect
                              options={modelOptions}
                              value={watch('attributes.model') ? {
                                value: watch('attributes.model'),
                                label: watch('attributes.model')
                              } : null}
                              onChange={(newValue, actionMeta) => {
                                if (actionMeta.action === 'create-option') {
                                  // New value created - add to options and select
                                  const newModel = actionMeta.option.value;
                                  setModelOptions(prev => [
                                    { value: newModel, label: newModel },
                                    ...prev
                                  ]);
                                  setValue('attributes.model', newModel);
                                } else if (newValue) {
                                  setValue('attributes.model', newValue.value);
                                } else {
                                  setValue('attributes.model', '');
                                }
                              }}
                              onInputChange={(inputValue) => {
                                setModelSearchQuery(inputValue);
                              }}
                              onCreateOption={(inputValue) => {
                                // User typed a new value - create it
                                const newModel = inputValue.trim();
                                if (newModel) {
                                  setModelOptions(prev => [
                                    { value: newModel, label: newModel },
                                    ...prev
                                  ]);
                                  setValue('attributes.model', newModel);
                                }
                              }}
                              placeholder={isLoadingModels ? 'Loading models...' : 'Select or type model'}
                              isClearable
                              isSearchable
                              isLoading={isLoadingModels}
                              formatCreateLabel={(inputValue) => `+ Add "${inputValue}"`}
                              className="react-select-container"
                              classNamePrefix="react-select"
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  minHeight: '48px',
                                  borderColor: errors.attributes?.model ? '#ef4444' : '#d1d5db',
                                  '&:hover': {
                                    borderColor: errors.attributes?.model ? '#ef4444' : '#9ca3af'
                                  }
                                })
                              }}
                            />
                            {errors.attributes?.model && (
                              <p className="text-red-500 text-sm mt-1">
                                {(errors.attributes.model as any)?.message || 'Model is required'}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Color Dropdown with Autocomplete */}
                        {isMobilePhones && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                            <CreatableSelect
                              options={colorOptions}
                              value={watch('attributes.color') ? {
                                value: watch('attributes.color'),
                                label: watch('attributes.color')
                              } : null}
                              onChange={(newValue, actionMeta) => {
                                if (actionMeta.action === 'create-option') {
                                  // New value created - add to options and select
                                  const newColor = actionMeta.option.value;
                                  setColorOptions(prev => [
                                    { value: newColor, label: newColor },
                                    ...prev
                                  ]);
                                  setValue('attributes.color', newColor);
                                } else if (newValue) {
                                  setValue('attributes.color', newValue.value);
                                } else {
                                  setValue('attributes.color', '');
                                }
                              }}
                              onInputChange={(inputValue) => {
                                setColorSearchQuery(inputValue);
                              }}
                              onCreateOption={(inputValue) => {
                                // User typed a new value - create it
                                const newColor = inputValue.trim();
                                if (newColor) {
                                  setColorOptions(prev => [
                                    { value: newColor, label: newColor },
                                    ...prev
                                  ]);
                                  setValue('attributes.color', newColor);
                                }
                              }}
                              placeholder={isLoadingColors ? 'Loading colors...' : 'Select or type color'}
                              isClearable
                              isSearchable
                              isLoading={isLoadingColors}
                              formatCreateLabel={(inputValue) => `+ Add "${inputValue}"`}
                              className="react-select-container"
                              classNamePrefix="react-select"
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  minHeight: '48px',
                                  borderColor: errors.attributes?.color ? '#ef4444' : '#d1d5db',
                                  '&:hover': {
                                    borderColor: errors.attributes?.color ? '#ef4444' : '#9ca3af'
                                  }
                                })
                              }}
                            />
                            {errors.attributes?.color && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors.attributes.color.message as string}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Storage Dropdown with Autocomplete */}
                        {isMobilePhones && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Storage</label>
                            <CreatableSelect
                              options={storageOptions}
                              value={watch('attributes.storage') ? {
                                value: watch('attributes.storage'),
                                label: watch('attributes.storage')
                              } : null}
                              onChange={(newValue, actionMeta) => {
                                if (actionMeta.action === 'create-option') {
                                  // New value created - add to options and select
                                  const newStorage = actionMeta.option.value;
                                  setStorageOptions(prev => [
                                    { value: newStorage, label: newStorage },
                                    ...prev
                                  ]);
                                  setValue('attributes.storage', newStorage);
                                } else if (newValue) {
                                  setValue('attributes.storage', newValue.value);
                                } else {
                                  setValue('attributes.storage', '');
                                }
                              }}
                              onInputChange={(inputValue) => {
                                setStorageSearchQuery(inputValue);
                              }}
                              onCreateOption={(inputValue) => {
                                // User typed a new value - create it
                                const newStorage = inputValue.trim();
                                if (newStorage) {
                                  setStorageOptions(prev => [
                                    { value: newStorage, label: newStorage },
                                    ...prev
                                  ]);
                                  setValue('attributes.storage', newStorage);
                                }
                              }}
                              placeholder={isLoadingStorage ? 'Loading storage...' : 'Select or type storage'}
                              isClearable
                              isSearchable
                              isLoading={isLoadingStorage}
                              formatCreateLabel={(inputValue) => `+ Add "${inputValue}"`}
                              className="react-select-container"
                              classNamePrefix="react-select"
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  minHeight: '48px',
                                  borderColor: errors.attributes?.storage ? '#ef4444' : '#d1d5db',
                                  '&:hover': {
                                    borderColor: errors.attributes?.storage ? '#ef4444' : '#9ca3af'
                                  }
                                })
                              }}
                            />
                            {errors.attributes?.storage && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors.attributes.storage.message as string}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Price - Show for Mobile Phones in Product Specifications */}
                        {isMobilePhones && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Price <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 font-semibold">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                {...register('price', { 
                                  required: isMobilePhones ? 'Price is required' : false, 
                                  min: { value: 0, message: 'Price must be greater than or equal to 0' }
                                })}
                                className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                                  errors.price ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="mt-2 flex items-center">
                              <input
                                type="checkbox"
                                id="negotiable-specs"
                                {...register('isNegotiable')}
                                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                              />
                              <label htmlFor="negotiable-specs" className="ml-2 text-sm text-gray-700">
                                Price is negotiable
                              </label>
                            </div>
                            {errors.price && (
                              <p className="text-red-500 text-sm mt-1">{errors.price.message as string}</p>
                            )}
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Warranty</label>
                          <select
                            {...register('attributes.warranty')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Warranty</option>
                            <option value="no_warranty">No Warranty</option>
                            <option value="1_month">1 Month</option>
                            <option value="3_months">3 Months</option>
                            <option value="6_months">6 Months</option>
                            <option value="1_year">1 Year</option>
                            <option value="2_years">2 Years</option>
                            <option value="manufacturer_warranty">Manufacturer Warranty</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Battery Health</label>
                          <select
                            {...register('attributes.battery_health')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Battery Health</option>
                            <option value="100">100%</option>
                            <option value="90-99">90-99%</option>
                            <option value="80-89">80-89%</option>
                            <option value="70-79">70-79%</option>
                            <option value="60-69">60-69%</option>
                            <option value="below_60">Below 60%</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                          <input
                            type="text"
                            {...register('attributes.price_range')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. ₹5,000 - ₹10,000"
                          />
                        </div>
                      </>
                    )}

                    {/* Vehicles Category Fields */}
                    {(selectedCategory.slug === 'vehicles' || selectedCategory.name?.toLowerCase().includes('vehicle') || selectedCategory.name?.toLowerCase().includes('car') || selectedCategory.name?.toLowerCase().includes('bike')) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                          <input
                            type="text"
                            {...register('attributes.brand')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Maruti, Honda, Toyota"
                          />
                      </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                          <input
                            type="text"
                            {...register('attributes.model')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Swift, City, Innova"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                          <input
                            type="number"
                            {...register('attributes.year')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. 2020"
                            min="1900"
                            max={new Date().getFullYear() + 1}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Type</label>
                          <select
                            {...register('attributes.fuel_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Fuel Type</option>
                            <option value="petrol">Petrol</option>
                            <option value="diesel">Diesel</option>
                            <option value="cng">CNG</option>
                            <option value="lpg">LPG</option>
                            <option value="electric">Electric</option>
                            <option value="hybrid">Hybrid</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">KM Driven</label>
                          <input
                            type="number"
                            {...register('attributes.km_driven')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. 50000"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Owner Type</label>
                          <select
                            {...register('attributes.owner_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Owner Type</option>
                            <option value="first_owner">First Owner</option>
                            <option value="second_owner">Second Owner</option>
                            <option value="third_owner">Third Owner</option>
                            <option value="fourth_owner_plus">Fourth Owner & Above</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Transmission</label>
                          <select
                            {...register('attributes.transmission')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Transmission</option>
                            <option value="manual">Manual</option>
                            <option value="automatic">Automatic</option>
                            <option value="cvt">CVT</option>
                            <option value="amt">AMT</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Status</label>
                          <select
                            {...register('attributes.insurance_status')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Insurance Status</option>
                            <option value="valid">Valid</option>
                            <option value="expired">Expired</option>
                            <option value="not_available">Not Available</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                          <input
                            type="text"
                            {...register('attributes.color')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. White, Black, Red"
                          />
                        </div>
                      </>
                    )}

                    {/* Properties Category Fields */}
                    {(selectedCategory.slug === 'properties' || selectedCategory.name?.toLowerCase().includes('property') || selectedCategory.name?.toLowerCase().includes('real estate') || selectedCategory.name?.toLowerCase().includes('house')) && (
                      <>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                          <select
                            {...register('attributes.property_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Property Type</option>
                            <option value="apartment">Apartment</option>
                            <option value="house">House</option>
                            <option value="villa">Villa</option>
                            <option value="plot">Plot</option>
                            <option value="commercial">Commercial</option>
                            <option value="office">Office</option>
                            <option value="shop">Shop</option>
                            <option value="warehouse">Warehouse</option>
                            <option value="land">Land</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Area (Sqft)</label>
                          <input
                            type="number"
                            {...register('attributes.area_sqft')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. 1200"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                          <select
                            {...register('attributes.bedrooms')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Bedrooms</option>
                            <option value="1">1 BHK</option>
                            <option value="2">2 BHK</option>
                            <option value="3">3 BHK</option>
                            <option value="4">4 BHK</option>
                            <option value="5">5 BHK</option>
                            <option value="5+">5+ BHK</option>
                            <option value="studio">Studio</option>
                          </select>
                          </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                          <select
                            {...register('attributes.bathrooms')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Bathrooms</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5+">5+</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Furnishing</label>
                          <select
                            {...register('attributes.furnishing')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Furnishing</option>
                            <option value="furnished">Furnished</option>
                            <option value="semi_furnished">Semi-Furnished</option>
                            <option value="unfurnished">Unfurnished</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Parking</label>
                          <select
                            {...register('attributes.parking')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Parking</option>
                            <option value="0">No Parking</option>
                            <option value="1">1 Parking</option>
                            <option value="2">2 Parking</option>
                            <option value="3">3 Parking</option>
                            <option value="4+">4+ Parking</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Facing</label>
                          <select
                            {...register('attributes.facing')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Facing</option>
                            <option value="north">North</option>
                            <option value="south">South</option>
                            <option value="east">East</option>
                            <option value="west">West</option>
                            <option value="north_east">North-East</option>
                            <option value="north_west">North-West</option>
                            <option value="south_east">South-East</option>
                            <option value="south_west">South-West</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Ownership Type</label>
                          <select
                            {...register('attributes.ownership_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Ownership Type</option>
                            <option value="freehold">Freehold</option>
                            <option value="leasehold">Leasehold</option>
                            <option value="cooperative">Cooperative</option>
                            <option value="power_of_attorney">Power of Attorney</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                          <input
                            type="text"
                            {...register('attributes.price_range')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. ₹50,00,000 - ₹1,00,00,000"
                          />
                        </div>
                      </>
                    )}

                    {/* Home & Furniture Category Fields */}
                    {(selectedCategory.slug === 'home-furniture' || selectedCategory.slug === 'home' || selectedCategory.name?.toLowerCase().includes('home') || selectedCategory.name?.toLowerCase().includes('furniture')) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                          <input
                            type="text"
                            {...register('attributes.material')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Wood, Metal, Plastic"
                          />
                      </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                          <input
                            type="text"
                            {...register('attributes.brand')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. IKEA, Godrej"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                          <select
                            {...register('attributes.condition')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Condition</option>
                            <option value="new">New</option>
                            <option value="like_new">Like New</option>
                            <option value="excellent">Excellent</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                          <input
                            type="text"
                            {...register('attributes.color')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Brown, White, Black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions</label>
                          <input
                            type="text"
                            {...register('attributes.dimensions')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. 120cm x 60cm x 75cm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Assembly Required</label>
                          <select
                            {...register('attributes.assembly_required')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="pre_assembled">Pre-Assembled</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                          <input
                            type="text"
                            {...register('attributes.price_range')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. ₹5,000 - ₹20,000"
                          />
                        </div>
                      </>
                    )}

                    {/* Fashion Category Fields */}
                    {(selectedCategory.slug === 'fashion' || selectedCategory.name?.toLowerCase().includes('fashion') || selectedCategory.name?.toLowerCase().includes('clothing') || selectedCategory.name?.toLowerCase().includes('apparel')) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                          <input
                            type="text"
                            {...register('attributes.brand')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Zara, H&M, Levi's"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                          <input
                            type="text"
                            {...register('attributes.size')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. S, M, L, XL, 32, 36"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                          <input
                            type="text"
                            {...register('attributes.color')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Red, Blue, Black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                          <select
                            {...register('attributes.gender')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Gender</option>
                            <option value="men">Men</option>
                            <option value="women">Women</option>
                            <option value="boys">Boys</option>
                            <option value="girls">Girls</option>
                            <option value="unisex">Unisex</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                          <input
                            type="text"
                            {...register('attributes.material')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Cotton, Polyester, Denim"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Fit Type</label>
                          <select
                            {...register('attributes.fit_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Fit Type</option>
                            <option value="slim">Slim</option>
                            <option value="regular">Regular</option>
                            <option value="loose">Loose</option>
                            <option value="skinny">Skinny</option>
                            <option value="relaxed">Relaxed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                          <select
                            {...register('attributes.condition')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Condition</option>
                            <option value="new">New</option>
                            <option value="like_new">Like New</option>
                            <option value="excellent">Excellent</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                          <input
                            type="text"
                            {...register('attributes.price_range')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. ₹500 - ₹5,000"
                          />
                        </div>
                      </>
                    )}

                    {/* Books, Sports & Hobbies Category Fields */}
                    {(selectedCategory.slug === 'books' || selectedCategory.slug === 'sports' || selectedCategory.slug === 'hobbies' || selectedCategory.name?.toLowerCase().includes('book') || selectedCategory.name?.toLowerCase().includes('sport') || selectedCategory.name?.toLowerCase().includes('hobby')) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Category Type</label>
                          <input
                            type="text"
                            {...register('attributes.category_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Fiction, Sports Equipment, Musical Instrument"
                          />
                    </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                          <input
                            type="text"
                            {...register('attributes.brand')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Nike, Adidas, Penguin"
                          />
                  </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Author / Maker</label>
                          <input
                            type="text"
                            {...register('attributes.author_maker')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. J.K. Rowling, Company Name"
                          />
                </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                          <select
                            {...register('attributes.language')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Language</option>
                            <option value="english">English</option>
                            <option value="hindi">Hindi</option>
                            <option value="malayalam">Malayalam</option>
                            <option value="tamil">Tamil</option>
                            <option value="telugu">Telugu</option>
                            <option value="kannada">Kannada</option>
                            <option value="bengali">Bengali</option>
                            <option value="gujarati">Gujarati</option>
                            <option value="marathi">Marathi</option>
                            <option value="other">Other</option>
                          </select>
              </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Age Group</label>
                          <select
                            {...register('attributes.age_group')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Age Group</option>
                            <option value="0-2">0-2 years</option>
                            <option value="3-5">3-5 years</option>
                            <option value="6-8">6-8 years</option>
                            <option value="9-12">9-12 years</option>
                            <option value="13-17">13-17 years</option>
                            <option value="18+">18+ years</option>
                            <option value="all_ages">All Ages</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                          <select
                            {...register('attributes.condition')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Condition</option>
                            <option value="new">New</option>
                            <option value="like_new">Like New</option>
                            <option value="excellent">Excellent</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                          <input
                            type="text"
                            {...register('attributes.price_range')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. ₹100 - ₹5,000"
                          />
                        </div>
                      </>
                    )}

                    {/* Pets Category Fields */}
                    {(selectedCategory.slug === 'pets' || selectedCategory.name?.toLowerCase().includes('pet') || selectedCategory.name?.toLowerCase().includes('animal')) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Breed</label>
                          <input
                            type="text"
                            {...register('attributes.breed')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Golden Retriever, Persian Cat"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                          <input
                            type="text"
                            {...register('attributes.age')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. 2 months, 1 year"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                          <select
                            {...register('attributes.gender')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                  </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Vaccinated</label>
                          <select
                            {...register('attributes.vaccinated')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="partially">Partially</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Trained</label>
                          <select
                            {...register('attributes.trained')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="basic">Basic Training</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">With Papers</label>
                          <select
                            {...register('attributes.with_papers')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                          <input
                            type="text"
                            {...register('attributes.color')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Golden, Black, White"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                          <input
                            type="text"
                            {...register('attributes.price_range')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. ₹5,000 - ₹50,000"
                          />
                        </div>
                      </>
                    )}

                    {/* Services Category Fields */}
                    {(selectedCategory.slug === 'services' || selectedCategory.name?.toLowerCase().includes('service')) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                          <input
                            type="text"
                            {...register('attributes.service_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Plumbing, Electrician, Tutor"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                          <select
                            {...register('attributes.experience_level')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Experience Level</option>
                            <option value="beginner">Beginner (0-1 years)</option>
                            <option value="intermediate">Intermediate (2-5 years)</option>
                            <option value="experienced">Experienced (5-10 years)</option>
                            <option value="expert">Expert (10+ years)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                          <select
                            {...register('attributes.availability')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Availability</option>
                            <option value="full_time">Full Time</option>
                            <option value="part_time">Part Time</option>
                            <option value="weekends_only">Weekends Only</option>
                            <option value="flexible">Flexible</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Service Mode</label>
                          <select
                            {...register('attributes.service_mode')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Service Mode</option>
                            <option value="online">Online</option>
                            <option value="offline">Offline</option>
                            <option value="both">Both</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                          <input
                            type="text"
                            {...register('attributes.location')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. City, Area"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                          <input
                            type="text"
                            {...register('attributes.price_range')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. ₹500 - ₹5,000 per hour"
                          />
                        </div>
                      </>
                    )}

                    {/* Jobs Category Fields */}
                    {(selectedCategory.slug === 'jobs' || selectedCategory.name?.toLowerCase().includes('job') || selectedCategory.name?.toLowerCase().includes('career')) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Job Role</label>
                          <input
                            type="text"
                            {...register('attributes.job_role')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Software Developer, Sales Executive"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                          <select
                            {...register('attributes.experience_level')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Experience Level</option>
                            <option value="fresher">Fresher (0 years)</option>
                            <option value="0-1">0-1 years</option>
                            <option value="1-3">1-3 years</option>
                            <option value="3-5">3-5 years</option>
                            <option value="5-10">5-10 years</option>
                            <option value="10+">10+ years</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
                          <select
                            {...register('attributes.job_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Job Type</option>
                            <option value="full_time">Full Time</option>
                            <option value="part_time">Part Time</option>
                            <option value="contract">Contract</option>
                            <option value="internship">Internship</option>
                            <option value="freelance">Freelance</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Work Mode</label>
                          <select
                            {...register('attributes.work_mode')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select Work Mode</option>
                            <option value="work_from_home">Work From Home</option>
                            <option value="office">Office</option>
                            <option value="hybrid">Hybrid</option>
                            <option value="field">Field Work</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
                          <input
                            type="text"
                            {...register('attributes.qualification')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. B.Tech, MBA, Diploma"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Salary Range</label>
                          <input
                            type="text"
                            {...register('attributes.salary_range')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. ₹20,000 - ₹50,000 per month"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                          <input
                            type="text"
                            {...register('attributes.location')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. City, Area"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Images Section - Modern Design */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Images</h2>
                  <span className="text-sm text-gray-500">Max 12 photos</span>
                </div>
                
                <div className="space-y-4">
                  {/* Drag & Drop Upload Area */}
                      <label className="block">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer bg-gray-50">
                          <div className="flex flex-col items-center">
                        <FiCamera className="w-10 h-10 text-gray-400 mb-3" />
                        <span className="text-sm font-medium text-gray-700 mb-1">ADD PHOTOS</span>
                        <span className="text-xs text-gray-500">or drag & drop</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </div>
                      </label>

                  {/* Image Previews */}
                  {previews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {previews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                          />
                          </div>
                          {index === 0 && (
                            <span className="absolute bottom-2 left-2 bg-white text-gray-900 text-xs font-semibold px-2 py-1 rounded">
                              MAIN PHOTO
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                          </div>
                  )}

                  <p className="text-xs text-gray-500">
                    SUPPORTED FORMATS: JPG, PNG. MAX SIZE: 5MB PER IMAGE.
                  </p>
                  
                    {images.length === 0 && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                        <FiAlertCircle className="w-4 h-4" />
                        At least one image is required
                      </p>
                    )}
                </div>
              </div>

              {/* Location Information - Modern Design */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Location Information</h2>
                
                <div className="space-y-4">
                  {/* Location Input with Auto-detect */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          <input
                            id="location-input"
                            ref={(el) => {
                              locationAutocompleteRef.current = el;
                              const isMounted = !!el;
                              setLocationInputMounted(isMounted);
                            }}
                            type="text"
                            autoComplete="off"
                          value={locationQuery || watch('city') || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setLocationQuery(value);
                          }}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="New York, NY"
                        />
                        </div>
                      {(watch('city') || watch('state')) && (
                        <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                          <FiCheckCircle className="w-5 h-5 text-yellow-600" />
                          <p className="text-sm text-yellow-900">
                            Auto-detected. We've set your location based on your profile preferences.
                          </p>
                      </div>
                          )}
                        </div>
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={isDetectingLocation}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Auto Detect Location"
                    >
                      <FiNavigation className="w-5 h-5 text-gray-600" />
                    </button>
                      </div>

                  {/* Map Preview */}
                        {mapCoordinates && 
                         typeof mapCoordinates.lat === 'number' && 
                         typeof mapCoordinates.lng === 'number' &&
                         !isNaN(mapCoordinates.lat) &&
                         !isNaN(mapCoordinates.lng) ? (
                    <div className="relative h-48 rounded-lg overflow-hidden border border-gray-200">
                            <div 
                              ref={mapRef}
                        className="w-full h-full"
                        style={{ minHeight: '200px' }}
                      />
                          </div>
                        ) : (
                    <div className="h-48 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <FiMapPin className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Map will appear when location is selected</p>
                            </div>
                          </div>
                        )}
                </div>
              </div>


              {/* Business Package Status - Modern Design */}
              <div 
                data-premium-section
                className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                      <FiCheckCircle className="w-6 h-6 text-white" />
                          </div>
                          <div>
                      <h2 className="text-xl font-semibold text-gray-900">Business Package Status</h2>
                      <p className="text-sm text-gray-600">Select premium features to boost your ad visibility.</p>
                          </div>
                        </div>
                  {adLimitStatus && adLimitStatus.businessAdsRemaining > 0 && (
                    <span className="bg-orange-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {adLimitStatus.businessAdsRemaining} CREDITS AVAILABLE
                    </span>
                  )}
              </div>

                {/* Premium Features with Toggles */}
                        {isLoadingOffers ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                            <span className="ml-3 text-gray-600">Loading premium options...</span>
                          </div>
                ) : (
                  <div className="space-y-4">
                    {/* TOP Ads */}
                    {safePremiumSettings.find((o: any) => o.type === 'TOP') && (
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">T</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">TOP Ads</div>
                            <div className="text-sm text-gray-600">Display in the exclusive top section of search results.</div>
                          </div>
                          <div className="text-right mr-4">
                            <span className="text-sm font-semibold text-gray-900">
                              {safePremiumSettings.find((o: any) => o.type === 'TOP')?.price || 0} CREDITS
                            </span>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                            type="checkbox"
                            checked={selectedPremium === 'TOP'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPremium('TOP');
                              } else {
                                setSelectedPremium(null);
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                                      </div>
                                    )}

                    {/* Featured Ad */}
                    {safePremiumSettings.find((o: any) => o.type === 'FEATURED') && (
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3 flex-1">
                          <FiStar className="w-10 h-10 text-yellow-500" />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">Featured Ad</div>
                            <div className="text-sm text-gray-600">Pin your ad to the top of the category for 7 days.</div>
                                  </div>
                          <div className="text-right mr-4">
                            <span className="text-sm font-semibold text-gray-900">
                              {safePremiumSettings.find((o: any) => o.type === 'FEATURED')?.price || 0} CREDIT
                            </span>
                                      </div>
                                  </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPremium === 'FEATURED'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPremium('FEATURED');
                              } else {
                                setSelectedPremium(null);
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                </label>
                              </div>
                    )}

                    {/* Bump Up */}
                    {safePremiumSettings.find((o: any) => o.type === 'BUMP_UP') && (
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3 flex-1">
                          <FiTrendingUp className="w-10 h-10 text-green-500" />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">Bump Up</div>
                            <div className="text-sm text-gray-600">Move your ad to the top of the list every 24h.</div>
                          </div>
                          <div className="text-right mr-4">
                            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                              INCLUDED IN PACKAGE
                            </span>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPremium === 'BUMP_UP'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPremium('BUMP_UP');
                              } else {
                                setSelectedPremium(null);
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>
                    )}
                      </div>
                    )}
              </div>

              {/* Footer Actions - Modern Design */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.push('/my-ads')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  disabled={
                    !canSubmit ||
                    createAd.isPending || 
                    createPaymentOrder.isPending
                  }
                  className="px-8 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createAd.isPending || createPaymentOrder.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Post Ad Now'
                  )}
                </button>
              </div>

              {/* Copyright Footer */}
              <div className="text-center text-sm text-gray-500 mt-8 pb-4">
                © 2024 Classifieds Marketplace. All rights reserved. Professional Selling Platform Variant 1.
              </div>

            </form>
        </div>
      </div>


      {/* Payment Required Modal - Free Ads Limit Reached */}
      {showPaymentRequiredModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <FiAlertCircle className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">Payment Required</h2>
                </div>
                <button
                  onClick={() => {
                    setShowPaymentRequiredModal(false);
                    setPaymentRequiredError(null);
                  }}
                  className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white/20"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <p className="text-orange-50 text-sm">Continue posting with premium features or business package</p>
            </div>
            
            <div className="p-6">
              {/* Free Ads Usage Progress */}
              {paymentRequiredError && (
                <div className="mb-6">
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-5 mb-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiAlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-yellow-900 mb-1">Free Ads Limit Reached</h3>
                        <p className="text-yellow-800 text-sm">
                          You have used <span className="font-bold">{paymentRequiredError.freeAdsUsed || 0}</span> of <span className="font-bold">{paymentRequiredError.freeAdsLimit || 2}</span> free ads this month.
                        </p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-yellow-800 mb-2">
                        <span>Free Ads Used</span>
                        <span>{paymentRequiredError.freeAdsUsed || 0} / {paymentRequiredError.freeAdsLimit || 2}</span>
                      </div>
                      <div className="w-full bg-yellow-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(((paymentRequiredError.freeAdsUsed || 0) / (paymentRequiredError.freeAdsLimit || 2)) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Message */}
              <div className="mb-6">
                <p className="text-gray-700 leading-relaxed">
                  {paymentRequiredError?.message || 'To continue posting ads, choose one of the options below:'}
                </p>
              </div>
              
              {/* Options Cards */}
              <div className="space-y-3 mb-6">
                {/* Option 1: Premium Features */}
                <button
                  onClick={() => {
                    setShowPaymentRequiredModal(false);
                    setTimeout(() => {
                      const premiumSection = document.querySelector('[data-premium-section]');
                      if (premiumSection) {
                        premiumSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        premiumSection.classList.add('ring-4', 'ring-yellow-400');
                        setTimeout(() => {
                          premiumSection.classList.remove('ring-4', 'ring-yellow-400');
                        }, 3000);
                      }
                    }, 100);
                  }}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <FiStar className="w-5 h-5" />
                  <span>Select Premium Features</span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Quick</span>
                </button>
                
                {/* Option 2: Business Package */}
                <button
                  onClick={() => {
                    setShowPaymentRequiredModal(false);
                    router.push('/business-package');
                  }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <FiBriefcase className="w-5 h-5" />
                  <span>Purchase Business Package</span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Best Value</span>
                </button>
                
                {/* Option 3: Continue with Payment */}
                {selectedPremium && (
                  <button
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    onClick={async () => {
                      if (!adFormData) {
                        toast.error('Form data is missing. Please try submitting the form again.');
                        setShowPaymentRequiredModal(false);
                        return;
                      }
                      
                      setShowPaymentRequiredModal(false);
                      console.log('💰 Creating payment order with data:', adFormData);
                      console.log('💰 Premium features selected:', { selectedPremium, isUrgent });
                      
                      const orderData = {
                        title: adFormData.title,
                        description: adFormData.description,
                        price: adFormData.price,
                        originalPrice: adFormData.originalPrice,
                        discount: adFormData.discount,
                        condition: adFormData.condition,
                        categoryId: adFormData.categoryId,
                        subcategoryId: adFormData.subcategoryId,
                        state: adFormData.state,
                        city: adFormData.city,
                        neighbourhood: adFormData.neighbourhood,
                        attributes: adFormData.attributes || {},
                        premiumType: selectedPremium || null,
                        isUrgent: isUrgent || false,
                      };
                      
                      console.log('📤 Sending payment order request:', orderData);
                      createPaymentOrder.mutate(orderData, {
                        onSuccess: (response) => {
                          console.log('✅ Payment order response received:', response);
                          console.log('   requiresPayment:', response.requiresPayment);
                          console.log('   razorpayOrder:', response.razorpayOrder);
                          
                          if (!response.requiresPayment) {
                            // No payment needed, create ad directly
                            const formData = new FormData();
                            formData.append('title', adFormData.title);
                            formData.append('description', adFormData.description);
                            formData.append('price', String(adFormData.price || ''));
                            if (adFormData.originalPrice) formData.append('originalPrice', adFormData.originalPrice);
                            if (adFormData.discount) formData.append('discount', adFormData.discount);
                            if (adFormData.condition) formData.append('condition', adFormData.condition);
                            formData.append('categoryId', adFormData.categoryId);
                            if (adFormData.subcategoryId) formData.append('subcategoryId', adFormData.subcategoryId);
                            if (adFormData.state) formData.append('state', adFormData.state);
                            if (adFormData.city) formData.append('city', adFormData.city);
                            if (adFormData.neighbourhood) formData.append('neighbourhood', adFormData.neighbourhood);
                            formData.append('showPhone', String(showPhoneInAds));
                            
                            if (adFormData.attributes && Object.keys(adFormData.attributes).length > 0) {
                              formData.append('attributes', JSON.stringify(adFormData.attributes));
                            }

                            images.forEach((image) => {
                              formData.append('images', image);
                            });

                            createAd.mutate(formData, {
                              onSuccess: (data) => {
                                toast.success('Ad posted successfully! Waiting for approval.');
                                queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
                                queryClient.invalidateQueries({ queryKey: ['business-package', 'status'] });
                                setTimeout(() => {
                                  router.push('/my-ads');
                                }, 1500);
                              },
                              onError: (error: any) => {
                                const errorData = error.response?.data;
                                if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
                                  const validationErrors = errorData.errors.map((err: any) => err.msg || err.message).join(', ');
                                  toast.error(`Validation failed: ${validationErrors}`, { duration: 5000 });
                                } else {
                                  toast.error(errorData?.message || 'Failed to create ad');
                                }
                              },
                            });
                            return;
                          }
                          
                          // Verify response has required fields
                          if (!response.razorpayOrder || !response.razorpayOrder.id) {
                            console.error('❌ Invalid payment order response - missing razorpayOrder:', response);
                            toast.error('Invalid payment order response. Please try again.');
                            setShowPaymentRequiredModal(true);
                            return;
                          }
                          
                          console.log('✅ Setting payment order and showing modal');
                          console.log('✅ Payment order details:', {
                            hasRazorpayOrder: !!response.razorpayOrder,
                            orderId: response.razorpayOrder?.id,
                            amount: response.razorpayOrder?.amount,
                            key: response.razorpayOrder?.key?.substring(0, 10) + '...'
                          });
                          
                          // Verify all required fields are present
                          if (!response.razorpayOrder || !response.razorpayOrder.id || !response.razorpayOrder.key) {
                            console.error('❌ Payment order missing required fields:', response);
                            toast.error('Invalid payment order. Please try again.');
                            setShowPaymentRequiredModal(true);
                            return;
                          }
                          
                          setPaymentOrder(response);
                          // Directly open Razorpay checkout instead of showing payment modal popup
                          // Pass form data to capture in closure
                          openRazorpayCheckout(response, adFormData);
                          console.log('✅ Opening Razorpay checkout directly');
                        },
                        onError: (error: any) => {
                          console.error('❌ Payment order creation failed:', error);
                          console.error('Error response:', error.response);
                          console.error('Error data:', error.response?.data);
                          const errorMessage = error.response?.data?.message || 'Failed to create payment order. Please try again.';
                          toast.error(errorMessage, { duration: 5000 });
                          // Re-show the payment required modal so user can try again or choose business package
                          setShowPaymentRequiredModal(true);
                        }
                      });
                    }}
                  >
                    <FiCreditCard className="w-5 h-5" />
                    <span>Continue with Payment</span>
                  </button>
                )}
              </div>
              
              {/* Info Box */}
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <FiInfo className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium mb-1">💡 Quick Tip</p>
                    <p className="text-xs text-blue-700">
                      {selectedPremium 
                        ? 'You have selected a premium feature. Click "Continue with Payment" to proceed.'
                        : 'Select a premium feature from the form below, then click "Post Ad" to continue with payment.'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Cancel Button */}
              <button
                onClick={() => {
                  setShowPaymentRequiredModal(false);
                  setPaymentRequiredError(null);
                }}
                className="w-full border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentOrder && paymentOrder.razorpayOrder && (() => {
        // Get premium offer details
        const premiumOffer = safePremiumSettings.find((offer: any) => offer.type === selectedPremium);
        const premiumPrice = premiumOffer?.price || 0;
        const baseAdPrice = paymentOrder.amount ? (paymentOrder.razorpayOrder.amount / 100) - premiumPrice : 0;
        const totalAmount = paymentOrder.razorpayOrder?.amount 
          ? paymentOrder.razorpayOrder.amount / 100 
          : (paymentOrder.amount || 49);

        // Build enhanced package details
        const packageDetails: any = {
          name: selectedPremium 
            ? (selectedPremium === 'TOP' ? 'Top Ad Package' : selectedPremium === 'FEATURED' ? 'Featured Ad Package' : 'Bump Up Package')
            : 'Ad Posting',
          type: selectedPremium ? 'PREMIUM_AD' : 'AD_POSTING',
          premiumType: selectedPremium as 'TOP' | 'FEATURED' | 'BUMP_UP' | undefined,
          validity: selectedPremium 
            ? (selectedPremium === 'TOP' ? 7 : selectedPremium === 'FEATURED' ? 14 : 1)
            : undefined,
          validityUnit: selectedPremium === 'BUMP_UP' ? 'hours' : selectedPremium ? 'days' : undefined,
          benefits: selectedPremium 
            ? (selectedPremium === 'TOP' 
                ? ['Top placement in search results', 'Maximum visibility & reach', 'Featured badge on ad', 'Priority in category listings', '7 days premium visibility']
                : selectedPremium === 'FEATURED'
                ? ['Featured placement in listings', 'Enhanced visibility', 'Featured badge on ad', 'Better search ranking', '14 days premium visibility']
                : ['Bump ad to top of listings', '24-hour visibility boost', 'Immediate top placement', 'Quick visibility increase'])
            : ['Post your ad on SellIt', 'Reach thousands of buyers', 'Manage your listings'],
          visibilityLevel: selectedPremium 
            ? (selectedPremium === 'TOP' ? 'Maximum' : selectedPremium === 'FEATURED' ? 'Enhanced' : 'Boosted')
            : 'Standard',
          adTitle: title || 'Your Ad',
          priceBreakdown: {
            baseAdPrice: baseAdPrice > 0 ? baseAdPrice : undefined,
            premiumPrice: premiumPrice > 0 ? premiumPrice : undefined,
            total: totalAmount
          }
        };


        return (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            amount={totalAmount}
            orderId={paymentOrder.razorpayOrder.id}
            razorpayKey={paymentOrder.razorpayOrder.key}
            razorpayOrderAmount={paymentOrder.razorpayOrder.amount}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            description={selectedPremium 
              ? `Complete payment to post your ${selectedPremium === 'TOP' ? 'Top' : selectedPremium === 'FEATURED' ? 'Featured' : 'Bump Up'} ad`
              : 'Complete payment to post your ad'}
            packageDetails={packageDetails}
            successAction={{
              label: 'Post Ad Now',
              onClick: () => {
                setShowPaymentModal(false);
                // Payment success will trigger handlePaymentSuccess which will post the ad
              }
            }}
          />
        );
      })()}
    </div>
  );
}
