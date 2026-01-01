'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useCreateAd, useFreeAdsStatus, useCreateAdPostingOrder, useVerifyAdPostingPayment, useAdLimitStatus } from '@/hooks/useAds';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { getSocket } from '@/lib/socket';
import { FiX, FiUpload, FiCreditCard, FiInfo, FiStar, FiTrendingUp, FiRefreshCw, FiAlertCircle, FiZap, FiNavigation, FiBriefcase, FiFlag, FiCheckCircle, FiPackage } from 'react-icons/fi';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ImageWithFallback from '@/components/ImageWithFallback';
import InterstitialAd from '@/components/InterstitialAd';
import CategoryAttributes from '@/components/CategoryAttributes';
import AdLimitAlert from '@/components/AdLimitAlert';
import toast from 'react-hot-toast';

// Lazy load PaymentModal (heavy component with Razorpay SDK)
// Using same pattern as other components (AdLimitAlert, PremiumFeatureButton)
const PaymentModal = dynamic(() => import('@/components/PaymentModal'), {
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
});

export default function PostAdPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm();
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
  
  // Enhanced error handling for payment order creation
  useEffect(() => {
    if (createPaymentOrder.isError) {
      console.error('❌ Payment order creation error:', createPaymentOrder.error);
    }
  }, [createPaymentOrder.isError, createPaymentOrder.error]);
  const verifyPayment = useVerifyAdPostingPayment();
  
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [adFormData, setAdFormData] = useState<any>(null);
  const [selectedPremium, setSelectedPremium] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [showAfterActionAd, setShowAfterActionAd] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showPaymentRequiredModal, setShowPaymentRequiredModal] = useState(false);
  const [paymentRequiredError, setPaymentRequiredError] = useState<any>(null);
  const [isAdLimitAlertDismissed, setIsAdLimitAlertDismissed] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  
  // Step-by-step wizard state - strict order enforcement
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = 8; // Category, Subcategory, Brand, Specs, Title/Description, Image, Price, Location
  
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

  // Get premium offers (public endpoint for users)
  const { data: premiumSettings, isLoading: isLoadingOffers } = useQuery({
    queryKey: ['premium-offers'],
    queryFn: async () => {
      const response = await api.get('/premium/offers');
      return response.data.offers;
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

  const selectedCategoryId = watch('categoryId');
  const selectedSubcategoryId = watch('subcategoryId');
  const selectedCategory = categories?.find((c: any) => c.id === selectedCategoryId);
  const selectedSubcategory = selectedCategory?.subcategories?.find((s: any) => s.id === selectedSubcategoryId);
  const attributes = watch('attributes');
  
  // Step validation functions
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Category
        return !!selectedCategoryId;
      case 2: // Subcategory
        return !!selectedSubcategoryId;
      case 3: // Brand (from attributes.brand if exists)
        // Brand is optional in some categories, so check if category requires it
        if (!selectedCategory || !selectedSubcategory) return false;
        // For now, allow step 3 if subcategory is selected (brand might be optional)
        return true;
      case 4: // Specs (other attributes)
        // Specs are optional, allow moving forward
        return true;
      case 5: // Title/Description
        const title = watch('title');
        const description = watch('description');
        return !!(title && description);
      case 6: // Image
        return images.length > 0;
      case 7: // Price
        const price = watch('price');
        return !!(price && parseFloat(price) >= 0);
      case 8: // Location
        const state = watch('state');
        const city = watch('city');
        return !!(state && city);
      default:
        return false;
    }
  };
  
  // Navigate to next step
  const goToNextStep = () => {
    if (validateStep(currentStep) && currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error('Please complete all required fields before proceeding');
    }
  };
  
  // Navigate to previous step
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
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

  // Check if payment is required
  // Premium features ALWAYS require payment (even with business package)
  // OR if no quota remaining (free + business), payment is required
  const requiresPayment = hasPremiumFeatures || (!hasFreeAdsRemaining && (!hasActiveBusinessPackage || !hasAdsRemaining));

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
      toast.error('Geolocation is not supported by your browser');
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
      const response = await api.post('/geocoding/detect-location', {
        latitude,
        longitude,
      });

      if (response.data.success) {
        const { detectedLocation } = response.data;

        // Auto-populate state, city, neighbourhood from detected location
        if (detectedLocation) {
          if (detectedLocation.state) {
            setValue('state', detectedLocation.state);
            toast.success(`State detected: ${detectedLocation.state}`);
          }
          if (detectedLocation.city) {
            setValue('city', detectedLocation.city);
            toast.success(`City detected: ${detectedLocation.city}`);
          }
          if (detectedLocation.neighbourhood) {
            setValue('neighbourhood', detectedLocation.neighbourhood);
            toast.success(`Neighbourhood detected: ${detectedLocation.neighbourhood}`);
          }
          
          if (detectedLocation.state || detectedLocation.city || detectedLocation.neighbourhood) {
            toast.success('Location information auto-filled successfully!');
          } else {
            toast.success('Location detected but no detailed information available');
          }
        }
      } else {
        toast.error('Failed to detect location');
      }
    } catch (error: any) {
      console.error('Location detection error:', error);
      
      if (error.code === 'PERMISSION_DENIED') {
        toast.error('Location access denied. Please enable location permissions.');
      } else if (error.code === 'POSITION_UNAVAILABLE') {
        toast.error('Location information unavailable');
      } else if (error.code === 'TIMEOUT') {
        toast.error('Location request timed out');
      } else {
        toast.error(error.response?.data?.message || 'Failed to detect location');
      }
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const generateDescription = async () => {
    const title = watch('title');
    const price = watch('price');
    const condition = watch('condition');
    const categoryId = watch('categoryId');
    const subcategoryId = watch('subcategoryId');

    if (!title) {
      toast.error('Please enter a title first');
      return;
    }

    setIsGeneratingDescription(true);
    try {
      // Get category names
      const category = categories?.find((cat: any) => cat.id === categoryId);
      const subcategory = category?.subcategories?.find((sub: any) => sub.id === subcategoryId);

      const response = await api.post('/ai/generate-description', {
        title,
        price: price || undefined,
        condition: condition || undefined,
        category: category?.name || undefined,
        subcategory: subcategory?.name || undefined,
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
      selectedPremium, 
      isUrgent,
      imagesCount: images.length 
    });

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
                setShowAfterActionAd(true);
                setTimeout(() => {
                  console.log('🔄 Redirecting to /my-ads');
                  router.push('/my-ads');
                }, 3000);
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
    
    // Add premium features if selected
    // If user has business package with ads remaining, premium features are included for free
    // If user has no quota, premium features require payment (backend will detect and require paymentOrderId)
    if (hasPremiumFeatures) {
      if (selectedPremium) {
        formData.append('premiumType', selectedPremium);
        console.log('📦 Adding premiumType to formData:', selectedPremium, {
          hasActiveBusinessPackage,
          hasAdsRemaining,
          willRequirePayment: !hasActiveBusinessPackage || !hasAdsRemaining
        });
      }
      if (isUrgent) {
        formData.append('isUrgent', String(isUrgent));
        console.log('📦 Adding isUrgent to formData:', isUrgent);
      }
    }
    
    // Add attributes if they exist
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
        // Invalidate and refetch ad limit status to refresh ads remaining count immediately
        console.log('🔄 Invalidating queries to refresh ads count...');
        queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
        queryClient.invalidateQueries({ queryKey: ['business-package', 'status'] });
        // Force immediate refetch to update UI with new ads count (after backend updates)
        // Use multiple refetches with increasing delays to ensure backend has updated
        setTimeout(() => {
          console.log('🔄 Refetching queries to update ads remaining count (attempt 1)...');
          queryClient.refetchQueries({ queryKey: ['ad-limit-status'] }).then(() => {
            console.log('✅ Refetched ad-limit-status (attempt 1)');
          });
          queryClient.refetchQueries({ queryKey: ['business-package', 'status'] }).then((result) => {
            console.log('✅ Refetched business-package status (attempt 1):', result);
          });
        }, 500); // First refetch after 500ms
        
        setTimeout(() => {
          console.log('🔄 Refetching queries to update ads remaining count (attempt 2)...');
          queryClient.refetchQueries({ queryKey: ['ad-limit-status'] }).then(() => {
            console.log('✅ Refetched ad-limit-status (attempt 2)');
          });
          queryClient.refetchQueries({ queryKey: ['business-package', 'status'] }).then((result) => {
            console.log('✅ Refetched business-package status (attempt 2):', result);
          });
        }, 1500); // Second refetch after 1500ms to ensure backend has processed
        setShowAfterActionAd(true);
        // Redirect after interstitial ad is shown (or after delay if ad doesn't show)
        // Use a longer timeout to allow interstitial ad to display
        setTimeout(() => {
          console.log('🔄 Redirecting to /my-ads');
          router.push('/my-ads');
        }, 3000);
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
          if (isUrgent) {
            formData.append('isUrgent', String(isUrgent));
            console.log('⭐ Adding isUrgent to formData after payment:', isUrgent);
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

  // Show loading during initial mount to prevent hydration mismatch
  if (!mounted || isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Post a New Ad</h1>

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

      {/* OLX-Like Quota Information Banner */}
      {!isLoadingAdLimit && adLimitStatus && (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FREE ADS Box - OLX Style */}
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

            {/* BUSINESS PACKAGE Box - OLX Style */}
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

          {/* Total Ads Available */}
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
        </div>
      )}

      {/* Payment Options Hidden Banner - OLX Style */}
      {!isLoadingAdLimit && shouldHidePaymentOptions && adLimitStatus && (
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

      {/* Step Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step < currentStep ? '✓' : step}
                </div>
                <div className={`text-xs mt-2 text-center ${step === currentStep ? 'font-bold text-blue-600' : step < currentStep ? 'text-green-600' : 'text-gray-500'}`}>
                  {step === 1 && 'Category'}
                  {step === 2 && 'Subcategory'}
                  {step === 3 && 'Brand'}
                  {step === 4 && 'Specs'}
                  {step === 5 && 'Title/Desc'}
                  {step === 6 && 'Image'}
                  {step === 7 && 'Price'}
                  {step === 8 && 'Location'}
                </div>
              </div>
              {step < 8 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-gray-600 mt-2">
          Step {currentStep} of {TOTAL_STEPS}
        </div>
      </div>

      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-6"
      >
        {/* Step 1: Category */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg p-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold mb-4">Step 1: Select Category</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <select
                {...register('categoryId', { required: 'Category is required' })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                onChange={(e) => {
                  setValue('categoryId', e.target.value);
                  // Auto-advance to next step if valid
                  setTimeout(() => {
                    if (e.target.value) {
                      goToNextStep();
                    }
                  }, 100);
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
                <div className="text-red-500 text-sm mt-1">{errors.categoryId.message as string}</div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Subcategory */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg p-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold mb-4">Step 2: Select Subcategory</h2>
            <div>
              <label className="block text-sm font-medium mb-2">
                Subcategory <span className="text-red-500">*</span>
              </label>
              <select
                {...register('subcategoryId', { required: 'Subcategory is required' })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.subcategoryId ? 'border-red-500' : ''
                }`}
                disabled={!selectedCategory}
                onChange={(e) => {
                  setValue('subcategoryId', e.target.value);
                  // Auto-advance to next step if valid
                  setTimeout(() => {
                    if (e.target.value) {
                      goToNextStep();
                    }
                  }, 100);
                }}
              >
                <option value="">Select Subcategory</option>
                {selectedCategory?.subcategories?.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
              {errors.subcategoryId && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.subcategoryId.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Brand */}
        {currentStep === 3 && selectedCategory && selectedSubcategory && (
          <div className="bg-white rounded-lg p-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold mb-4">Step 3: Enter Brand</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  {...register('attributes.brand')}
                  placeholder="e.g., Samsung, Apple, Sony, Maruti, Hero"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the brand/make name of your product
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Specs - CategoryAttributes (all attributes except brand handled here) */}
        {currentStep === 4 && selectedCategory && selectedSubcategory && (
          <div className="bg-white rounded-lg p-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold mb-4">Step 4: Product Specifications</h2>
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

        {/* Step 5: Title/Description */}
        {currentStep === 5 && (
          <div className="bg-white rounded-lg p-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold mb-4">Step 5: Title & Description</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            {...register('title', { required: 'Title is required' })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter ad title"
          />
          {errors.title && (
            <div className="text-red-500 text-sm mt-1">{errors.title.message as string}</div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Description *</label>
            <button
              type="button"
              onClick={generateDescription}
              disabled={isGeneratingDescription || !watch('title')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiZap className={`w-4 h-4 ${isGeneratingDescription ? 'animate-spin' : ''}`} />
              {isGeneratingDescription ? 'Generating...' : 'Auto Generate'}
            </button>
          </div>
          <textarea
            {...register('description', { required: 'Description is required' })}
            rows={6}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Describe your item in detail or click 'Auto Generate' to create one automatically"
          />
          {errors.description && (
            <div className="text-red-500 text-sm mt-1">{errors.description.message as string}</div>
          )}
        </div>
          </div>
        )}

        {/* Step 6: Images */}
        {currentStep === 6 && (
          <div className="bg-white rounded-lg p-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold mb-4">Step 6: Upload Images</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Images (Max 12) *</label>
              <p className="text-sm text-gray-600 mb-4">
                Images will be automatically renamed and alt text generated based on category before saving.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {previews.length < 12 && (
                  <label className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-primary-500">
                    <FiUpload className="w-6 h-6 text-gray-400" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {images.length === 0 && (
                <p className="text-red-500 text-sm">At least one image is required</p>
              )}
            </div>
          </div>
        )}

        {/* Step 7: Price */}
        {currentStep === 7 && (
          <div className="bg-white rounded-lg p-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold mb-4">Step 7: Set Price</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price', { required: 'Price is required', min: 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                />
                {errors.price && (
                  <div className="text-red-500 text-sm mt-1">{errors.price.message as string}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Original Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('originalPrice', { min: 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Original price (optional)"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty if no discount</p>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Condition</label>
              <select
                {...register('condition')}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Condition</option>
                <option value="NEW">New</option>
                <option value="LIKE_NEW">Like New</option>
                <option value="USED">Used</option>
                <option value="REFURBISHED">Refurbished</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 8: Location */}
        {currentStep === 8 && (
          <div className="bg-white rounded-lg p-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold mb-4">Step 8: Set Location</h2>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Location Information</label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isDetectingLocation ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
                      Detecting...
                    </>
                  ) : (
                    <>
                      <FiNavigation className="w-3 h-3" />
                      Auto Detect Location
                    </>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('state', { required: 'State is required' })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.state ? 'border-red-500' : ''
                    }`}
                    placeholder="State (use Auto Detect)"
                  />
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.state.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('city', { required: 'City is required' })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.city ? 'border-red-500' : ''
                    }`}
                    placeholder="City (use Auto Detect)"
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.city.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Neighbourhood</label>
                  <input
                    {...register('neighbourhood')}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Neighbourhood (optional)"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Buttons */}
        {currentStep < TOTAL_STEPS && (
          <div className="flex justify-between gap-4 mt-6">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goToNextStep}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Submit Button - Only show on final step (Step 8) */}
        {currentStep === TOTAL_STEPS && (
          <div className="mt-6">
            <div className="flex justify-between gap-4 mb-4">
              <button
                type="button"
                onClick={goToPreviousStep}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Previous
              </button>
            </div>
            <button
              type="submit"
              disabled={
                createAd.isPending || 
                createPaymentOrder.isPending
              }
              onClick={(e) => {
                console.log('🔘 Submit button clicked on final step', { 
                  disabled: createAd.isPending || createPaymentOrder.isPending || (adLimitStatus?.hasLimit && !adLimitStatus?.canPost),
                  hasPremiumFeatures,
                  requiresPayment
                });
              }}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createAd.isPending || createPaymentOrder.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  {hasPremiumFeatures && !hasActiveBusinessPackage && <FiCreditCard className="w-5 h-5" />}
                  {hasPremiumFeatures && hasActiveBusinessPackage && <FiBriefcase className="w-5 h-5" />}
                  {buttonText}
                </>
              )}
            </button>
          </div>
        )}

      {/* Legacy single-step form preserved in git history */}
      </form>

      {/* Interstitial Ad - After Action */}
      {showAfterActionAd && (
        <InterstitialAd
          position="after_action"
          trigger={showAfterActionAd}
          onClose={() => {
            setShowAfterActionAd(false);
            // Redirect immediately when interstitial ad is closed
            console.log('🔄 Interstitial ad closed, redirecting to /my-ads');
            router.push('/my-ads');
          }}
        />
      )}

      {/* Payment Required Modal - Free Ads Limit Reached */}
      {showPaymentRequiredModal && paymentRequiredError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Payment Required</h2>
              <button
                onClick={() => {
                  setShowPaymentRequiredModal(false);
                  setPaymentRequiredError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-800 font-medium mb-1">Free Ads Limit Reached</p>
                    <p className="text-yellow-700 text-sm">
                      You have used {paymentRequiredError.freeAdsUsed || 0} of {paymentRequiredError.freeAdsLimit || 2} free ads.
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">
                {paymentRequiredError.message || 'Please purchase a Business Package or Premium Options to continue posting ads.'}
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 font-medium">
                  💡 <strong>Quick Option:</strong> Select a premium feature below and click "Post Ad" to continue with payment.
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowPaymentRequiredModal(false);
                    // Scroll to premium section
                    setTimeout(() => {
                      const premiumSection = document.querySelector('[data-premium-section]');
                      if (premiumSection) {
                        premiumSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        // Highlight the section
                        premiumSection.classList.add('ring-4', 'ring-yellow-400');
                        setTimeout(() => {
                          premiumSection.classList.remove('ring-4', 'ring-yellow-400');
                        }, 3000);
                      }
                    }, 100);
                  }}
                  className="w-full bg-yellow-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 flex items-center justify-center gap-2 transition-colors"
                >
                  <FiStar className="w-5 h-5" />
                  Select Premium Features
                </button>
                
                <button
                  onClick={() => {
                    setShowPaymentRequiredModal(false);
                    router.push('/business-package');
                  }}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <FiBriefcase className="w-5 h-5" />
                  Purchase Business Package
                </button>
                
                <button
                  onClick={async () => {
                    if (!adFormData) {
                      toast.error('Form data is missing. Please try submitting the form again.');
                      setShowPaymentRequiredModal(false);
                      return;
                    }
                    
                    // Check if premium feature is selected
                    if (!selectedPremium && !isUrgent) {
                      toast.error('Please select a premium feature below to continue posting.', { duration: 5000 });
                      setShowPaymentRequiredModal(false);
                      // Scroll to premium options section
                      setTimeout(() => {
                        const premiumSection = document.querySelector('[data-premium-section]');
                        if (premiumSection) {
                          premiumSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          // Highlight the section
                          premiumSection.classList.add('ring-4', 'ring-yellow-400');
                          setTimeout(() => {
                            premiumSection.classList.remove('ring-4', 'ring-yellow-400');
                          }, 3000);
                        }
                      }, 100);
                      return;
                    }
                    
                    setShowPaymentRequiredModal(false);
                    console.log('💰 Creating payment order with data:', adFormData);
                    console.log('💰 Premium features selected:', { selectedPremium, isUrgent });
                    
                    // Create payment order for ad posting (with optional premium features)
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
                                setShowAfterActionAd(true);
                                setTimeout(() => {
                                  router.push('/my-ads');
                                }, 3000);
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
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <FiCreditCard className="w-5 h-5" />
                  {selectedPremium || isUrgent ? 'Pay to Post this Ad (with Premium Features)' : 'Select Premium Features First'}
                </button>
                {!selectedPremium && !isUrgent && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    ⚠️ Please select a premium feature above before clicking this button
                  </p>
                )}
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowPaymentRequiredModal(false);
                setPaymentRequiredError(null);
              }}
              className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentOrder && paymentOrder.razorpayOrder && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={
            // Use amount from razorpayOrder (already in paise from Razorpay) converted to INR
            // This ensures exact match with the order amount
            paymentOrder.razorpayOrder?.amount 
              ? paymentOrder.razorpayOrder.amount / 100 
              : (paymentOrder.amount || 49)
          }
          orderId={paymentOrder.razorpayOrder.id}
          razorpayKey={paymentOrder.razorpayOrder.key}
          razorpayOrderAmount={paymentOrder.razorpayOrder.amount} // Pass exact amount in paise from order
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          description="Complete payment to post your ad"
        />
      )}
    </div>
  );
}
