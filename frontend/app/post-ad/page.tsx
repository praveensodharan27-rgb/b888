'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useCreateAd, useFreeAdsStatus, useCreateAdPostingOrder, useVerifyAdPostingPayment, useAdLimitStatus } from '@/hooks/useAds';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { getSocket } from '@/lib/socket';
import { FiX, FiUpload, FiCreditCard, FiInfo, FiStar, FiTrendingUp, FiRefreshCw, FiAlertCircle, FiZap, FiNavigation, FiBriefcase, FiFlag, FiCheckCircle, FiPackage, FiUser, FiCamera, FiMapPin } from 'react-icons/fi';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ImageWithFallback from '@/components/ImageWithFallback';
import CategoryAttributes from '@/components/CategoryAttributes';
import AdLimitAlert from '@/components/AdLimitAlert';
import toast from 'react-hot-toast';

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
  const [googlePlacesLoaded, setGooglePlacesLoaded] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // 3. ALL useRef hooks
  const locationAutocompleteRef = useRef<HTMLInputElement>(null);
  const autocompleteInstanceRef = useRef<any>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // 4. Custom hooks and useQuery hooks
  const createAd = useCreateAd();
  const { data: freeAdsStatus } = useFreeAdsStatus();
  const { data: adLimitStatus, isLoading: isLoadingAdLimit } = useAdLimitStatus(isAuthenticated);
  
  // Also fetch business package status as fallback for button text
  const { data: businessPackageStatus } = useQuery({
    queryKey: ['business-package', 'status'],
    queryFn: async () => {
      const response = await api.get('/business-package/status');
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 10 * 1000,
    refetchOnMount: true,
  });
  
  const createPaymentOrder = useCreateAdPostingOrder();
  const verifyPayment = useVerifyAdPostingPayment();
  
  const TOTAL_STEPS = 8; // Category & Subcategory (combined), Brand, Specs, Title/Description, Image, Price, Location
  
  // Get premium offers (public endpoint for users) - must be after useState hooks
  const { data: premiumSettings, isLoading: isLoadingOffers } = useQuery({
    queryKey: ['premium-offers'],
    queryFn: async () => {
      const response = await api.get('/premium/offers');
      const offersData = response.data.offers;
      
      // Transform the object structure into an array format
      // API returns: { prices: {...}, offerPrices: {...}, durations: {...} }
      // We need: [{ type: 'TOP', name: '...', price: ..., duration: ... }, ...]
      if (offersData && typeof offersData === 'object' && !Array.isArray(offersData)) {
        const offersArray = [];
        const premiumTypes = ['TOP', 'FEATURED', 'BUMP_UP', 'URGENT'];
        
        premiumTypes.forEach((type) => {
          const price = offersData.offerPrices?.[type] || offersData.prices?.[type] || 0;
          const duration = offersData.durations?.[type] || 7;
          
          if (price > 0) {
            offersArray.push({
              id: type,
              type: type,
              name: type === 'TOP' ? 'Top Ad' : 
                    type === 'FEATURED' ? 'Featured Ad' : 
                    type === 'BUMP_UP' ? 'Bump Up' : 'Urgent Ad',
              description: type === 'TOP' ? 'Get your ad featured at the top of search results' :
                           type === 'FEATURED' ? 'Highlight your ad with featured badge' :
                           type === 'BUMP_UP' ? 'Bump your ad to the top of listings' :
                           'Mark your ad as urgent for priority placement',
              price: price,
              duration: duration,
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
  
  // Check if premium features are selected
  const hasPremiumFeatures = !!(selectedPremium || isUrgent);

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

  // Load Google Places API script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not found. Location autocomplete will not work.');
      return;
    }

    // Check if script is already loaded
    if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
      setGooglePlacesLoaded(true);
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="places"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setGooglePlacesLoaded(true);
      });
      return;
    }

    // Load Google Places API script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGooglePlacesLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Places API');
    };
    document.head.appendChild(script);
  }, []);

  // Initialize Google Places Autocomplete when Google Places API is loaded
  useEffect(() => {
    if (!googlePlacesLoaded || !locationAutocompleteRef.current) {
      return;
    }

    // Clear existing autocomplete if any
    if (autocompleteInstanceRef.current && typeof window !== 'undefined' && window.google) {
      window.google.maps.event.clearInstanceListeners(autocompleteInstanceRef.current);
    }

    if (typeof window === 'undefined' || !window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }

    // Create autocomplete instance
    const autocomplete = new window.google.maps.places.Autocomplete(
      locationAutocompleteRef.current,
      {
        // No types restriction - allows all place types (addresses, cities, establishments, etc.)
        fields: ['place_id', 'geometry', 'formatted_address', 'address_components'],
      }
    );

    autocompleteInstanceRef.current = autocomplete;

    // Handle place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
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
      }
      if (city) {
        setValue('city', city);
      }
      if (neighbourhood) {
        setValue('neighbourhood', neighbourhood);
      }

      // Also update the autocomplete input with city name or formatted address
      if (locationAutocompleteRef.current) {
        if (city) {
          locationAutocompleteRef.current.value = city;
        } else if (place.formatted_address) {
          locationAutocompleteRef.current.value = place.formatted_address;
        }
      }

      if (state || city || neighbourhood) {
        toast.success('Location information auto-filled successfully!');
      }
    });

    return () => {
      if (autocompleteInstanceRef.current && typeof window !== 'undefined' && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteInstanceRef.current);
      }
    };
  }, [googlePlacesLoaded, setValue]);
  
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
        'FINAL RESULT': shouldShowPremiumOptions ? '✅ WILL SHOW' : '❌ WILL NOT SHOW',
        'Full adLimitStatus': adLimitStatus
      });
      
      // If conditions are met but shouldShowPremiumOptions is false, log why
      if (anyConditionTrue && !shouldShowPremiumOptions) {
        console.error('⚠️ CONDITIONS MET BUT NOT SHOWING!', {
          reason: isLoadingAdLimit ? 'Still loading' : !adLimitStatus ? 'No adLimitStatus' : 'Unknown',
          isLoadingAdLimit,
          hasAdLimitStatus: !!adLimitStatus
        });
      }
    }
  }, [isLoadingAdLimit, adLimitStatus, hasFreeAdsRemaining, hasActiveBusinessPackage, hasAdsRemaining, adsRemaining, shouldShowPremiumOptions]);

  // Debug log
  useEffect(() => {
    if (!isLoadingAdLimit && adLimitStatus) {
      console.log('📦 Business Package Status:', {
        hasActiveBusinessPackage,
        activePackagesCount: adLimitStatus.activePackagesCount,
        adsRemaining: adLimitStatus.adsRemaining,
        hasAdsRemaining,
        totalAdsAllowed: adLimitStatus.totalAdsAllowed,
        adsUsed: adLimitStatus.adsUsed,
        hasFreeAdsRemaining,
        freeAdsRemaining: adLimitStatus.freeAdsRemaining,
        freeAdsLimit: adLimitStatus.freeAdsLimit,
        premiumSlotsAvailable: adLimitStatus.premiumSlotsAvailable, // Deprecated
        packages: adLimitStatus.packages,
        firstPackageType: adLimitStatus.packages?.[0]?.packageType,
        shouldShowPremiumOptions,
        condition1: !hasFreeAdsRemaining,
        condition2: !hasActiveBusinessPackage,
        condition3: (hasActiveBusinessPackage && !hasAdsRemaining)
      });
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
  const getButtonText = () => {
    // Try to get package name from adLimitStatus first, then fallback to businessPackageStatus
    let packageType = adLimitStatus?.packages?.[0]?.packageType;
    
    // Fallback: if adLimitStatus doesn't have packages, try businessPackageStatus
    if (!packageType && businessPackageStatus?.packages && businessPackageStatus.packages.length > 0) {
      packageType = businessPackageStatus.packages[0]?.packageType;
      console.log('🔘 Using fallback package type from businessPackageStatus:', packageType);
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
        console.log('🔘 Button text computed (Premium + Package):', { 
          packageType, 
          packageName, 
          hasActiveBusinessPackage,
          hasPackageFromStatus,
          actuallyHasPackage,
          hasPremiumFeatures,
          packages: adLimitStatus?.packages,
          businessPackages: businessPackageStatus?.packages,
          activePackagesCount: adLimitStatus?.activePackagesCount || businessPackageStatus?.packages?.length
        });
        return `Post Ad (Using ${packageName})`;
      } else {
        return 'Continue to Payment';
      }
    } else {
      // Even for regular ads, show package name if business package is active
      if (actuallyHasPackage) {
        console.log('🔘 Button text computed (Regular + Package):', { 
          packageType, 
          packageName, 
          hasActiveBusinessPackage,
          hasPackageFromStatus,
          actuallyHasPackage,
          hasPremiumFeatures,
          packages: adLimitStatus?.packages,
          businessPackages: businessPackageStatus?.packages,
          activePackagesCount: adLimitStatus?.activePackagesCount || businessPackageStatus?.packages?.length
        });
        return `Post Ad (Using ${packageName})`;
      } else {
        return 'Post Ad (Free)';
      }
    }
  };

  const buttonText = getButtonText();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 12) {
      alert('Maximum 12 images allowed');
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
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

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

        // Auto-populate state, city, neighbourhood from detected location
        if (detectedLocation) {
          // Build location string for autocomplete input
          const locationParts = [];
          if (detectedLocation.city) locationParts.push(detectedLocation.city);
          if (detectedLocation.state) locationParts.push(detectedLocation.state);
          const locationString = locationParts.join(', ');
          
          // Update autocomplete input field
          if (locationAutocompleteRef.current && locationString) {
            locationAutocompleteRef.current.value = locationString;
          }
          
          if (detectedLocation.state) {
            setValue('state', detectedLocation.state);
          }
          if (detectedLocation.city) {
            setValue('city', detectedLocation.city);
          }
          if (detectedLocation.neighbourhood) {
            setValue('neighbourhood', detectedLocation.neighbourhood);
          }
          
          if (detectedLocation.state || detectedLocation.city || detectedLocation.neighbourhood) {
            toast.success('Location information auto-filled successfully!');
          } else {
            toast.success('Location detected but no detailed information available');
          }
        } else {
          toast.error('Location detected but no address details found. Please enter location manually.');
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
          url: error.config?.url
        });
        
        // Handle HTTP status codes
        if (statusCode === 401) {
          toast.error('Please log in to use location detection. You can still enter location manually.', { duration: 5000 });
        } else if (statusCode === 403) {
          toast.error('Access denied. Please check your permissions.', { duration: 5000 });
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
    console.log('🚀 onSubmit called', { 
      hasPremiumFeatures, 
      requiresPayment, 
      requiresPaymentBeforePosting,
      isPaymentVerified,
      selectedPremium, 
      imagesCount: images.length 
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
            
            if (data.attributes && Object.keys(data.attributes).length > 0) {
              formData.append('attributes', JSON.stringify(data.attributes));
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
          setShowPaymentModal(true);
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
    
    // DON'T add premium features to initial submission if business package is active and free ads remain
    // Premium features will be applied after payment is collected (only if user selected them and doesn't have free ads)
    // If business package is active and free ads remain, ignore premium features selection
    if (hasPremiumFeatures && hasActiveBusinessPackage && hasFreeAdsRemaining) {
      // Clear premium features if user has free ads - they should use free ads instead
      console.log('📦 Premium features cleared - user has free ads available');
      setSelectedPremium(null);
    }
    
    // Add attributes if they exist
    if (data.attributes && Object.keys(data.attributes).length > 0) {
      formData.append('attributes', JSON.stringify(data.attributes));
    }

    images.forEach((image) => {
      formData.append('images', image);
    });

    createAd.mutate(formData, {
      onSuccess: (adResponse) => {
        console.log('✅ Ad created successfully:', adResponse);
        const createdAdId = adResponse?.data?.id || adResponse?.id;
        
        // Invalidate and refetch ad limit status
        queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
        queryClient.invalidateQueries({ queryKey: ['business-package', 'status'] });
        
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
                setShowPaymentModal(true);
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

  const handlePaymentSuccess = async (paymentId: string, signature: string, orderIdFromResponse?: string) => {
    console.log('💳 Payment success received:', { paymentId, signature, orderIdFromResponse, paymentOrder });
    
    if (!paymentOrder) {
      console.error('❌ Payment order missing');
      toast.error('Payment order not found. Please try again.');
      return;
    }

    if (!adFormData) {
      console.error('❌ Ad form data missing');
      toast.error('Ad form data not found. Please try again.');
      return;
    }

    // Use orderId from response if available, otherwise use from paymentOrder
    const orderIdToVerify = orderIdFromResponse || paymentOrder.razorpayOrder.id;
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
            title: adFormData.title, 
            imagesCount: adFormData.images?.length || 0,
            paymentOrderId: paymentOrder.razorpayOrder.id 
          });

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
          formData.append('paymentOrderId', paymentOrder.razorpayOrder.id);
          
          // IMPORTANT: Add premium features to formData so backend detects it as premium ad
          // This prevents quota check when payment order exists
          if (selectedPremium) {
            formData.append('premiumType', selectedPremium);
            console.log('⭐ Adding premiumType to formData after payment:', selectedPremium);
          }
          
          // Add attributes if they exist
          if (adFormData.attributes && Object.keys(adFormData.attributes).length > 0) {
            formData.append('attributes', JSON.stringify(adFormData.attributes));
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
            paymentOrderId: paymentOrder.razorpayOrder.id,
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

  return (
    <div className="min-h-screen bg-[#faf9f7]" style={{ margin: 0, padding: 0 }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Post your Ad</h1>
          <p className="text-gray-600 text-lg">Fill in the details to sell your item quickly</p>
        </div>

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
              {/* Section 1: Choose a category */}
              <div 
                ref={(el) => { stepRefs.current[0] = el; }}
                className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose a category</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Main Category</label>
                        <select
                          {...register('categoryId', { required: 'Category is required' })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white"
                          onChange={(e) => {
                            setValue('categoryId', e.target.value);
                            setValue('subcategoryId', ''); // Reset subcategory when category changes
                          }}
                        >
                          <option value="">Select category</option>
                          {categories?.map((cat: any) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        {errors.categoryId && (
                          <div className="text-red-500 text-sm mt-1">{errors.categoryId.message as string}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sub-Category</label>
                        <select
                          {...register('subcategoryId', { required: 'Subcategory is required' })}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-white ${
                            errors.subcategoryId ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={!selectedCategory}
                          onChange={(e) => {
                            setValue('subcategoryId', e.target.value);
                          }}
                        >
                          <option value="">Select sub-category</option>
                          {selectedCategory?.subcategories?.map((sub: any) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </select>
                        {errors.subcategoryId && (
                          <p className="mt-1 text-sm text-red-600">{errors.subcategoryId.message as string}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Include some details */}
              <div 
                ref={(el) => { stepRefs.current[3] = el; }}
                className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Include some details</h2>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">Ad Title</label>
                          <span className="text-xs text-gray-500">{title?.length || 0}/70 characters</span>
                        </div>
                        <input
                          {...register('title', { required: 'Title is required', maxLength: 70 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="e.g. Brand new iPhone 14 Pro Max - 128GB"
                        />
                        {errors.title && (
                          <div className="text-red-500 text-sm mt-1">{errors.title.message as string}</div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          {...register('description', { required: 'Description is required' })}
                          rows={6}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                          placeholder="Describe what you are selling. Include details like brand, condition, features, and reason for selling."
                        />
                        {errors.description && (
                          <div className="text-red-500 text-sm mt-1">{errors.description.message as string}</div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Set a Price</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 font-semibold">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            {...register('price', { required: 'Price is required', min: 0 })}
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="0"
                          />
                        </div>
                        {errors.price && (
                          <div className="text-red-500 text-sm mt-1">{errors.price.message as string}</div>
                        )}
                      </div>

                      {/* Specifications - Show when category and subcategory are selected */}
                      {selectedCategory && selectedSubcategory && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h3>
                          <CategoryAttributes
                            categorySlug={selectedCategory.slug}
                            subcategorySlug={selectedSubcategory.slug}
                            register={register}
                            watch={watch}
                            setValue={setValue}
                            errors={errors}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Upload photos */}
              <div 
                ref={(el) => { stepRefs.current[4] = el; }}
                className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl font-bold">3</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload photos</h2>
                    <p className="text-sm text-gray-600 mb-4">Add up to 12 photos. First photo will be your cover.</p>
                    <div className="grid grid-cols-4 gap-4">
                      <label className="block">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors cursor-pointer bg-gray-50">
                          <div className="flex flex-col items-center">
                            <FiCamera className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600 font-medium">Add Photo</span>
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
                      {previews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          {index === 0 && (
                            <span className="absolute bottom-1 left-1 bg-white text-gray-900 text-xs font-semibold px-2 py-0.5 rounded">
                              MAIN PHOTO
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <FiX className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, 3 - previews.length) }).map((_, index) => (
                        <div key={`placeholder-${index}`} className="border-2 border-gray-200 rounded-lg p-6 flex items-center justify-center bg-gray-50">
                          <div className="text-gray-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                    {images.length === 0 && (
                      <p className="text-red-500 text-sm mt-2">At least one image is required</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 5: Confirm your location */}
              <div 
                ref={(el) => { stepRefs.current[6] = el; }}
                className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl font-bold">5</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirm your location</h2>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">City/Neighborhood</label>
                          <button
                            type="button"
                            onClick={detectLocation}
                            disabled={isDetectingLocation}
                            className="text-sm px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isDetectingLocation ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-700"></div>
                                Detecting...
                              </>
                            ) : (
                              <>
                                <FiNavigation className="w-4 h-4" />
                                Auto Detect
                              </>
                            )}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            ref={locationAutocompleteRef}
                            type="text"
                            {...register('city', { required: 'City is required' })}
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                              errors.city ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Type an address or location..."
                          />
                          <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                        {errors.city && (
                          <p className="mt-1 text-sm text-red-600">{errors.city.message as string}</p>
                        )}
                        {googlePlacesLoaded && (
                          <p className="mt-1 text-xs text-gray-500">
                            Start typing to search for an address. Select from suggestions to auto-fill location fields.
                          </p>
                        )}
                      </div>
                      
                      {/* Additional location fields (auto-filled by autocomplete) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                          <input
                            {...register('state', { required: 'State is required' })}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                              errors.state ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="State"
                          />
                          {errors.state && (
                            <p className="mt-1 text-sm text-red-600">{errors.state.message as string}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Neighborhood (Optional)</label>
                          <input
                            {...register('neighbourhood')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Neighborhood"
                          />
                        </div>
                      </div>
                      
                      {/* Map placeholder */}
                      <div className="mt-4 bg-gray-100 rounded-lg h-64 flex items-center justify-center border border-gray-200">
                        <div className="text-center text-gray-500">
                          <FiMapPin className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">Map View</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Review your details */}
              <div 
                ref={(el) => { stepRefs.current[7] = el; }}
                className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl font-bold">5</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Review your details</h2>
                    {user && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            {user?.avatar ? (
                              <ImageWithFallback
                                src={user.avatar}
                                alt={user?.name || 'User'}
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <FiUser className="w-6 h-6 text-orange-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user?.name || 'User'}</p>
                            <p className="text-sm text-gray-600">{user?.phone || '+1 202 555 0192'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Show my phone number in ads</p>
                              <p className="text-xs text-gray-500">Buyers can contact you directly</p>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 7: Premium Features (Optional) */}
              <div 
                data-premium-section
                className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl font-bold">7</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-xl font-semibold text-gray-900">Premium Features (Optional)</h2>
                      <span className="bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded">NEW</span>
                    </div>
                    
                    {/* Info message when business package is active and free ads remain */}
                    {hasActiveBusinessPackage && hasFreeAdsRemaining && (
                      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <FiInfo className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-800 mb-1">
                              You have {freeAdsRemaining} free ad{freeAdsRemaining !== 1 ? 's' : ''} remaining
                            </p>
                            <p className="text-sm text-green-700">
                              Your ads will be posted using your free ads. Premium features are available but not required. You can post your ad now without any payment.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Hide premium payment options if business package is active and free ads remain */}
                    {hasActiveBusinessPackage && hasFreeAdsRemaining ? (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 text-center">
                          Premium features are disabled because you have free ads available. You can post your ad without any payment.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 mb-4">Enhance your ad visibility with premium features. Payment will be collected after posting.</p>
                    
                        {isLoadingOffers ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                            <span className="ml-3 text-gray-600">Loading premium options...</span>
                          </div>
                        ) : Array.isArray(premiumSettings) && premiumSettings.length > 0 ? (
                          <>
                            <p className="text-sm text-gray-600 mb-3">
                              <strong>Select ONE premium type:</strong> Choose the premium feature that best suits your ad. Each type has different visibility benefits.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {premiumSettings.map((offer: any) => (
                                <button
                                  key={offer.id || offer.type}
                                  type="button"
                                  disabled={hasActiveBusinessPackage && hasFreeAdsRemaining}
                                  onClick={() => {
                                    if (hasActiveBusinessPackage && hasFreeAdsRemaining) return;
                                    // Radio button behavior: always select (don't toggle off)
                                    setSelectedPremium(offer.type);
                                  }}
                                  className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                                    selectedPremium === offer.type
                                      ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                                      : 'border-gray-200 hover:border-gray-300'
                                  } ${hasActiveBusinessPackage && hasFreeAdsRemaining ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  {selectedPremium === offer.type && (
                                    <div className="absolute top-2 right-2">
                                      <FiCheckCircle className="w-6 h-6 text-orange-500" />
                                    </div>
                                  )}
                                  <div className="font-semibold text-gray-900 mb-1">{offer.name || offer.type}</div>
                                  <div className="text-sm text-gray-600 mb-2">{offer.description || 'Enhance your ad visibility'}</div>
                                  <div className="text-lg font-bold text-orange-600">₹{offer.price || 0}</div>
                                  {offer.duration && (
                                    <div className="text-xs text-gray-500 mt-1">Duration: {offer.duration} days</div>
                                  )}
                                </button>
                              ))}
                            </div>
                            {selectedPremium && (
                              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  <strong>Selected:</strong> {premiumSettings.find((o: any) => o.type === selectedPremium)?.name || selectedPremium}
                                  {' - '}
                                  {premiumSettings.find((o: any) => o.type === selectedPremium)?.description || 'Premium feature selected'}
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                  Payment will be collected after you submit the ad form.
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
                            No premium options available at the moment.
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Urgent Badge Option */}
                    <div className="mt-4">
                      <label className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                        hasActiveBusinessPackage && hasFreeAdsRemaining 
                          ? 'opacity-50 cursor-not-allowed border-gray-200' 
                          : 'cursor-pointer hover:bg-gray-50 border-gray-200'
                      }`}>
                        <input
                          type="checkbox"
                          checked={isUrgent}
                          disabled={hasActiveBusinessPackage && hasFreeAdsRemaining}
                          onChange={(e) => {
                            if (hasActiveBusinessPackage && hasFreeAdsRemaining) return;
                            setIsUrgent(e.target.checked);
                          }}
                          className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">Mark as Urgent</div>
                          <div className="text-sm text-gray-600">Get priority placement in search results</div>
                        </div>
                        {Array.isArray(premiumSettings) && premiumSettings.find((o: any) => o.type === 'URGENT') && (
                          <div className="text-lg font-bold text-orange-600">
                            ₹{premiumSettings.find((o: any) => o.type === 'URGENT')?.price || 0}
                          </div>
                        )}
                      </label>
                    </div>
                    
                    {(selectedPremium || isUrgent) && !hasActiveBusinessPackage && !hasFreeAdsRemaining && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> Your ad will be posted first. Payment for premium features will be collected after posting.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                <Link
                  href="/my-ads"
                  className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Discard and Cancel
                </Link>
                <button
                  type="submit"
                  disabled={
                    createAd.isPending || 
                    createPaymentOrder.isPending
                  }
                  className="px-8 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {createAd.isPending || createPaymentOrder.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Post Now
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
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
                          setShowPaymentModal(true);
                          console.log('✅ Payment modal state set to true, should be visible now');
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
        const premiumOffer = premiumSettings?.find((offer: any) => offer.type === selectedPremium);
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
