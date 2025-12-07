'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useCreateAd, useFreeAdsStatus, useCreateAdPostingOrder, useVerifyAdPostingPayment, useAdLimitStatus } from '@/hooks/useAds';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { FiX, FiUpload, FiCreditCard, FiInfo, FiStar, FiTrendingUp, FiRefreshCw, FiAlertCircle, FiZap, FiNavigation, FiBriefcase } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import ImageWithFallback from '@/components/ImageWithFallback';
import InterstitialAd from '@/components/InterstitialAd';
import CategoryAttributes from '@/components/CategoryAttributes';
import AdLimitAlert from '@/components/AdLimitAlert';
import toast from 'react-hot-toast';

// Lazy load PaymentModal (heavy component with Razorpay SDK)
const PaymentModal = dynamic(() => import('@/components/PaymentModal'), {
  loading: () => null,
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
  
  // Check if premium features are selected
  const hasPremiumFeatures = selectedPremium || isUrgent;
  
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
  // Show premium options if:
  // 1. Not loading AND data exists (even if success is false, we still want to show options)
  // 2. AND (no free ads OR no business package OR business package with no ads remaining)
  // IMPORTANT: Show premium options by default if data shows no ads available
  const shouldShowPremiumOptions = !isLoadingAdLimit && 
    adLimitStatus && // Data exists (even if error, we have info)
    (
      (!hasFreeAdsRemaining) || // Show if no free ads remaining
      (!hasActiveBusinessPackage) || // Show if no business package
      (hasActiveBusinessPackage && !hasAdsRemaining) // Show if business package but no ads remaining
    );

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
  // If user has active business package with ads remaining, no payment needed
  // Otherwise, premium features require payment
  const requiresPayment = hasPremiumFeatures && !hasActiveBusinessPackage;

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

  // Show loading during initial mount to prevent hydration mismatch
  if (!mounted || isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

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
    
    // Add premium features if using business package ads (not paid)
    // NEW SYSTEM: Use adsRemaining instead of premiumSlotsAvailable
    if (hasActiveBusinessPackage && hasAdsRemaining && hasPremiumFeatures) {
      if (selectedPremium) {
        formData.append('premiumType', selectedPremium);
        console.log('📦 Adding premiumType to formData:', selectedPremium);
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

          console.log('📤 Submitting ad creation...');
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

      {/* Info Banner */}
      <div className="mb-6 p-4 rounded-lg flex items-center gap-3 bg-blue-50 border border-blue-200">
        <FiInfo className="w-5 h-5 text-blue-600" />
        <div>
          <p className="font-semibold text-blue-800">
            Ad posting is FREE! Only premium features require payment.
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Select premium features below to boost your ad visibility.
          </p>
        </div>
      </div>

      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-6"
      >
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

        {/* Discount is automatically calculated from originalPrice - price */}

        <div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
            <select
              {...register('categoryId', { required: 'Category is required' })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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

        {/* Category Attributes - Show when category and subcategory are selected */}
        {selectedCategory && selectedSubcategory && (
          <CategoryAttributes
            categorySlug={selectedCategory.slug}
            subcategorySlug={selectedSubcategory.slug}
            register={register}
            watch={watch}
            setValue={setValue}
            errors={errors}
          />
        )}


        {/* State, City, Neighbourhood Fields */}
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


        {/* Premium Options - Show if:
            1. User has NO free ads remaining (regardless of business package), OR
            2. User has NO active business package, OR
            3. User has active business package BUT ads remaining = 0 (Business Package Ads Limit Reached)
        */}
        
        {/* Debug: Show why premium options are hidden */}
        {!isLoadingAdLimit && !shouldShowPremiumOptions && adLimitStatus && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
            <p className="text-sm font-bold text-yellow-900 mb-2">
              🔍 Debug: Premium Options Hidden
            </p>
            <div className="text-xs text-yellow-800 space-y-1">
              <p>hasFreeAdsRemaining: <strong>{String(hasFreeAdsRemaining)}</strong></p>
              <p>hasActiveBusinessPackage: <strong>{String(hasActiveBusinessPackage)}</strong></p>
              <p>hasAdsRemaining: <strong>{String(hasAdsRemaining)}</strong></p>
              <p>adsRemaining: <strong>{adsRemaining}</strong></p>
              <p>freeAdsRemaining: <strong>{freeAdsRemaining}</strong></p>
              <p>activePackagesCount: <strong>{adLimitStatus.activePackagesCount}</strong></p>
              <p className="mt-2 font-bold">Check browser console (F12) for detailed logs</p>
            </div>
          </div>
        )}
        
        {/* Hide during loading to prevent flickering */}
        {shouldShowPremiumOptions && (
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-6 space-y-4 border-2 border-primary-200">
          {/* Alert when all free ads and business package ads are exhausted */}
          {!hasFreeAdsRemaining && (!hasActiveBusinessPackage || !hasAdsRemaining) && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-red-900 mb-1">
                    ⚠️ All Ads Exhausted - Premium Payment Required
                  </h4>
                  <p className="text-sm text-red-800 mb-2">
                    You have used all <strong>{adLimitStatus?.freeAdsLimit || 2} free ads</strong>
                    {hasActiveBusinessPackage && (
                      <> and all <strong>{adLimitStatus?.totalAdsAllowed || 0} business package ads</strong></>
                    )}.
                    To post more ads, please <strong className="text-red-900">select premium options below</strong> or purchase a new business package.
                  </p>
                  <p className="text-xs text-red-700 font-medium mt-2">
                    💡 Select a premium feature below to continue posting ads with enhanced visibility.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Alert when only business package ads limit is reached (but free ads might still be available) */}
          {hasActiveBusinessPackage && !hasAdsRemaining && hasFreeAdsRemaining && (
            <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-yellow-900 mb-1">
                    ⚠️ Active Business Package Ads Limit Reached
                  </h4>
                  <p className="text-sm text-yellow-800 mb-2">
                    You have used all <strong>{adLimitStatus?.totalAdsAllowed || 0} ads</strong> from your active business package. 
                    To post more ads, please <strong>select premium options below</strong> or purchase a new business package.
                  </p>
                  <p className="text-xs text-yellow-700 font-medium mt-2">
                    💡 Premium options allow you to post ads with enhanced visibility features.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {!hasFreeAdsRemaining && (!hasActiveBusinessPackage || !hasAdsRemaining) 
                ? 'Premium Options (Required)' 
                : 'Premium Options (Optional)'}
            </h3>
            {premiumSettings && (
              <span className="text-xs bg-primary-100 text-primary-700 px-3 py-1 rounded-full">
                Live Offers
              </span>
            )}
          </div>
          
          {/* Show message when payment is required */}
          {!hasFreeAdsRemaining && (!hasActiveBusinessPackage || !hasAdsRemaining) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                📌 Please select a premium feature below to post your ad. Premium features enhance your ad's visibility and reach.
              </p>
            </div>
          )}
          
          {/* Offer Image */}
          {premiumSettings?.offerImage && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <ImageWithFallback
                src={premiumSettings.offerImage}
                alt="Premium Offers"
                width={600}
                height={200}
                className="w-full h-48 object-cover"
              />
            </div>
          )}
          
          {/* Premium Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Select Premium Feature</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setSelectedPremium(selectedPremium === 'TOP' ? null : 'TOP')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPremium === 'TOP'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-yellow-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FiStar className={`w-5 h-5 ${selectedPremium === 'TOP' ? 'text-yellow-600' : 'text-gray-400'}`} />
                  <span className="font-semibold">TOP Ads</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Get maximum visibility at the top</p>
                <div className="flex items-baseline gap-1">
                  {premiumSettings?.offerPrices?.TOP && premiumSettings.offerPrices.TOP < (premiumSettings?.prices?.TOP || 299) ? (
                    <>
                      <p className="text-lg font-bold text-gray-900">
                        ₹{isLoadingOffers ? '...' : premiumSettings.offerPrices.TOP}
                      </p>
                      <p className="text-xs text-gray-400 line-through">
                        ₹{premiumSettings.prices.TOP}
                      </p>
                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">
                        {Math.round(((premiumSettings.prices.TOP - premiumSettings.offerPrices.TOP) / premiumSettings.prices.TOP) * 100)}% OFF
                      </span>
                    </>
                  ) : (
                    <p className="text-lg font-bold text-gray-900">
                      ₹{isLoadingOffers ? '...' : (premiumSettings?.prices?.TOP || 299)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    / {isLoadingOffers ? '...' : (premiumSettings?.durations?.TOP || 7)} days
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPremium(selectedPremium === 'FEATURED' ? null : 'FEATURED')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPremium === 'FEATURED'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FiTrendingUp className={`w-5 h-5 ${selectedPremium === 'FEATURED' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="font-semibold">Featured</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Highlight your ad in featured section</p>
                <div className="flex items-baseline gap-1">
                  {premiumSettings?.offerPrices?.FEATURED && premiumSettings.offerPrices.FEATURED < (premiumSettings?.prices?.FEATURED || 199) ? (
                    <>
                      <p className="text-lg font-bold text-gray-900">
                        ₹{isLoadingOffers ? '...' : premiumSettings.offerPrices.FEATURED}
                      </p>
                      <p className="text-xs text-gray-400 line-through">
                        ₹{premiumSettings.prices.FEATURED}
                      </p>
                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">
                        {Math.round(((premiumSettings.prices.FEATURED - premiumSettings.offerPrices.FEATURED) / premiumSettings.prices.FEATURED) * 100)}% OFF
                      </span>
                    </>
                  ) : (
                    <p className="text-lg font-bold text-gray-900">
                      ₹{isLoadingOffers ? '...' : (premiumSettings?.prices?.FEATURED || 199)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    / {isLoadingOffers ? '...' : (premiumSettings?.durations?.FEATURED || 14)} days
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPremium(selectedPremium === 'BUMP_UP' ? null : 'BUMP_UP')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPremium === 'BUMP_UP'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FiRefreshCw className={`w-5 h-5 ${selectedPremium === 'BUMP_UP' ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="font-semibold">Bump Up</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Refresh your ad to the top</p>
                <div className="flex items-baseline gap-1">
                  {premiumSettings?.offerPrices?.BUMP_UP && premiumSettings.offerPrices.BUMP_UP < (premiumSettings?.prices?.BUMP_UP || 99) ? (
                    <>
                      <p className="text-lg font-bold text-gray-900">
                        ₹{isLoadingOffers ? '...' : premiumSettings.offerPrices.BUMP_UP}
                      </p>
                      <p className="text-xs text-gray-400 line-through">
                        ₹{premiumSettings.prices.BUMP_UP}
                      </p>
                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">
                        {Math.round(((premiumSettings.prices.BUMP_UP - premiumSettings.offerPrices.BUMP_UP) / premiumSettings.prices.BUMP_UP) * 100)}% OFF
                      </span>
                    </>
                  ) : (
                    <p className="text-lg font-bold text-gray-900">
                      ₹{isLoadingOffers ? '...' : (premiumSettings?.prices?.BUMP_UP || 99)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    / {isLoadingOffers ? '...' : (premiumSettings?.durations?.BUMP_UP || 1)} day
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Urgent Badge */}
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="urgent-badge"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
            />
            <label htmlFor="urgent-badge" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <FiAlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold">Mark as Urgent</span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                <div className="flex items-center gap-2">
                  <span>
                    Add urgent badge to your ad for{' '}
                    {premiumSettings?.offerPrices?.URGENT && premiumSettings.offerPrices.URGENT < (premiumSettings?.prices?.URGENT || 49) ? (
                      <>
                        <span className="font-bold text-red-600">₹{premiumSettings.offerPrices.URGENT}</span>
                        <span className="text-gray-400 line-through text-sm ml-1">₹{premiumSettings.prices.URGENT}</span>
                        <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">
                          {Math.round(((premiumSettings.prices.URGENT - premiumSettings.offerPrices.URGENT) / premiumSettings.prices.URGENT) * 100)}% OFF
                        </span>
                      </>
                    ) : (
                      <span className="font-bold text-red-600">₹{premiumSettings?.prices?.URGENT || 49}</span>
                    )}
                    {' '}({premiumSettings?.durations?.URGENT || 7} days)
                  </span>
                </div>
              </div>
            </label>
          </div>

          {/* Total Calculation */}
          {(selectedPremium || isUrgent) && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Total Premium Cost:</span>
                <span className="text-2xl font-bold text-primary-600">
                  ₹{(() => {
                    let total = 0;
                    // Use offer prices if available
                    if (selectedPremium === 'TOP') {
                      const price = premiumSettings?.offerPrices?.TOP && premiumSettings.offerPrices.TOP < (premiumSettings?.prices?.TOP || 299)
                        ? premiumSettings.offerPrices.TOP
                        : (premiumSettings?.prices?.TOP || 299);
                      total += price;
                    }
                    if (selectedPremium === 'FEATURED') {
                      const price = premiumSettings?.offerPrices?.FEATURED && premiumSettings.offerPrices.FEATURED < (premiumSettings?.prices?.FEATURED || 199)
                        ? premiumSettings.offerPrices.FEATURED
                        : (premiumSettings?.prices?.FEATURED || 199);
                      total += price;
                    }
                    if (selectedPremium === 'BUMP_UP') {
                      const price = premiumSettings?.offerPrices?.BUMP_UP && premiumSettings.offerPrices.BUMP_UP < (premiumSettings?.prices?.BUMP_UP || 99)
                        ? premiumSettings.offerPrices.BUMP_UP
                        : (premiumSettings?.prices?.BUMP_UP || 99);
                      total += price;
                    }
                    if (isUrgent) {
                      const price = premiumSettings?.offerPrices?.URGENT && premiumSettings.offerPrices.URGENT < (premiumSettings?.prices?.URGENT || 49)
                        ? premiumSettings.offerPrices.URGENT
                        : (premiumSettings?.prices?.URGENT || 49);
                      total += price;
                    }
                    return total;
                  })()}
                </span>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Business Package Ads - Show if user has active package AND ads remaining > 0 */}
        {!isLoadingAdLimit && hasActiveBusinessPackage && hasAdsRemaining && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 space-y-4 border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiBriefcase className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold">Business Package Ads Available</h3>
            </div>
            {hasAdsRemaining && (
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                {adsRemaining} Available
              </span>
            )}
          </div>

          {hasAdsRemaining ? (
            <>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-1">
                    You have <span className="font-bold text-green-600">{adsRemaining}</span> ad{adsRemaining > 1 ? 's' : ''} remaining from your business package.
                  </p>
                  <p className="text-xs text-green-700">
                    You can post ads using your business package (no payment required). Premium features are included.
                  </p>
                </div>

                {/* Premium Type Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-3">Select Premium Feature</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedPremium(selectedPremium === 'TOP' ? null : 'TOP')}
                      disabled={!hasAdsRemaining}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPremium === 'TOP'
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-gray-200 hover:border-yellow-300'
                      } ${!hasAdsRemaining ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FiStar className={`w-5 h-5 ${selectedPremium === 'TOP' ? 'text-yellow-600' : 'text-gray-400'}`} />
                        <span className="font-semibold">TOP Ads</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Get maximum visibility at the top</p>
                      <p className="text-xs text-green-600 font-semibold">Free with your package</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPremium(selectedPremium === 'FEATURED' ? null : 'FEATURED')}
                      disabled={!hasAdsRemaining}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPremium === 'FEATURED'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      } ${!hasAdsRemaining ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FiTrendingUp className={`w-5 h-5 ${selectedPremium === 'FEATURED' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="font-semibold">Featured</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Highlight your ad in featured section</p>
                      <p className="text-xs text-green-600 font-semibold">Free with your package</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPremium(selectedPremium === 'BUMP_UP' ? null : 'BUMP_UP')}
                      disabled={!hasAdsRemaining}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPremium === 'BUMP_UP'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      } ${!hasAdsRemaining ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FiRefreshCw className={`w-5 h-5 ${selectedPremium === 'BUMP_UP' ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="font-semibold">Bump Up</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Refresh your ad to the top</p>
                      <p className="text-xs text-green-600 font-semibold">Free with your package</p>
                    </button>
                  </div>
                </div>

                {/* Urgent Badge */}
                <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="urgent-badge-package"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    disabled={!hasPremiumSlotsAvailable}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="urgent-badge-package" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <FiAlertCircle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold">Mark as Urgent</span>
                      <span className="text-xs text-green-600 font-semibold ml-2">(Free with your package)</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Add urgent badge to your ad</p>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-yellow-800 font-medium mb-1">No Business Package Ads Left</p>
                  <p className="text-yellow-700 text-sm">
                    You have used all ads from your business package. Please use premium options to post this ad, or purchase a new business package.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Business Package Ad Deduction Notice - Show when posting with business package */}
        {!isLoadingAdLimit && hasActiveBusinessPackage && hasAdsRemaining && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-lg p-5 flex items-start gap-4 shadow-sm">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <FiBriefcase className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg text-blue-900 mb-2">
                Ad – 1 ad will be deducted from your business package
              </p>
              <p className="text-sm text-blue-700 font-medium">
                ({adsRemaining - 1} ad{adsRemaining - 1 !== 1 ? 's' : ''} will remain after posting)
              </p>
              <p className="text-xs text-blue-600 mt-2 italic">
                No payment required – using your business package ads
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Images (Max 12) *</label>
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

        <button
          type="submit"
          disabled={
            createAd.isPending || 
            createPaymentOrder.isPending
          }
          onClick={(e) => {
            console.log('🔘 Button clicked', { 
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
              
              <div className="space-y-3">
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
                    
                    setShowPaymentRequiredModal(false);
                    console.log('💰 Creating payment order with data:', adFormData);
                    
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
                          setPaymentOrder(response);
                          setShowPaymentModal(true);
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
                  Pay to Post this Ad {selectedPremium || isUrgent ? '(with Premium Features)' : ''}
                </button>
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
