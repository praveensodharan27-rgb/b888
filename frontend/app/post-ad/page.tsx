'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useCreateAd, useFreeAdsStatus, useCreateAdPostingOrder, useVerifyAdPostingPayment, useAdLimitStatus } from '@/hooks/useAds';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { getSocket } from '@/lib/socket';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';
import PlaceAutocompleteInputFirefox from '@/components/PlaceAutocompleteInputFirefox';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import CreatableSelect from 'react-select/creatable';
import { FiX, FiUpload, FiCreditCard, FiInfo, FiStar, FiTrendingUp, FiRefreshCw, FiAlertCircle, FiZap, FiNavigation, FiBriefcase, FiFlag, FiCheckCircle, FiPackage, FiUser, FiCamera, FiMapPin, FiSearch, FiMap, FiHome, FiFileText, FiDollarSign, FiImage, FiShield, FiLayers, FiChevronDown } from 'react-icons/fi';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ImageWithFallback from '@/components/ImageWithFallback';
import ProductSpecifications from '@/components/ProductSpecifications';
import DynamicSpecifications from '@/components/DynamicSpecifications';
import AdLimitAlert from '@/components/AdLimitAlert';
import UpgradePopup from '@/components/UpgradePopup';
import CategorySkeleton from '@/components/CategorySkeleton';
import logger from '@/utils/logger';
import toast from '@/lib/toast';
interface Category {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  categoryId?: string | null; // Main categories have null, subcategories have parent ID
  category_id?: string | null; // Alternative field name
  subcategories?: Subcategory[];
  _count?: { ads: number };
}

interface Subcategory {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  categoryId?: string;
  _count?: { ads: number };
}

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
  type AdFormValues = {
    locationId?: string;
    state?: string;
    city?: string;
    neighbourhood?: string;
    categoryId?: string;
    subcategoryId?: string;
    attributes?: Record<string, any>;
    title?: string;
    description?: string;
    price?: number;
    condition?: string;
  };
  const { register, handleSubmit, formState: { errors }, watch, setValue, clearErrors, trigger } = useForm<AdFormValues>({
    defaultValues: {
      locationId: '',
      state: '',
      city: '',
      neighbourhood: ''
    }
  });
  
  // 2. ALL useState hooks - must be called unconditionally and in same order
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [adFormData, setAdFormData] = useState<any>(null);
  const [selectedPremium, setSelectedPremium] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isImprovingDescription, setIsImprovingDescription] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showPaymentRequiredModal, setShowPaymentRequiredModal] = useState(false);
  const [paymentRequiredError, setPaymentRequiredError] = useState<any>(null);
  const [isAdLimitAlertDismissed, setIsAdLimitAlertDismissed] = useState(false);
  const [upgradePopupDismissed, setUpgradePopupDismissed] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isPaymentVerified, setIsPaymentVerified] = useState(false); // Track if payment is verified
  const [showPhoneInAds, setShowPhoneInAds] = useState(true);
  const [isImageAiLoading, setIsImageAiLoading] = useState(false);
  const [aiFilledFields, setAiFilledFields] = useState<string[]>([]);
  const [aiPriceSuggestion, setAiPriceSuggestion] = useState<{
    suggested?: number | null;
    min?: number | null;
    max?: number | null;
    source?: 'db' | 'ai';
  } | null>(null);
  const [autoLocationMessage, setAutoLocationMessage] = useState<string | null>(null);
  const locationInitializedRef = useRef(false);
  // Use shared Google Places hook (reuses script from home page)
  const { googlePlacesLoaded } = useGooglePlaces();
  const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
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

  // Helper: generate lightweight SEO-friendly description based on category + basic fields
  const generateSeoDescriptionTemplate = useCallback(
    (opts: {
      title?: string | null;
      categoryName?: string | null;
      categorySlug?: string | null;
      brand?: string | null;
      model?: string | null;
      condition?: string | null;
      city?: string | null;
      state?: string | null;
    }): string | null => {
      const {
        title,
        categoryName,
        categorySlug,
        brand,
        model,
        condition,
        city,
        state,
      } = opts;

      const clean = (v?: string | null) => (v || '').toString().trim();
      const t = clean(title);
      const catName = clean(categoryName);
      const slug = clean(categorySlug).toLowerCase();
      const b = clean(brand);
      const m = clean(model);
      const c = clean(condition);
      const cityClean = clean(city);
      const stateClean = clean(state);

      if (!t && !b && !m) return null;

      const locationPart =
        cityClean && stateClean
          ? `${cityClean}, ${stateClean}`
          : cityClean || stateClean || '';

      const namePart = t || [b, m].filter(Boolean).join(' ');
      const condPart = c || 'good condition';

      const baseCategory = (() => {
        if (slug.includes('vehicle') || slug.includes('car') || slug.includes('bike')) return 'vehicles';
        if (slug.includes('mobile') || slug.includes('phone')) return 'mobiles';
        if (slug.includes('electronic') || slug.includes('laptop') || slug.includes('tv')) return 'electronics';
        if (slug.includes('furniture') || slug.includes('sofa') || slug.includes('table')) return 'furniture';
        if (slug.includes('fashion') || slug.includes('clothing') || slug.includes('shoe')) return 'fashion';
        if (slug.includes('property') || slug.includes('real-estate') || slug.includes('apartment')) return 'properties';
        if (slug.includes('job') || slug.includes('career')) return 'jobs';
        if (slug.includes('service')) return 'services';
        return 'general';
      })();

      const fullCategoryLabel = catName || baseCategory;

      const locSentence = locationPart
        ? ` in ${locationPart}`
        : '';

      let paragraph: string;
      switch (baseCategory) {
        case 'vehicles':
          paragraph = `${namePart} is available for sale${locSentence}. The vehicle is ${condPart} and well maintained. It belongs to the ${fullCategoryLabel} category and offers reliable performance for daily use and long drives. Interested buyers can contact for more details.`;
          break;
        case 'mobiles':
          paragraph = `${namePart} is available for sale${locSentence}. The phone is in ${condPart} and works perfectly. It is ideal for users looking for a high-performance smartphone with a premium design and modern features.`;
          break;
        case 'electronics':
          paragraph = `${namePart} is available for sale${locSentence}. This electronic item is in ${condPart} and fully functional. It is a great choice for buyers seeking a dependable ${fullCategoryLabel.toLowerCase()} product at a reasonable price.`;
          break;
        case 'furniture':
          paragraph = `${namePart} is available for sale${locSentence}. The furniture is sturdy, well maintained and suitable for modern living spaces. It is perfect for buyers looking to upgrade their home with comfortable and durable ${fullCategoryLabel.toLowerCase()}.`;
          break;
        case 'fashion':
          paragraph = `${namePart} is available for sale${locSentence}. The item is in ${condPart} and offers a stylish look suitable for everyday wear or special occasions. It is ideal for buyers looking for quality fashion at a fair price.`;
          break;
        case 'properties':
          paragraph = `${namePart} is available for sale${locSentence}. The property is in ${condPart} and located in a convenient area. It is a good option for buyers seeking a comfortable and well-located ${fullCategoryLabel.toLowerCase()} for personal use or investment.`;
          break;
        case 'jobs':
          paragraph = `${namePart} opportunity available${locSentence}. The role is in ${condPart} and offers a good work environment. It is suitable for candidates seeking a stable job in the ${fullCategoryLabel.toLowerCase()} category.`;
          break;
        case 'services':
          paragraph = `${namePart} service is available${locSentence}. The service is provided in ${condPart} and aims to deliver reliable results. It is ideal for customers looking for professional ${fullCategoryLabel.toLowerCase()} support.`;
          break;
        default:
          paragraph = `${namePart} is available for sale${locSentence}. The item is in ${condPart} and well maintained. It belongs to the ${fullCategoryLabel} category and is a good option for buyers looking for a reliable product at a reasonable price.`;
          break;
      }

      // Clamp to ~55 words for consistency
      const words = paragraph.split(/\s+/).filter(Boolean);
      const limited = words.slice(0, 55).join(' ');
      return limited;
    },
    []
  );
  
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
  const locationAutocompleteContainerRef = useRef<HTMLDivElement>(null);
  const autocompleteInstanceRef = useRef<any>(null);
  const setLocationInputValueRef = useRef<((v: string) => void) | null>(null);
  const lastSyncedLocationInputRef = useRef<string>('');
  const lastSelectedLocationQueryRef = useRef<string | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  // 4. Custom hooks and useQuery hooks
  const createAd = useCreateAd();
  const { data: freeAdsStatus } = useFreeAdsStatus(isAuthenticated);
  const hasPremiumSelected = selectedPremium != null && selectedPremium !== '';
  const { data: adLimitStatus, isLoading: isLoadingAdLimit } = useAdLimitStatus(user?.id, hasPremiumSelected);
  
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
      try {
        const response = await api.get('/premium/offers');
        const offersData = response.data?.offers;
        
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
      } catch (err: unknown) {
        // Network/API errors: don't break the page; post-ad works without premium options
        if (process.env.NODE_ENV === 'development') {
          console.warn('Premium offers unavailable:', err instanceof Error ? err.message : 'Request failed');
        }
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes (shorter to get updates faster)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus to get latest offers
    retry: 1, // Avoid repeated failures when backend is down or wrong URL
  });

  const { data: categories, isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useQuery<Category[]>({
    queryKey: ['categories', 'with-subcategories'],
    queryFn: async (): Promise<Category[]> => {
      try {
        logger.log('🔄 Fetching categories from API...');
        
        const response = await api.get('/categories', {
          timeout: 15000,
          validateStatus: (status) => status < 500
        });
        
        logger.log('📡 Categories API Response:', response.status);
        
        // Handle different response formats
        let categories: Category[] = [];
        
        // Backend returns: { success: true, categories: [...] }
        if (response.data?.success && Array.isArray(response.data.categories)) {
          categories = response.data.categories;
          console.log('✅ Categories loaded:', categories.length);
        } else if (Array.isArray(response.data?.categories)) {
          categories = response.data.categories;
          console.log('✅ Categories loaded:', categories.length);
        } else if (Array.isArray(response.data)) {
          console.warn('⚠️ WARNING: Unexpected response format (direct array)');
          categories = response.data;
        } else {
          console.error('❌ ERROR: Unexpected response format:', response.data);
          return [];
        }
        
        // CRITICAL: Verify we're using the correct array
        console.log('✅ Categories array extracted:', {
          length: categories.length,
          isArray: Array.isArray(categories),
          firstItem: categories[0] ? {
            id: categories[0].id || categories[0]._id,
            name: categories[0].name,
            hasCategoryId: !!(categories[0].categoryId || categories[0].category_id),
            isMainCategory: !(categories[0].categoryId || categories[0].category_id)
          } : null
        });
        
        // CRITICAL: Filter to ensure ONLY main categories are shown
        // Main categories: NO categoryId field (they are top-level)
        // Subcategories: HAVE categoryId field (they belong to a parent category)
        // 
        // Backend should only return main categories, but we double-check here
        // to ensure subcategories never appear in the main category dropdown
        const categoriesWithSubs = categories
          .filter((item: any) => {
            // Check if this item has a categoryId - if yes, it's a subcategory
            const hasCategoryId = item.categoryId || item.category_id;
            
            // If item has categoryId, it's a subcategory - FILTER IT OUT
            if (hasCategoryId) {
              console.error('❌ FILTERING OUT subcategory from main category dropdown:', {
                name: item?.name || 'Unnamed',
                id: item?.id || item?._id || 'No ID',
                categoryId: item?.categoryId || item?.category_id || 'Unknown',
                reason: 'Subcategories should NOT appear in main category dropdown'
              });
              return false; // Filter out subcategories
            }
            
            // Also check if this item appears in any category's subcategories list
            // If it does, it's definitely a subcategory (shouldn't be in main list)
            // Only check if item has valid id to avoid false matches
            const itemId = item.id || item._id;
            if (itemId) {
              const isSubcategoryInAnyCategory = categories.some((cat: any) => {
                // Skip if comparing to itself
                const catId = cat.id || cat._id;
                if (catId === itemId) return false;
                
                // Check if this item appears in this category's subcategories
                if (cat.subcategories && Array.isArray(cat.subcategories)) {
                  return cat.subcategories.some((sub: any) => {
                    const subId = sub.id || sub._id;
                    return subId === itemId;
                  });
                }
                return false;
              });
              
              if (isSubcategoryInAnyCategory) {
                console.error('❌ FILTERING OUT item that appears as subcategory:', {
                  name: item.name || 'Unnamed',
                  id: itemId,
                  reason: 'This item is listed as a subcategory in another category'
                });
                return false;
              }
            }
            
            // Accept only items without categoryId (main categories)
            console.log('✅ Accepting MAIN category:', {
              name: item?.name || 'Unnamed',
              id: item?.id || item?._id || 'No ID',
              hasCategoryId: false,
              hasSubcategories: !!(item?.subcategories && item.subcategories.length > 0)
            });
            return true;
          })
          .map((category: any, index: number) => {
            // Get category ID - prefer id, then _id, then generate one
            const categoryId = category.id || category._id;
            
            // Normalize MAIN category - ensure it has an id and slug (use fallback if needed)
            // Accept ALL IDs from database (MongoDB ObjectIDs, UUIDs, etc.)
            return {
          ...category,
              id: categoryId || category.slug || `cat-${index}`,
              slug: category.slug || category.name?.toLowerCase().replace(/\s+/g, '-') || `category-${index}`,
              // Include ALL subcategories from database
              subcategories: (category.subcategories || [])
                .filter((sub: any) => {
                  // Only filter out subcategories that are clearly invalid (no id, no name)
                  return sub && (sub.id || sub._id || sub.name);
                })
                .map((sub: any, subIndex: number) => {
                  const subId = sub.id || sub._id;
                  
                  // Accept ALL subcategory IDs from database
                  return {
                    ...sub,
                    id: subId || sub.slug || `sub-${subIndex}`,
                    slug: sub.slug || sub.name?.toLowerCase().replace(/\s+/g, '-') || `subcategory-${subIndex}`
                  };
                })
            };
          });
        
        // CRITICAL: Verify final array - check each item to ensure it's a main category
        const subcategoriesInFinalArray = categoriesWithSubs.filter((c: any) => {
          return !!(c.categoryId || c.category_id);
        });
        
        if (subcategoriesInFinalArray.length > 0) {
          console.error('❌ CRITICAL ERROR: Subcategories found in final array!', {
            count: subcategoriesInFinalArray.length,
            subcategories: subcategoriesInFinalArray.map((c: any) => ({
              name: c.name,
              id: c.id || c._id,
              categoryId: c.categoryId || c.category_id
            }))
          });
        }
        
        console.log('✅ FINAL MAIN CATEGORIES (returning to component):', {
          total: categoriesWithSubs.length,
          originalCount: categories.length,
          filteredOut: categories.length - categoriesWithSubs.length,
          withSubcategories: categoriesWithSubs.filter(c => c.subcategories && c.subcategories.length > 0).length,
          withoutSubcategories: categoriesWithSubs.filter(c => !c.subcategories || c.subcategories.length === 0).length,
          allCategoryNames: categoriesWithSubs.map((c: any) => c.name),
          allCategoryIds: categoriesWithSubs.map((c: any) => c.id || c._id),
          subcategoriesInArray: subcategoriesInFinalArray.length, // Should be 0
          sampleCategory: categoriesWithSubs[0] ? {
            id: categoriesWithSubs[0].id,
            name: categoriesWithSubs[0].name,
            slug: categoriesWithSubs[0].slug,
            hasCategoryId: !!(categoriesWithSubs[0].categoryId || categoriesWithSubs[0].category_id), // Should be false
            isMainCategory: !(categoriesWithSubs[0].categoryId || categoriesWithSubs[0].category_id), // Should be true
            subcategoriesCount: categoriesWithSubs[0].subcategories?.length || 0
          } : null
        });
        
        // Log all category names for debugging
        if (categoriesWithSubs.length > 0) {
          console.log('📋 All Main Categories (final list):', categoriesWithSubs.map((c: any) => ({
            name: c.name,
            id: c.id || c._id,
            hasCategoryId: !!(c.categoryId || c.category_id),
            isMain: !(c.categoryId || c.category_id)
          })));
        } else {
          console.warn('⚠️ No main categories found after filtering!');
        }
        
        if (categoriesWithSubs.length === 0) {
          console.warn('⚠️ Categories array is empty after filtering!');
          console.warn('   Original categories count:', categories.length);
          console.warn('   Sample category IDs:', categories.slice(0, 3).map((c: any) => ({ id: c.id, _id: c._id, name: c.name })));
          
          // If we have categories but they were all filtered, show them anyway (might be valid DB categories)
          if (categories.length > 0) {
            console.warn('⚠️ All categories were filtered out. Showing original categories anyway with normalized IDs.');
            return categories.map((cat: any, index: number) => ({
              ...cat,
              id: cat.id || cat._id || cat.slug || `cat-${index}`,
              subcategories: (cat.subcategories || []).map((sub: any, subIndex: number) => ({
                ...sub,
                id: sub.id || sub._id || sub.slug || `sub-${subIndex}`
              }))
            }));
          }
          
          // If no categories at all, the database might be empty
          console.error('❌ NO CATEGORIES IN DATABASE! Please seed categories.');
          console.error('   Run: npm run seed-all-categories');
          return [];
        }
        
        return categoriesWithSubs;
      } catch (error: any) {
        if (process.env.NODE_ENV === 'development') {
          const msg = error?.response?.data?.message ?? error?.message ?? 'Request failed';
          const status = error?.response?.status;
          console.warn('Categories fetch failed:', status != null ? `${status}` : '', msg);
        }
        return [];
      }
    },
    staleTime: 0, // NO CACHE - Always fetch fresh
    gcTime: 0, // NO CACHE - Don't keep in cache
    refetchOnWindowFocus: true, // Refetch on window focus
    refetchOnMount: true, // Always refetch on component mount
    retry: 3, // Retry on failure
    enabled: true, // Always enabled
  });
  
  // Use categories from DATABASE - ensure they're loaded and displayed
  const displayCategories = useMemo(() => {
    console.log('🔍 displayCategories useMemo - Current state:', {
      hasCategories: !!categories,
      categoriesLength: categories?.length || 0,
      isLoading: categoriesLoading,
      hasError: !!categoriesError,
      errorMessage: categoriesError?.message || 'none'
    });
    
    if (!categories || categories.length === 0) {
      if (categoriesLoading) {
        console.log('⏳ Categories loading from DATABASE...');
      } else if (categoriesError) {
        console.error('❌ Error loading categories:', categoriesError);
      } else {
        console.warn('⚠️ No categories available from DATABASE');
      }
      return [];
    }
    
    // CRITICAL: Filter out any subcategories that might be in the list
    // Main categories should NOT have categoryId or category_id
    // Subcategories HAVE categoryId pointing to their parent
    const mainCategoriesOnly = categories.filter((cat: any) => {
      const hasCategoryId = cat.categoryId || cat.category_id;
      
      if (hasCategoryId) {
        console.error('❌ FILTERING OUT subcategory from displayCategories:', {
          name: cat?.name || 'Unnamed',
          id: cat?.id || cat?._id || 'No ID',
          categoryId: cat?.categoryId || cat?.category_id || 'Unknown',
          reason: 'Subcategories should NOT be in main category dropdown'
        });
        return false;
      }
      
      // Also check: if this item appears as a subcategory in any other category, filter it out
      // Only check if category has valid id to avoid false matches
      const catId = cat?.id || cat?._id;
      if (catId) {
        const isSubcategory = categories.some((otherCat: any) => {
          // Skip if comparing to itself
          const otherCatId = otherCat?.id || otherCat?._id;
          if (otherCatId === catId) return false;
          
          // Check if this category appears in another category's subcategories
          if (otherCat?.subcategories && Array.isArray(otherCat.subcategories)) {
            return otherCat.subcategories.some((sub: any) => {
              const subId = sub?.id || sub?._id;
              return subId === catId;
            });
          }
          return false;
        });
        
        if (isSubcategory) {
          console.error('❌ FILTERING OUT item that is a subcategory:', {
            name: cat?.name || 'Unnamed',
            id: catId,
            reason: 'This item is listed as a subcategory in another category'
          });
          return false;
        }
      }
      
      return true; // This is a valid main category
    });
    
    // Log what we're displaying
    console.log('✅ Display MAIN categories only:', {
      originalCount: categories.length,
      filteredCount: mainCategoriesOnly.length,
      filteredOut: categories.length - mainCategoriesOnly.length,
      categoryNames: mainCategoriesOnly.map((c: any) => c.name || 'Unnamed'),
      firstCategory: mainCategoriesOnly[0] ? {
        id: mainCategoriesOnly[0].id,
        name: mainCategoriesOnly[0].name,
        hasCategoryId: !!(mainCategoriesOnly[0].categoryId || mainCategoriesOnly[0].category_id),
        subcategoriesCount: mainCategoriesOnly[0].subcategories?.length || 0
      } : null
    });
    
    return mainCategoriesOnly;
  }, [categories, categoriesLoading, categoriesError]);
  
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
  
  // Computed values from watched values (use displayCategories which includes fallback)
  const selectedCategory = displayCategories?.find((c: any) => {
    const categoryId = c.id || c._id;
    return categoryId === selectedCategoryId;
  });
  const selectedSubcategory = selectedCategory?.subcategories?.find((s: any) => {
    const subcategoryId = s.id || s._id;
    return subcategoryId === selectedSubcategoryId;
  });
  
  // Clear specifications cache when category/subcategory changes
  useEffect(() => {
    if (selectedCategory?.slug) {
      // Invalidate all specifications queries (prefix match)
      queryClient.invalidateQueries({ queryKey: ['categories-specifications'] });
    }
  }, [selectedCategory?.slug, selectedSubcategory?.slug, queryClient]);
  
  // Debug: Log selected category/subcategory for specifications
  useEffect(() => {
    if (selectedCategory && selectedSubcategory) {
      console.log('📋 Specifications Debug:', {
        category: selectedCategory.name,
        categorySlug: selectedCategory.slug,
        subcategory: selectedSubcategory.name,
        subcategorySlug: selectedSubcategory.slug,
        hasSlug: !!selectedSubcategory.slug
      });
    } else if (selectedCategory && !selectedSubcategory) {
      console.log('⚠️ Category selected but subcategory not found:', {
        category: selectedCategory.name,
        subcategoryId: selectedSubcategoryId,
        availableSubs: selectedCategory.subcategories?.map((s: any) => ({ id: s.id, name: s.name, slug: s.slug }))
      });
    }
  }, [selectedCategory, selectedSubcategory, selectedSubcategoryId]);

  // Auto-generate lightweight SEO-friendly description when key fields are present
  useEffect(() => {
    const hasDescription = !!(description && description.toString().trim().length > 0);
    if (hasDescription) return;
    // Don't override AI-filled description from image or text generator
    if (aiFilledFields.includes('description')) return;

    const brand = attributes?.brand ?? attributes?.Brand ?? null;
    const model = attributes?.model ?? attributes?.Model ?? null;

    const generated = generateSeoDescriptionTemplate({
      title,
      categoryName: selectedCategory?.name,
      categorySlug: selectedCategory?.slug,
      brand: typeof brand === 'string' ? brand : null,
      model: typeof model === 'string' ? model : null,
      condition,
      city,
      state,
    });

    if (generated) {
      setValue('description', generated, { shouldDirty: true });
      clearErrors('description');
      setAiFilledFields((prev) =>
        prev.includes('description') ? prev : [...prev, 'description']
      );
    }
  }, [
    title,
    attributes,
    description,
    selectedCategory,
    condition,
    city,
    state,
    aiFilledFields,
    generateSeoDescriptionTemplate,
    setValue,
    clearErrors,
  ]);

  // Heuristic: auto-select "mobiles → mobile-phones" for mobile-like titles/brands/models
  useEffect(() => {
    // Don't override if user already selected a category
    if (selectedCategoryId || !displayCategories || displayCategories.length === 0) return;

    const t = (title || '').toString().toLowerCase();
    const brand = (attributes?.brand || '').toString().toLowerCase();
    const model = (attributes?.model || '').toString().toLowerCase();
    const combined = `${t} ${brand} ${model}`.trim();
    if (!combined) return;

    const mobileKeywords = [
      'iphone',
      'samsung',
      'redmi',
      'realme',
      'oneplus',
      'oppo',
      'vivo',
      'pixel',
      'galaxy',
      'smartphone',
      'smart phone',
      'mobile phone',
      'mobile-phones',
      'mobiles',
      'android phone',
    ];

    const isMobileLike = mobileKeywords.some((kw) => combined.includes(kw));
    if (!isMobileLike) return;

    const mobilesCategory = displayCategories.find((c: any) => {
      const name = (c.name || '').toString().toLowerCase();
      const slug = (c.slug || '').toString().toLowerCase();
      return slug === 'mobiles' || name.includes('mobile');
    });

    if (!mobilesCategory) return;

    const catId = mobilesCategory.id || mobilesCategory._id;
    if (!catId) return;

    setValue('categoryId', catId, { shouldValidate: true, shouldDirty: true });
    clearErrors('categoryId');
    setAiFilledFields((prev) =>
      prev.includes('category') ? prev : [...prev, 'category']
    );

    // Try to auto-select mobile-phones / smartphones subcategory
    if (Array.isArray(mobilesCategory.subcategories)) {
      const mobileSub = mobilesCategory.subcategories.find((s: any) => {
        const name = (s.name || '').toString().toLowerCase();
        const slug = (s.slug || '').toString().toLowerCase();
        return (
          slug === 'mobile-phones' ||
          name.includes('smartphone') ||
          name.includes('mobile phone')
        );
      });

      if (mobileSub) {
        const subId = mobileSub.id || mobileSub._id;
        if (subId) {
          setValue('subcategoryId', subId, {
            shouldValidate: true,
            shouldDirty: true,
          });
          clearErrors('subcategoryId');
          setAiFilledFields((prev) =>
            prev.includes('subcategory') ? prev : [...prev, 'subcategory']
          );
        }
      }
    }
  }, [
    title,
    attributes,
    selectedCategoryId,
    displayCategories,
    setValue,
    clearErrors,
    setAiFilledFields,
  ]);
  
  // Debug: Log selected category and subcategories
  useEffect(() => {
    if (selectedCategoryId && selectedCategory) {
      console.log('🔍 Post-ad Category Selection:', {
        categoryId: selectedCategoryId,
        categoryName: selectedCategory.name,
        subcategoriesCount: selectedCategory.subcategories?.length || 0,
        subcategories: selectedCategory.subcategories?.map((s: any) => s.name) || [],
        hasSubcategories: !!(selectedCategory.subcategories && selectedCategory.subcategories.length > 0),
      });
    } else if (selectedCategoryId && !selectedCategory) {
      console.warn('⚠️ Category not found:', selectedCategoryId, 'Available categories:', categories?.map((c: any) => c.id));
    }
  }, [selectedCategoryId, selectedCategory, categories]);
  
  // Check if this is mobile phones subcategory
  // Handle both 'mobiles' and 'electronics' category slugs (frontend may use 'electronics', backend uses 'mobiles')
  const isMobilePhones = (
    (selectedCategory?.slug === 'mobiles' || selectedCategory?.slug === 'electronics') && 
    selectedSubcategory?.slug === 'mobile-phones'
  );
  // Check if this is any mobile subcategory
  const isMobileCategory = selectedCategory?.slug === 'mobiles' || selectedCategory?.name?.toLowerCase().includes('mobile');
  
  // State for brands-models data
  const [brandsModelsData, setBrandsModelsData] = useState<any>(null);
  const [hasBrandsModels, setHasBrandsModels] = useState(false);
  
  // Check if premium features are selected
  const hasPremiumFeatures = !!(selectedPremium || isUrgent);
  
  // Ensure premiumSettings is always an array to prevent .find() errors
  const safePremiumSettings = Array.isArray(premiumSettings) ? premiumSettings : [];
  
  // Watch brand from attributes
  const selectedBrandFromForm = watch('attributes.brand');

  // Real-time quota updates via socket (optimized - single registration)
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isAuthenticated) return;

    const handleQuotaUpdate = (quotaData: any) => {
      logger.log('📡 Received AD_QUOTA_UPDATED event');
      
      // Calculate business ads remaining (only from NON-EXHAUSTED packages)
      const businessAdsRemaining = quotaData.packages?.reduce((sum: number, pkg: any) => {
        if (pkg.isExhausted || (pkg.adsRemaining === 0 && pkg.totalAds > 0)) {
          return sum;
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
      
      logger.log('✅ Quota updated in real-time');
    };

    // Register listener ONCE (no duplicate on 'connect')
    socket.on('AD_QUOTA_UPDATED', handleQuotaUpdate);
    logger.log('✅ Socket listener registered');

    return () => {
      socket.off('AD_QUOTA_UPDATED', handleQuotaUpdate);
      logger.log('🧹 Socket listener cleaned up');
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
        // Category is always required
        if (!selectedCategoryId) return false;
        // Subcategory is only required if category has subcategories
        if (selectedCategory?.subcategories && selectedCategory.subcategories.length > 0) {
          return !!selectedSubcategoryId;
        }
        // If no subcategories, category alone is sufficient
        return true;
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
      case 6: // Price (from root or attributes, e.g. Product Specifications)
        const priceVal = price ?? watch('attributes.price');
        return !!(priceVal && parseFloat(String(priceVal)) >= 0);
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

  // Fetch brands-models data when category/subcategory is selected
  useEffect(() => {
    if (selectedCategory?.slug && selectedSubcategory?.slug && !isLoadingBrands) {
      setIsLoadingBrands(true);
      api.get('/categories/brands-models', {
        params: {
          categorySlug: selectedCategory.slug,
          subcategorySlug: selectedSubcategory.slug
        }
      })
        .then(response => {
          if (response.data.success && response.data.categories) {
            const categoryData = response.data.categories[0];
            if (categoryData && categoryData.subcategories) {
              const subcategoryData = categoryData.subcategories[0];
              if (subcategoryData && subcategoryData.brands && subcategoryData.brands.length > 0) {
                setBrandsModelsData(subcategoryData);
                setHasBrandsModels(true);
                // Set brands from the data
                const brandsList = subcategoryData.brands.map((brand: any) => ({
                  id: brand.name.toLowerCase().replace(/\s+/g, '-'),
                  name: brand.name,
                  models: brand.models || []
                }));
                setBrands(brandsList);
                // Filter out unwanted test entries
            const unwantedEntries = ['mokia', 'yyytytty'];
            setBrandOptions(brandsList
              .filter((brand: { id: string; name: string }) => {
                const brandName = (brand.name || '').toLowerCase();
                return !unwantedEntries.some(entry => 
                  brandName === entry || brandName.includes(entry)
                );
              })
              .map((brand: { id: string; name: string }) => ({
                  value: brand.name,
                  label: brand.name
                })));
              } else {
                setHasBrandsModels(false);
                setBrandsModelsData(null);
                // Fallback to old API for categories without brands-models data
                api.get('/categories/brands', {
                  params: {
                    categorySlug: selectedCategory.slug,
                    subcategorySlug: selectedSubcategory.slug,
                    limit: 10
                  }
                })
                  .then(brandResponse => {
                    if (brandResponse.data.success && brandResponse.data.brands) {
                      setBrands(brandResponse.data.brands);
                      setBrandOptions(brandResponse.data.brands.map((brand: { id: string; name: string }) => ({
                        value: brand.name,
                        label: brand.name
                      })));
                      setHasBrandsModels(true);
                    }
                  })
                  .catch(() => {
                    setBrands([]);
                    setBrandOptions([]);
                    setHasBrandsModels(false);
                  });
              }
            } else {
              setHasBrandsModels(false);
              setBrandsModelsData(null);
            }
          }
        })
        .catch(error => {
          console.error('Failed to fetch brands-models:', error);
          // Fallback to old API
          api.get('/categories/brands', {
            params: {
              categorySlug: selectedCategory?.slug,
              subcategorySlug: selectedSubcategory?.slug,
              limit: 10
            }
          })
            .then(brandResponse => {
              if (brandResponse.data.success && brandResponse.data.brands) {
                setBrands(brandResponse.data.brands);
                // Filter out unwanted test entries
                const unwantedEntries = ['mokia', 'yyytytty'];
                setBrandOptions(brandResponse.data.brands
                  .filter((brand: { id: string; name: string }) => {
                    const brandName = (brand.name || '').toLowerCase();
                    return !unwantedEntries.some(entry => 
                      brandName === entry || brandName.includes(entry)
                    );
                  })
                  .map((brand: { id: string; name: string }) => ({
                    value: brand.name,
                    label: brand.name
                  })));
                setHasBrandsModels(true);
              } else {
                setBrands([]);
                setBrandOptions([]);
                setHasBrandsModels(false);
              }
            })
            .catch(() => {
              setBrands([]);
              setBrandOptions([]);
              setHasBrandsModels(false);
            });
        })
        .finally(() => {
          setIsLoadingBrands(false);
        });
    } else if (!selectedCategory?.slug || !selectedSubcategory?.slug) {
      // Clear brands if no category/subcategory selected
      setBrands([]);
      setBrandOptions([]);
      setSelectedBrand('');
      setValue('attributes.brand', '');
      setValue('attributes.model', '');
      setModels([]);
      setModelOptions([]);
      setHasBrandsModels(false);
      setBrandsModelsData(null);
    }
  }, [selectedCategory?.slug, selectedSubcategory?.slug, setValue]);

  // Search brands with debounce
  useEffect(() => {
    if (!isMobilePhones || !brandSearchQuery.trim()) {
      // Reset to popular brands if no search
      if (brandOptions.length === 0 && brands.length > 0) {
        // Filter out unwanted test entries
        const unwantedEntries = ['mokia', 'yyytytty'];
        setBrandOptions(brands
          .filter((brand: { id: string; name: string }) => {
            const brandName = (brand.name || '').toLowerCase();
            return !unwantedEntries.some(entry => 
              brandName === entry || brandName.includes(entry)
            );
          })
          .map((brand: { id: string; name: string }) => ({
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
            // Filter out unwanted test entries
            const unwantedEntries = ['mokia', 'yyytytty'];
            setBrandOptions(response.data.brands
              .filter((brand: { id: string; name: string }) => {
                const brandName = (brand.name || '').toLowerCase();
                return !unwantedEntries.some(entry => 
                  brandName === entry || brandName.includes(entry)
                );
              })
              .map((brand: { id: string; name: string }) => ({
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
    if (hasBrandsModels && brandName && !isLoadingModels) {
      setIsLoadingModels(true);
      
      // First try to get models from brands-models data
      if (brandsModelsData && brandsModelsData.brands) {
        const selectedBrandData = brandsModelsData.brands.find((b: any) => b.name === brandName);
        if (selectedBrandData && selectedBrandData.models && selectedBrandData.models.length > 0) {
          const modelsList = selectedBrandData.models.map((modelName: string) => ({
            id: modelName.toLowerCase().replace(/\s+/g, '-'),
            name: modelName
          }));
          setModels(modelsList);
          // Filter out unwanted test entries
          const unwantedEntries = ['mokia', 'yyytytty'];
          setModelOptions(modelsList
            .filter((model: { id: string; name: string }) => {
              const modelName = (model.name || '').toLowerCase();
              return !unwantedEntries.some(entry => 
                modelName === entry || modelName.includes(entry)
              );
            })
            .map((model: { id: string; name: string }) => ({
              value: model.name,
              label: model.name
            })));
          setIsLoadingModels(false);
          return;
        }
      }
      
      // Fallback to API if not found in brands-models data
      const brandObj = brands.find(b => b.name === brandName);
      const brandId = brandObj?.id || String(brandName || '').toLowerCase().replace(/\s+/g, '-');
      
      api.get('/categories/models', {
        params: { brand: brandId, limit: 20 }
      })
        .then(response => {
          if (response.data.success && response.data.models) {
            setModels(response.data.models);
            // Filter out unwanted test entries
            const unwantedEntries = ['mokia', 'yyytytty'];
            setModelOptions(response.data.models
              .filter((model: { id: string; name: string }) => {
                const modelName = (model.name || '').toLowerCase();
                return !unwantedEntries.some(entry => 
                  modelName === entry || modelName.includes(entry)
                );
              })
              .map((model: { id: string; name: string }) => ({
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
    } else if (!hasBrandsModels || !brandName) {
      // Clear models if no brands-models data or no brand selected
      setModels([]);
      setModelOptions([]);
      setValue('attributes.model', '');
    }
  }, [selectedBrandFromForm, selectedBrand, hasBrandsModels, brands, brandsModelsData, setValue]);

  // Search models with debounce
  useEffect(() => {
    const brandName = selectedBrandFromForm || selectedBrand;
    if (!hasBrandsModels || !brandName || !modelSearchQuery.trim()) {
      // Reset to popular models if no search
      if (modelOptions.length === 0 && models.length > 0) {
        // Filter out unwanted test entries
        const unwantedEntries = ['mokia', 'yyytytty'];
        setModelOptions(models
          .filter((model: { id: string; name: string }) => {
            const modelName = (model.name || '').toLowerCase();
            return !unwantedEntries.some(entry => 
              modelName === entry || modelName.includes(entry)
            );
          })
          .map((model: { id: string; name: string }) => ({
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
            // Filter out unwanted test entries
            const unwantedEntries = ['mokia', 'yyytytty'];
            setModelOptions(response.data.models
              .filter((model: { id: string; name: string }) => {
                const modelName = (model.name || '').toLowerCase();
                return !unwantedEntries.some(entry => 
                  modelName === entry || modelName.includes(entry)
                );
              })
              .map((model: { id: string; name: string }) => ({
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
  }, [modelSearchQuery, hasBrandsModels, selectedBrandFromForm, selectedBrand, brands, models]);

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

  // Handle place selection from autocomplete (legacy format or PlaceResult from Firefox)
  const handlePlaceSelect = useCallback((place: any) => {
    let state = '';
    let city = '';
    let neighbourhood = '';

    if (place.latitude !== undefined && place.longitude !== undefined) {
      state = place.state || '';
      city = place.city || '';
      neighbourhood = '';
    } else if (place.address_components) {
      for (const component of place.address_components) {
        const types = component.types || [];
        if (types.includes('administrative_area_level_1')) state = component.long_name;
        else if (types.includes('locality') || types.includes('administrative_area_level_2')) city = component.long_name;
        else if (types.includes('sublocality') || types.includes('sublocality_level_1')) neighbourhood = component.long_name;
        else if (types.includes('neighborhood') && !neighbourhood) neighbourhood = component.long_name;
      }
    } else {
      return;
    }

    const address = place.formatted_address || place.address || '';
    if (setLocationInputValueRef.current && address) {
      setLocationInputValueRef.current(address);
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

    if (city) setLocationQuery(city);
    else if (address) setLocationQuery(address);

    if (setLocationInputValueRef.current) {
      setLocationInputValueRef.current(city || address);
    }

    let lat: number | undefined;
    let lng: number | undefined;
    if (place.latitude !== undefined && place.longitude !== undefined) {
      lat = place.latitude;
      lng = place.longitude;
    } else if (place.geometry?.location) {
      lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
      lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;
    }
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      setMapCoordinates({ lat, lng });
      api.post('/geocoding/detect-location', { latitude: lat, longitude: lng })
        .then((res) => {
          if (res.data?.success && res.data?.nearestLocation?.id) {
            setValue('locationId', res.data.nearestLocation.id);
          }
        })
        .catch(() => {});
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
  const { autocompleteInstance, isInitialized: autocompleteInitialized, setValue: setLocationInputValue } = usePlacesAutocomplete(
    locationAutocompleteContainerRef,
    {
      country: 'in',
      bounds: {
        southwest: { lat: 28.4, lng: 77.0 },
        northeast: { lat: 28.8, lng: 77.4 }
      },
      types: ['geocode', 'establishment'],
      onPlaceSelect: handlePlaceSelect
    }
  );

  setLocationInputValueRef.current = setLocationInputValue;

  // Sync the Google Places input only for programmatic updates (avoid cursor jumps while typing)
  // We only push value when the script becomes ready OR when we set locationQuery programmatically.
  useEffect(() => {
    if (!googlePlacesLoaded || !setLocationInputValue) return;
    if (!locationQuery) return;
    if (lastSyncedLocationInputRef.current === locationQuery) return;
    setLocationInputValue(locationQuery);
    lastSyncedLocationInputRef.current = locationQuery;
  }, [googlePlacesLoaded, setLocationInputValue, locationQuery]);

  // Keep internal "last synced" marker aligned when value is set via ref (detect/select flows)
  useEffect(() => {
    if (locationQuery) {
      lastSyncedLocationInputRef.current = locationQuery;
    }
  }, [locationQuery]);

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

    // Don't reopen dropdown right after user selected - wait for them to type again
    if (locationQuery.trim() === lastSelectedLocationQueryRef.current) {
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

  // Handle location selection (from API search)
  const handleLocationSelect = (location: any) => {
    const locationName = location.name || location.city || '';
    lastSelectedLocationQueryRef.current = locationName;
    setLocationQuery(locationName);
    setValue('city', location.city || locationName);

    // CRITICAL: Set locationId for ad creation
    if (location.id) {
      setValue('locationId', location.id);
    }

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

    setShowLocationDropdown(false);
    setLocationSuggestions([]);
    setSelectedLocationIndex(-1);

    if (setLocationInputValueRef.current) {
      setLocationInputValueRef.current(locationName);
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

  // Close dropdowns when clicking outside (exclude pac-container for Firefox/Chrome)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const pacContainer = document.querySelector('.pac-container');
      if (pacContainer?.contains(target)) return; // Don't close when clicking Google Places suggestions

      // Location dropdown
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(target) &&
        locationAutocompleteContainerRef.current &&
        !locationAutocompleteContainerRef.current.contains(target)
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
  
  // Quota / display values from API (needed first for totalRemaining)
  const adsRemaining = adLimitStatus?.adsRemaining || 0;
  const hasAdsRemaining = adsRemaining > 0;
  const hasFreeAdsRemaining = adLimitStatus?.hasFreeAdsRemaining ?? false;
  const freeAdsRemaining = adLimitStatus?.freeAdsRemaining || 0;
  const businessAdsRemaining = adLimitStatus?.businessAdsRemaining || 0;
  const totalRemaining = adLimitStatus?.totalRemaining ?? (freeAdsRemaining + businessAdsRemaining);

  // Backend-controlled visibility; business plan undel + free quota thrunna varea → Business Package Status kanikaruthu
  const allowDirectPost = adLimitStatus?.allowDirectPost ?? false;
  const showBusinessPackageStatusSectionFromApi = adLimitStatus?.showBusinessPackageStatusSection === true;
  const hasQuotaLeft = totalRemaining > 0 || freeAdsRemaining > 0;
  const hasActiveBusinessPackage = adLimitStatus?.activeBusinessPackage ?? false;
  const showBusinessPackageStatusSection = showBusinessPackageStatusSectionFromApi && totalRemaining === 0 && freeAdsRemaining === 0;
  // When package exhausted (business package, no ads left, can't post): always show premium/single buy options
  const isPackageExhausted = hasActiveBusinessPackage && !hasAdsRemaining && !adLimitStatus?.canPost;
  const hidePremiumSection = isPackageExhausted ? false : (hasQuotaLeft || !showBusinessPackageStatusSectionFromApi);
  const hideSingleBuy = isPackageExhausted ? false : (totalRemaining > 0 || allowDirectPost || (adLimitStatus?.hideSingleBuy ?? false));

  const premiumSlotsAvailable = adLimitStatus?.premiumSlotsAvailable || 0;
  const hasPremiumSlotsAvailable = premiumSlotsAvailable > 0;
  const hasBusinessAdsRemaining = businessAdsRemaining > 0;

  // Current plan name for Business Package Status section (which package is this)
  const currentPackageType = adLimitStatus?.packages?.[0]?.packageType || businessPackageStatus?.packages?.[0]?.packageType;
  const currentPackageDisplayName = currentPackageType
    ? currentPackageType.split('_').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
    : null;
  const hasAnyBusinessPackage = adLimitStatus?.packages && adLimitStatus.packages.length > 0;
  const shouldHidePaymentOptions = hasFreeAdsRemaining || hasBusinessAdsRemaining || hasAnyBusinessPackage;
  const shouldShowPremiumOptions = !isLoadingAdLimit && adLimitStatus && !hasFreeAdsRemaining && businessAdsRemaining === 0 && !hasAnyBusinessPackage && !shouldHidePaymentOptions;

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
      console.log('📦 Business Package Status (backend flags):', {
        activeBusinessPackage: hasActiveBusinessPackage,
        businessAdsRemaining: adLimitStatus.businessAdsRemaining,
        hidePremiumSection,
        hideSingleBuy,
        shouldShowPremiumOptions,
      });
      }
    }
  }, [adLimitStatus, isLoadingAdLimit, hasActiveBusinessPackage, hidePremiumSection, hideSingleBuy, shouldShowPremiumOptions]);

  // Reset upgrade popup dismissed when backend no longer says show upgrade (e.g. user bought package)
  useEffect(() => {
    if (adLimitStatus?.showUpgradePopup !== true) {
      setUpgradePopupDismissed(false);
    }
  }, [adLimitStatus?.showUpgradePopup]);

  // User has free/business ads → don't show payment modal; close if already open
  useEffect(() => {
    if (totalRemaining > 0 && showPaymentRequiredModal) {
      setShowPaymentRequiredModal(false);
      setPaymentRequiredError(null);
    }
  }, [totalRemaining, showPaymentRequiredModal]);

  // Check if payment is required BEFORE posting
  // DISABLED: Allow posting without payment gate (free ads / business package checks bypassed)
  // Priority: 1. Free ads 2. Business package 3. Payment required
  const requiresPaymentBeforePosting = false; // was: !isLoadingAdLimit && !hasFreeAdsRemaining && (!hasActiveBusinessPackage || !hasBusinessAdsRemaining);

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

    // Automatically run AI product detection on first upload/change
    if (files.length > 0 && !isImageAiLoading) {
      // Use the primary image (first in newImages) for analysis
      const primaryImage = newImages[0];
      if (primaryImage) {
        void autoFillDetailsFromImage(primaryImage);
      }
    }
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
      const { latitude, longitude } = await import('@/utils/geolocation').then((m) => m.getCurrentPosition());

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
      let response: { data: { success?: boolean; message?: string; detectedLocation?: any; nearestLocation?: any } };
      try {
        response = await api.post('/geocoding/detect-location', {
          latitude,
          longitude,
        });
      } catch (apiError: any) {
        // Handle geocoding API errors without re-throwing so caller doesn't see unhandled rejection (e.g. 403)
        const status = apiError?.response?.status;
        const data = apiError?.response?.data;
        const msg = data?.message || data?.error_message;
        if (status === 403) {
          // Silent: user can enter location manually; do not show API config error
          setIsDetectingLocation(false);
          return;
        }
        if (status === 429 || status === 503) {
          toast.error('Location service temporarily unavailable. Please try again later or enter location manually.', { duration: 6000 });
          setIsDetectingLocation(false);
          return;
        }
        if (status === 404) {
          toast.error('No location found for your coordinates. Please enter location manually.', { duration: 5000 });
          setIsDetectingLocation(false);
          return;
        }
        if (status >= 400 && status < 500) {
          toast.error(msg || 'Could not detect location. Please enter location manually.', { duration: 5000 });
          setIsDetectingLocation(false);
          return;
        }
        // Network/other: re-throw so outer catch can show generic message
        throw apiError;
      }

      if (!response?.data) {
        setIsDetectingLocation(false);
        return;
      }
      if (response.data.success) {
        const { detectedLocation, nearestLocation } = response.data;

        // CRITICAL: Set locationId from nearest DB location for ad creation
        if (nearestLocation?.id) {
          setValue('locationId', nearestLocation.id);
        }

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
          if (setLocationInputValueRef.current && locationString) {
            setLocationInputValueRef.current(locationString);
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
      // Log structured details (raw error often serializes as {} for Axios/network errors)
      if (process.env.NODE_ENV === 'development') {
        const details: Record<string, unknown> = {
          message: error?.message,
          name: error?.name,
          code: error?.code,
        };
        if (error?.response) {
          details.status = error.response.status;
          details.responseData = error.response.data;
        }
        console.warn('Location detection error:', details);
      }

      // Handle geolocation errors (code 1=denied, 2=unavailable, 3=timeout)
      const geoCode = error?.code;
      if (geoCode === 1 || geoCode === 'PERMISSION_DENIED') {
        toast.error('Location access denied. Please enable location permissions in your browser settings.', { duration: 5000 });
      } else if (geoCode === 2 || geoCode === 'POSITION_UNAVAILABLE') {
        toast.error('Location information unavailable. Please try again or enter location manually.', { duration: 5000 });
      } else if (geoCode === 3 || geoCode === 'TIMEOUT') {
        toast.error('Location request timed out. Please try again or enter location manually.', { duration: 5000 });
      } else if (error.response) {
        // Handle API errors with detailed messages
        const errorData = error.response.data || null;
        const statusCode = error.response.status;
        const errorMessage = errorData?.message || errorData?.error_message || 'Failed to detect location';

        // Log detailed API error only in development, and avoid noisy empty objects
        if (process.env.NODE_ENV === 'development') {
          const hasPayload = !!(errorData && Object.keys(errorData).length > 0);

          if (hasPayload) {
            console.error('API Error Details:', {
              status: statusCode,
              data: errorData,
              message: errorData?.message || errorData?.error_message,
              error_message: errorData?.error_message,
              status_field: errorData?.status,
              url: error.config?.url
            });
          } else {
            console.warn('Location API error without response body', {
              status: statusCode,
              url: error.config?.url,
              message: errorMessage
            });
          }
        }
        
        // Handle HTTP status codes
        if (statusCode === 401) {
          Cookies.remove('token', { path: '/' });
          queryClient.setQueryData(['auth', 'me'], null);
          toast.error('Your session has expired. Please log in again to continue.', { duration: 5000 });
          router.push('/login');
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
            // Silent: user can enter location manually; do not show API config error
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
        const errorMessage = error?.message || 'Failed to detect location';
        if (process.env.NODE_ENV === 'development') {
          console.warn('Location detection error (no response):', {
            message: error?.message,
            name: error?.name,
            code: error?.code,
          });
        }
        
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

  // Auto-fill location from last known sources (profile, navbar, local storage, geolocation fallback)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (locationInitializedRef.current) return;

    // If user already selected location in this form, don't override
    if (state || city) {
      locationInitializedRef.current = true;
      return;
    }

    const applyLocation = (cityVal?: string | null, stateVal?: string | null, label?: string) => {
      const cleanCity = (cityVal || '').toString().trim();
      const cleanState = (stateVal || '').toString().trim();
      if (!cleanCity && !cleanState) return false;

      setValue('city', cleanCity, { shouldDirty: true });
      setValue('state', cleanState, { shouldDirty: true });
      clearErrors(['city', 'state']);

      const parts = [];
      if (cleanCity) parts.push(cleanCity);
      if (cleanState) parts.push(cleanState);
      const display = parts.join(', ');

      if (display) {
        setLocationQuery(display);
        if (setLocationInputValueRef.current) {
          setLocationInputValueRef.current(display);
        }
      }

      if (display && label) {
        setAutoLocationMessage(`${label}: ${display}`);
      }

      locationInitializedRef.current = true;
      return true;
    };

    // 1. User profile saved location
    if (user) {
      const profileCity =
        (user as any)?.city ||
        (user as any)?.locationCity ||
        (user as any)?.location?.city;
      const profileState =
        (user as any)?.state ||
        (user as any)?.locationState ||
        (user as any)?.location?.state;

      if (applyLocation(profileCity, profileState, 'Using your profile location')) {
        return;
      }
    }

    // 2. Navbar selected_location from localStorage
    try {
      const stored = window.localStorage.getItem('selected_location');
      if (stored) {
        const parsed = JSON.parse(stored);
        const cityVal = parsed.city || null;
        const stateVal = parsed.state || null;
        if (applyLocation(cityVal, stateVal, 'Using your last selected location')) {
          return;
        }
      }
    } catch (err) {
      console.error('Error reading selected_location from localStorage:', err);
    }

    // 3. google_location_data from localStorage
    try {
      const storedGoogle = window.localStorage.getItem('google_location_data');
      if (storedGoogle) {
        const parsed = JSON.parse(storedGoogle);
        const cityVal = parsed.city || null;
        const stateVal = parsed.state || null;
        if (applyLocation(cityVal, stateVal, 'Using your last detected location')) {
          return;
        }
      }
    } catch (err) {
      console.error('Error reading google_location_data from localStorage:', err);
    }

    // 4. user_location from localStorage (legacy utility)
    try {
      const savedUserLoc = window.localStorage.getItem('user_location');
      if (savedUserLoc) {
        const parsed = JSON.parse(savedUserLoc);
        const cityVal = parsed.city || null;
        const stateVal = parsed.state || null;
        if (applyLocation(cityVal, stateVal, 'Using your last saved location')) {
          return;
        }
      }
    } catch (err) {
      console.error('Error reading user_location from localStorage:', err);
    }

    // 5. Fallback: device geolocation (only once)
    const runGeolocationFallback = async () => {
      try {
        await detectLocation();
        setAutoLocationMessage('Using your device location');
      } catch {
        // Silent fail – user can still enter location manually
      } finally {
        locationInitializedRef.current = true;
      }
    };

    runGeolocationFallback();
  }, [user, state, city, setValue, clearErrors, detectLocation]);

  const autoFillDetailsFromImage = async (overrideImageFile?: File) => {
    const imageFile = overrideImageFile || images[0];
    if (!imageFile) {
      toast.error('Please upload at least one image first');
      return;
    }

    setIsImageAiLoading(true);
    setAiFilledFields([]);
    setAiPriceSuggestion(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await api.post('/ai/generate-ad-details-from-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const aiData = response.data?.data || response.data || {};
      const newlyFilled: string[] = [];

      let matchedCategoryId: string | null = null;
      let matchedSubcategoryId: string | null = null;

      // Category & Subcategory
      if (aiData.category && Array.isArray(displayCategories) && displayCategories.length > 0) {
        const normalizedCategory = String(aiData.category).toLowerCase().trim();
        const slugifiedCategory = normalizedCategory.replace(/\s+/g, '-');

        // Handle common AI → category name mismatches (especially mobiles)
        const categorySynonyms: Record<string, string[]> = {
          'mobile phones': ['mobiles', 'mobile', 'smartphones'],
          'mobile phone': ['mobiles', 'mobile', 'smartphones'],
          phones: ['mobiles', 'mobile-phones'],
          smartphone: ['mobiles', 'mobile-phones'],
          smartphones: ['mobiles', 'mobile-phones'],
          car: ['cars', 'vehicles'],
          cars: ['vehicles'],
          bike: ['bikes', 'two-wheelers'],
          'two wheeler': ['bikes', 'two-wheelers'],
        };

        const candidateNames = new Set<string>([normalizedCategory, slugifiedCategory]);
        const extraFromNorm = categorySynonyms[normalizedCategory] || [];
        const extraFromSlug = categorySynonyms[slugifiedCategory] || [];
        extraFromNorm.forEach((v) => candidateNames.add(v.toLowerCase()));
        extraFromSlug.forEach((v) => candidateNames.add(v.toLowerCase()));

        const matchedCategory = displayCategories.find((c: any) => {
          const name = (c.name || '').toLowerCase().trim();
          const slug = (c.slug || '').toLowerCase().trim();
          return candidateNames.has(name) || candidateNames.has(slug);
        });

        if (matchedCategory) {
          const categoryId = matchedCategory.id || matchedCategory._id;
          if (categoryId) {
            matchedCategoryId = categoryId;
            setValue('categoryId', categoryId, { shouldValidate: true, shouldDirty: true });
            clearErrors('categoryId');
            newlyFilled.push('category');

            if (aiData.subcategory && Array.isArray(matchedCategory.subcategories)) {
              const normalizedSub = String(aiData.subcategory).toLowerCase().trim();
              const slugifiedSub = normalizedSub.replace(/\s+/g, '-');

              const matchedSub = matchedCategory.subcategories.find((s: any) => {
                const subName = (s.name || '').toLowerCase().trim();
                const subSlug = (s.slug || '').toLowerCase().trim();
                return (
                  subName === normalizedSub ||
                  subSlug === normalizedSub ||
                  subSlug === slugifiedSub
                );
              });

            if (matchedSub) {
              const subId = matchedSub.id || matchedSub._id;
              if (subId) {
                matchedSubcategoryId = subId;
                setValue('subcategoryId', subId, { shouldValidate: true, shouldDirty: true });
                clearErrors('subcategoryId');
                newlyFilled.push('subcategory');
              }
            }
          }
        }
        }
      }

      // Brand, Model, Color – store in attributes so DynamicSpecifications can use them
      if (aiData.brand) {
        const brand = String(aiData.brand).trim();
        if (brand) {
          setValue('attributes.brand', brand, { shouldDirty: true });
          setSelectedBrand(brand);
          newlyFilled.push('brand');
        }
      }

      if (aiData.model) {
        const model = String(aiData.model).trim();
        if (model) {
          setValue('attributes.model', model, { shouldDirty: true });
          newlyFilled.push('model');
        }
      }

      if (aiData.color) {
        const color = String(aiData.color).trim();
        if (color) {
          setValue('attributes.color', color, { shouldDirty: true });
          newlyFilled.push('color');
        }
      }

      // Product type (stored in attributes.product_type for now)
      if (aiData.productType || aiData.product_type) {
        const productType = String(aiData.productType || aiData.product_type).trim();
        if (productType) {
          setValue('attributes.product_type', productType, { shouldDirty: true });
          newlyFilled.push('product_type');
        }
      }

      // Title & Description (SEO-friendly)
      if (aiData.title) {
        const titleFromAi = String(aiData.title).trim();
        if (titleFromAi) {
          setValue('title', titleFromAi, { shouldValidate: true, shouldDirty: true });
          clearErrors('title');
          newlyFilled.push('title');
        }
      }

      const aiSeoDescription = aiData.seoDescription || aiData.description;
      if (aiSeoDescription) {
        const descFromAi = String(aiSeoDescription).trim();
        if (descFromAi) {
          setValue('description', descFromAi, { shouldValidate: true, shouldDirty: true });
          clearErrors('description');
          newlyFilled.push('description');
        }
      }

      // Price suggestion (AI + similar ads)
      let fallbackNumericFromAi: number | null = null;
      const rawPrice =
        aiData.priceSuggestion ?? aiData.price ?? aiData.suggestedPrice ?? null;
      if (rawPrice != null) {
        const numeric = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
        if (!isNaN(numeric) && isFinite(numeric) && numeric > 0) {
          fallbackNumericFromAi = numeric;
        }
      }

      try {
        // Use DB-based price suggestion if we have enough context
        if (matchedCategoryId || selectedCategoryId || matchedSubcategoryId || selectedSubcategoryId) {
          const priceSuggestionResp = await api.post('/ai/ad-price-suggestion', {
            title: aiData.title || title || '',
            category: matchedCategoryId || selectedCategoryId || undefined,
            subcategory: matchedSubcategoryId || selectedSubcategoryId || undefined,
            condition: condition || undefined,
            location: state && city ? `${city}, ${state}` : undefined,
          });

          const psData = priceSuggestionResp.data || {};
          if (psData.success && (psData.suggestedPrice || psData.priceRange)) {
            const suggested = typeof psData.suggestedPrice === 'number'
              ? psData.suggestedPrice
              : psData.suggestedPrice
              ? Number(psData.suggestedPrice)
              : undefined;
            const min = psData.priceRange?.min ?? null;
            const max = psData.priceRange?.max ?? null;

            if (
              (suggested != null && !isNaN(Number(suggested))) ||
              (min != null && max != null)
            ) {
              setAiPriceSuggestion({
                suggested: suggested != null && !isNaN(Number(suggested)) ? Number(suggested) : null,
                min: typeof min === 'number' ? min : null,
                max: typeof max === 'number' ? max : null,
                source: 'db',
              });
            }
          } else if (fallbackNumericFromAi) {
            const base = fallbackNumericFromAi;
            const delta = Math.round(base * 0.1);
            setAiPriceSuggestion({
              suggested: base,
              min: base - delta,
              max: base + delta,
              source: 'ai',
            });
          }
        } else if (fallbackNumericFromAi) {
          const base = fallbackNumericFromAi;
          const delta = Math.round(base * 0.1);
          setAiPriceSuggestion({
            suggested: base,
            min: base - delta,
            max: base + delta,
            source: 'ai',
          });
        }
      } catch (priceError) {
        console.error('Error getting price suggestion from backend:', priceError);
        if (fallbackNumericFromAi) {
          const base = fallbackNumericFromAi;
          const delta = Math.round(base * 0.1);
          setAiPriceSuggestion({
            suggested: base,
            min: base - delta,
            max: base + delta,
            source: 'ai',
          });
        }
      }

      if (newlyFilled.length === 0) {
        toast.info('AI could not detect details from the image. Please fill the form manually.');
      } else {
        setAiFilledFields(newlyFilled);
        toast.success('Details auto-filled from image. Please review and edit.');
      }
    } catch (error: any) {
      console.error('Error generating ad details from image:', error);
      const status = error.response?.status;
      if (status === 401) {
        Cookies.remove('token', { path: '/' });
        queryClient.setQueryData(['auth', 'me'], null);
        toast.error('Your session has expired. Please log in again to continue.', { duration: 5000 });
        router.push('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to analyze image. Please try again.');
      }
    } finally {
      setIsImageAiLoading(false);
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
        attributes: attributes && typeof attributes === 'object' ? attributes : undefined,
      });

      if (response.data.success && response.data.description) {
        setValue('description', response.data.description);
        toast.success('Description generated successfully!');
      } else {
        toast.error('Failed to generate description');
      }
    } catch (error: any) {
      console.error('Error generating description:', error);
      const status = error.response?.status;
      if (status === 401) {
        Cookies.remove('token', { path: '/' });
        queryClient.setQueryData(['auth', 'me'], null);
        toast.error('Your session has expired. Please log in again to continue.', { duration: 5000 });
        router.push('/login');
        return;
      }
      toast.error(error.response?.data?.message || 'Failed to generate description. Please try again.');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const improveDescription = async () => {
    const currentDesc = description || '';
    if (!currentDesc.trim()) {
      toast.error('Please enter some description text first');
      return;
    }
    if (currentDesc.trim().length < 10) {
      toast.error('Description must be at least 10 characters to improve');
      return;
    }

    setIsImprovingDescription(true);
    try {
      const response = await api.post('/ai/improve-description', { text: currentDesc });
      if (response.data.success && response.data.description) {
        setValue('description', response.data.description);
        clearErrors('description');
        toast.success('Description improved!');
      } else {
        toast.error('Failed to improve description');
      }
    } catch (error: any) {
      console.error('Improve description error:', error);
      if (error.response?.status === 401) {
        Cookies.remove('token', { path: '/' });
        queryClient.setQueryData(['auth', 'me'], null);
        toast.error('Your session has expired. Please log in again.');
        router.push('/login');
        return;
      }
      toast.error(error.response?.data?.message || 'Failed to improve description. Please try again.');
    } finally {
      setIsImprovingDescription(false);
    }
  };

  // Helper function to validate MongoDB ObjectID
  const isValidObjectId = (id: string | undefined | null): boolean => {
    if (!id || typeof id !== 'string') return false;
    // MongoDB ObjectID is 24-character hex string
    return /^[a-fA-F0-9]{24}$/.test(id);
  };

  // Normalize condition to backend format: NEW, USED, LIKE_NEW, REFURBISHED
  const normalizeCondition = (val: string | undefined | null): string | null => {
    if (!val || typeof val !== 'string') return null;
    const v = val.trim().toUpperCase().replace(/-/g, '_');
    const map: Record<string, string> = {
      NEW: 'NEW', LIKE_NEW: 'LIKE_NEW', USED: 'USED', REFURBISHED: 'REFURBISHED',
      GOOD: 'USED', FAIR: 'USED', // map good/fair to USED
    };
    return map[v] || (['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'].includes(v) ? v : null);
  };

  // Normalize form data so price is always at root level (from data.price or data.attributes?.price)
  // Prevents "Price is missing after payment" when form data is stored/passed across async flows
  // Rejects object values (e.g. {}) and prefers attributes.price when root price is invalid
  const normalizeFormDataWithPrice = (data: any): any => {
    if (!data) return data;
    const isUsable = (v: any) =>
      typeof v === 'number' && !isNaN(v) && isFinite(v) ||
      (typeof v === 'string' && String(v).trim() !== '');
    const rootOk = isUsable(data.price);
    const attrsOk = isUsable(data.attributes?.price);
    const price = rootOk ? data.price : (attrsOk ? data.attributes.price : undefined);
    const hasPrice = price !== undefined && price !== null;
    if (!hasPrice) return { ...data, attributes: { ...data.attributes } };
    return { ...data, price, attributes: { ...data.attributes, price } };
  };

  const onSubmit = async (data: any) => {
    // Check authentication before submission
    if (!isAuthenticated || !user) {
      console.error('❌ User not authenticated, redirecting to login');
      toast.error('Please login to post an ad');
      router.push('/login');
      return;
    }
    setIsSubmittingForm(true);
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
    
    // Log form data for debugging (including location)
    console.log('📋 Form data:', {
      title: data.title?.substring(0, 50),
      description: data.description?.substring(0, 50),
      price: data.price,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      locationId: data.locationId,
      state: data.state,
      city: data.city,
      neighbourhood: data.neighbourhood,
      attributes: data.attributes,
      attributesKeys: data.attributes ? Object.keys(data.attributes) : [],
      attributesCount: data.attributes ? Object.keys(data.attributes).length : 0
    });

    // CRITICAL: Block submission if payment is required but not verified
    if (requiresPaymentBeforePosting && !isPaymentVerified) {
      setIsSubmittingForm(false);
      toast.error('Please complete payment before posting your ad');
      // Set payment required error data so modal can display
      setPaymentRequiredError({
        message: 'Please purchase a Business Package or Premium Options to continue posting ads.',
        freeAdsUsed: adLimitStatus?.freeAdsUsed || 0,
        freeAdsLimit: adLimitStatus?.freeAdsLimit || 2,
      });
      // Store form data for later use (normalize so price is always at root)
      setAdFormData(normalizeFormDataWithPrice({ ...data }));
      setShowPaymentRequiredModal(true);
      return;
    }

    // Check ad limit before proceeding - DISABLED (posting allowed without limit gate)
    // Only block if no premium features are selected AND user can't post
    if (false && adLimitStatus?.hasLimit && !adLimitStatus?.canPost && !hasPremiumFeatures) {
      setIsSubmittingForm(false);
      toast.error(adLimitStatus.message || 'You have reached your ad limit. Please select premium features to continue posting.');
      return;
    }

    if (images.length === 0) {
      setIsSubmittingForm(false);
      toast.error('Please upload at least one image');
      return;
    }

    // CRITICAL: Validate category/subcategory IDs BEFORE payment order creation
    // This prevents payment processing with invalid data
    if (!isValidObjectId(data.categoryId)) {
      setIsSubmittingForm(false);
      toast.error('Invalid category selected. Please refresh the page and select a valid category. Payment will not be processed.');
      console.error('❌ Invalid categoryId before payment:', data.categoryId);
      return;
    }

    // Subcategory is only required if the selected category has subcategories
    const categoryHasSubcategories = selectedCategory?.subcategories && selectedCategory.subcategories.length > 0;
    if (categoryHasSubcategories) {
      if (!data.subcategoryId || !isValidObjectId(data.subcategoryId)) {
      setIsSubmittingForm(false);
      toast.error('Invalid subcategory selected. Please select a valid subcategory. Payment will not be processed.');
      console.error('❌ Invalid subcategoryId before payment:', data.subcategoryId);
      return;
      }
    } else {
      // If category has no subcategories, clear subcategoryId
      data.subcategoryId = undefined;
      setValue('subcategoryId', '');
    }

    if (data.locationId && !isValidObjectId(data.locationId)) {
      setIsSubmittingForm(false);
      toast.error('Invalid location selected. Please select a valid location. Payment will not be processed.');
      console.error('❌ Invalid locationId before payment:', data.locationId);
      return;
    }

    // Check if payment is required (category posting price or premium features)
    if (requiresPayment) {
      console.log('💰 Payment required, creating payment order...');
      // Store form data (normalize so price is always at root; images from state)
      setAdFormData(normalizeFormDataWithPrice({ ...data }));
      
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
        onSettled: () => setIsSubmittingForm(false),
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
            const conditionValue = normalizeCondition(data.condition || data.attributes?.condition);
            if (conditionValue) formData.append('condition', conditionValue);
            formData.append('categoryId', data.categoryId);
            if (data.subcategoryId) formData.append('subcategoryId', data.subcategoryId);
            // Location fields - include all location data
            if (data.locationId) formData.append('locationId', data.locationId);
            formData.append('state', data.state || '');
            formData.append('city', data.city || locationQuery || '');
            if (data.neighbourhood) formData.append('neighbourhood', data.neighbourhood);
            if (data.exactLocation) formData.append('exactLocation', data.exactLocation);
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
              onSettled: () => setIsSubmittingForm(false),
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
          setPaymentOrder(response);
          // Directly open Razorpay checkout instead of showing payment modal popup
          // Pass form data to capture in closure (normalize so price is always at root)
          openRazorpayCheckout(response, normalizeFormDataWithPrice({ ...data, attributes: data.attributes || {} }));
        },
        onError: (error: any) => {
          console.error('❌ Payment order creation failed:', error);
          console.error('Error response:', error.response);
          console.error('Error data:', error.response?.data);
          
          const status = error.response?.status;
          const errorData = error.response?.data;
          
          // Handle 402 Payment Required
          if (status === 402) {
            console.log('💰 Payment required (402) in payment order creation - showing payment options modal');
            setPaymentRequiredError({
              message: errorData?.message || 'You have reached your free ad limit. Please purchase a Business Package or Premium Options to continue posting ads.',
              requiresPayment: true,
              freeAdsUsed: errorData?.freeAdsUsed || adLimitStatus?.freeAdsUsed || 0,
              freeAdsLimit: errorData?.freeAdsLimit || adLimitStatus?.freeAdsLimit || 2,
              businessAdsRemaining: errorData?.businessAdsRemaining || adLimitStatus?.businessAdsRemaining || 0,
              ...errorData
            });
            setShowPaymentRequiredModal(true);
            // Store form data for later use (normalize so price is always at root)
            setAdFormData(normalizeFormDataWithPrice({ 
              ...data,
              attributes: data.attributes || {},
              images: images
            }));
            toast.error(
              errorData?.message || 'You have reached your free ad limit. Please complete payment to post your ad.',
              { duration: 5000 }
            );
          } else {
            // Other errors
            toast.error(errorData?.message || 'Failed to create payment order. Please try again.', { duration: 5000 });
          }
        }
      });
      return;
    }

    // No premium features selected OR using business package slots, create ad directly
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    
    // Price can be in root level (data.price) or in attributes (data.attributes.price)
    // For mobile phones, price is in Product Specifications (attributes.price), so check both locations
    // Backend expects price at root level, so extract from attributes if needed
    let priceValue: any = data.price;
    
    // Helper: price is valid only if it's a number or non-empty string (reject objects like {})
    const isUsablePrice = (v: any) =>
      typeof v === 'number' && !isNaN(v) && isFinite(v) ||
      (typeof v === 'string' && String(v).trim() !== '');
    
    // Check attributes.price if root level price is not available, empty, or invalid (e.g. object)
    const rootPriceExists = isUsablePrice(priceValue);
    const attributesPriceExists = isUsablePrice(data.attributes?.price);
    
    if (!rootPriceExists && attributesPriceExists) {
      priceValue = data.attributes.price;
      console.log('💰 Using price from attributes:', priceValue);
    }
    
    // Log for debugging
    console.log('💰 Price extraction:', {
      dataPrice: data.price,
      attributesPrice: data.attributes?.price,
      finalPriceValue: priceValue,
      priceType: typeof priceValue,
      rootPriceExists,
      attributesPriceExists,
      allAttributes: data.attributes
    });
    
    // Check if price is missing (but allow 0 as valid)
    if (priceValue === undefined || priceValue === null || priceValue === '') {
      console.error('❌ Price is missing!', {
        dataPrice: data.price,
        attributesPrice: data.attributes?.price,
        allAttributes: data.attributes,
        formDataKeys: Array.from(formData.keys())
      });
      toast.error('Price is required. Please enter a price for your ad.');
      return;
    }
    
    // Reject object values (e.g. {} from malformed form state)
    if (typeof priceValue === 'object' && priceValue !== null) {
      console.error('❌ Price must be a number or string, not an object!', { priceValue });
      toast.error('Price is invalid. Please enter a numeric value (e.g., 10000) in the Price field.');
      return;
    }
    
    // Ensure price is a valid number (0 is valid)
    // Handle both number and string types
    let priceNum: number;
    if (typeof priceValue === 'number') {
      priceNum = priceValue;
    } else if (typeof priceValue === 'string') {
      // Remove any whitespace, commas, and currency symbols
      const trimmed = priceValue.trim().replace(/[,₹$]/g, '');
      if (trimmed === '') {
        console.error('❌ Price is empty string!');
        toast.error('Price is required. Please enter a price for your ad.');
        return;
      }
      priceNum = parseFloat(trimmed);
    } else {
      // Fallback: try to convert to string and parse (e.g. edge cases)
      const stringValue = String(priceValue).trim().replace(/[,₹$]/g, '');
      priceNum = parseFloat(stringValue);
    }
    
    if (isNaN(priceNum) || !isFinite(priceNum)) {
      console.error('❌ Invalid price value (NaN or Infinity)!', { 
        priceValue, 
        priceNum, 
        priceType: typeof priceValue,
        stringValue: String(priceValue),
        dataPrice: data.price,
        attributesPrice: data.attributes?.price
      });
      toast.error('Price must be a valid number. Please enter a numeric value (e.g., 10000).');
      return;
    }
    
    if (priceNum < 0) {
      console.error('❌ Invalid price value (negative)!', { priceValue, priceNum });
      toast.error('Price must be greater than or equal to 0.');
      return;
    }
    
    console.log('✅ Price validated and added to form:', { priceNum, priceString: String(priceNum) });
    formData.append('price', String(priceNum));
    if (data.originalPrice) {
      formData.append('originalPrice', data.originalPrice);
      // Calculate discount automatically using the extracted priceNum
      const discount = ((parseFloat(data.originalPrice) - priceNum) / parseFloat(data.originalPrice) * 100).toFixed(2);
      formData.append('discount', discount);
    }
    const conditionValue = normalizeCondition(data.condition || data.attributes?.condition);
    if (conditionValue) formData.append('condition', conditionValue);
    formData.append('categoryId', data.categoryId);
    if (data.subcategoryId) formData.append('subcategoryId', data.subcategoryId);
    // Location fields - include all location data
    if (data.locationId) formData.append('locationId', data.locationId);
    formData.append('state', data.state || '');
    formData.append('city', data.city || locationQuery || '');
    if (data.neighbourhood) formData.append('neighbourhood', data.neighbourhood);
    if (data.exactLocation) formData.append('exactLocation', data.exactLocation);
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
    // Clean attributes: remove empty strings and null values, and remove price (sent at root level)
    const cleanedAttributes: any = {};
    if (data.attributes) {
      Object.keys(data.attributes).forEach(key => {
        // Skip price field - it's sent at root level, not in attributes
        if (key === 'price') {
          return;
        }
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
      onSettled: () => setIsSubmittingForm(false),
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
        
        // Invalidate and refetch user ads so My Ads page shows the new ad
        queryClient.invalidateQueries({ queryKey: ['user', 'ads'] });
        queryClient.refetchQueries({ queryKey: ['user', 'ads'] });
        
        // Invalidate ad limit status
        queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
        queryClient.invalidateQueries({ queryKey: ['business-package', 'status'] });
        
        // Set the ad in cache for immediate access
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
            onSettled: () => setIsSubmittingForm(false),
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
        if (process.env.NODE_ENV === 'development') {
          const msg = error.response?.data?.message || error.message;
          const status = error.response?.status;
          console.warn('Ad creation failed:', status != null ? `${status}` : '', msg);
        }
        const errorData = error.response?.data;
        const status = error.response?.status;
        
        // Handle 402 Payment Required - Free ads limit reached
        if (status === 402) {
          console.log('💰 Payment required (402) - showing payment options modal');
          console.log('📝 Error data:', errorData);
          console.log('📝 Storing form data:', data);
          
          // Set payment required error with proper message
          setPaymentRequiredError({
            message: errorData?.message || 'You have reached your free ad limit. Please purchase a Business Package or Premium Options to continue posting ads.',
            requiresPayment: true,
            freeAdsUsed: errorData?.freeAdsUsed || adLimitStatus?.freeAdsUsed || 0,
            freeAdsLimit: errorData?.freeAdsLimit || adLimitStatus?.freeAdsLimit || 2,
            businessAdsRemaining: errorData?.businessAdsRemaining || adLimitStatus?.businessAdsRemaining || 0,
            ...errorData
          });
          
          // Show payment modal
          setShowPaymentRequiredModal(true);
          
          // Store form data for later use (normalize so price is always at root)
          setAdFormData(normalizeFormDataWithPrice({ 
            ...data,
            attributes: data.attributes || {},
            images: images // Store image references
          }));
          
          // Show user-friendly toast message
          toast.error(
            errorData?.message || 'You have reached your free ad limit. Please complete payment to post your ad.',
            { duration: 5000 }
          );
          return;
        }
        
        // Handle validation errors
        if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          const validationErrors = errorData.errors.map((err: any) => err.msg || err.message).join(', ');
          toast.error(`Validation failed: ${validationErrors}`, { duration: 5000 });
        } else {
          const errorMessage = errorData?.message || errorData?.error || 'Failed to create ad. Please try again.';
          toast.error(errorMessage, { duration: 5000 });
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

    // CRITICAL: Validate category/subcategory/location IDs BEFORE creating ad
    // This prevents ad creation failure after payment has been processed
    if (!isValidObjectId(currentFormData.categoryId)) {
      console.error('❌ Invalid categoryId after payment:', currentFormData.categoryId);
      toast.error('Invalid category selected. Payment was processed but ad creation failed. Please contact support for refund.');
      return;
    }

    // Subcategory is only required if the selected category has subcategories
    const categoryHasSubcategories = selectedCategory?.subcategories && selectedCategory.subcategories.length > 0;
    if (categoryHasSubcategories) {
      if (!currentFormData.subcategoryId || !isValidObjectId(currentFormData.subcategoryId)) {
        console.error('❌ Invalid subcategoryId after payment:', currentFormData.subcategoryId);
        toast.error('Invalid subcategory selected. Payment was processed but ad creation failed. Please contact support for refund.');
        return;
      }
    } else {
      // If category has no subcategories, ensure subcategoryId is not set
      currentFormData.subcategoryId = undefined;
    }

    if (currentFormData.locationId && !isValidObjectId(currentFormData.locationId)) {
      console.error('❌ Invalid locationId after payment:', currentFormData.locationId);
      toast.error('Invalid location selected. Payment was processed but ad creation failed. Please contact support for refund.');
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
          
          // Price extraction - same logic as regular form submission
          // Price can be in root level (currentFormData.price) or in attributes (currentFormData.attributes.price)
          // For mobile phones, price is in Product Specifications (attributes.price), so check both locations
          let priceValue: any = currentFormData.price;
          
          const isUsablePricePostPay = (v: any) =>
            typeof v === 'number' && !isNaN(v) && isFinite(v) ||
            (typeof v === 'string' && String(v).trim() !== '');
          const rootPriceExistsPostPay = isUsablePricePostPay(priceValue);
          const attributesPriceExistsPostPay = isUsablePricePostPay(currentFormData.attributes?.price);
          
          if (!rootPriceExistsPostPay && attributesPriceExistsPostPay) {
            priceValue = currentFormData.attributes.price;
            console.log('💰 Using price from attributes after payment:', priceValue);
          }
          
          // Log for debugging
          console.log('💰 Price extraction after payment:', {
            dataPrice: currentFormData.price,
            attributesPrice: currentFormData.attributes?.price,
            finalPriceValue: priceValue,
            priceType: typeof priceValue,
            rootPriceExistsPostPay,
            attributesPriceExistsPostPay
          });
          
          // Check if price is missing (but allow 0 as valid)
          if (priceValue === undefined || priceValue === null || priceValue === '') {
            console.error('❌ Price is missing after payment!', {
              dataPrice: currentFormData.price,
              attributesPrice: currentFormData.attributes?.price,
              allAttributes: currentFormData.attributes
            });
            toast.error('Price is required. Please contact support.');
            return;
          }
          
          // Reject object values (e.g. {} from malformed form state)
          if (typeof priceValue === 'object' && priceValue !== null) {
            console.error('❌ Price must be a number or string, not an object (after payment)!', { priceValue });
            toast.error('Price is invalid. Please contact support.');
            return;
          }
          
          // Ensure price is a valid number (0 is valid)
          let priceNum: number;
          if (typeof priceValue === 'number') {
            priceNum = priceValue;
          } else if (typeof priceValue === 'string') {
            const trimmed = priceValue.trim().replace(/[,₹$]/g, '');
            if (trimmed === '') {
              console.error('❌ Price is empty string after payment!');
              toast.error('Price is required. Please contact support.');
              return;
            }
            priceNum = parseFloat(trimmed);
          } else {
            priceNum = parseFloat(String(priceValue).trim().replace(/[,₹$]/g, ''));
          }
          
          if (isNaN(priceNum) || !isFinite(priceNum)) {
            console.error('❌ Invalid price value (NaN or Infinity) after payment!', { 
              priceValue, 
              priceNum, 
              priceType: typeof priceValue
            });
            toast.error('Price must be a valid number. Please contact support.');
            return;
          }
          
          if (priceNum < 0) {
            console.error('❌ Invalid price value (negative) after payment!', { priceValue, priceNum });
            toast.error('Price must be greater than or equal to 0. Please contact support.');
            return;
          }
          
          console.log('✅ Price validated and added to form after payment:', { priceNum, priceString: String(priceNum) });
          formData.append('price', String(priceNum));
          
          if (currentFormData.originalPrice) formData.append('originalPrice', currentFormData.originalPrice);
          if (currentFormData.discount) formData.append('discount', currentFormData.discount);
          const condVal = normalizeCondition(currentFormData.condition || currentFormData.attributes?.condition);
          if (condVal) formData.append('condition', condVal);
          formData.append('categoryId', currentFormData.categoryId);
          if (currentFormData.subcategoryId) formData.append('subcategoryId', currentFormData.subcategoryId);
          // Location fields - include all location data
          if (currentFormData.locationId) formData.append('locationId', currentFormData.locationId);
          formData.append('state', currentFormData.state || '');
          formData.append('city', currentFormData.city || locationQuery || '');
          if (currentFormData.neighbourhood) formData.append('neighbourhood', currentFormData.neighbourhood);
          if (currentFormData.exactLocation) formData.append('exactLocation', currentFormData.exactLocation);
          formData.append('showPhone', String(showPhoneInAds));
          formData.append('paymentOrderId', currentOrder.razorpayOrder.id);
          
          // IMPORTANT: Add premium features to formData so backend detects it as premium ad
          // This prevents quota check when payment order exists
          if (selectedPremium) {
            formData.append('premiumType', selectedPremium);
            console.log('⭐ Adding premiumType to formData after payment:', selectedPremium);
          }
          
          // Add attributes if they exist (but remove price from attributes since it's sent at root level)
          if (currentFormData.attributes && Object.keys(currentFormData.attributes).length > 0) {
            const cleanedAttributes: any = {};
            Object.keys(currentFormData.attributes).forEach(key => {
              // Skip price field - it's sent at root level, not in attributes
              if (key === 'price') {
                return;
              }
              const value = currentFormData.attributes[key];
              // Only include non-empty values
              if (value !== null && value !== undefined && value !== '') {
                cleanedAttributes[key] = value;
              }
            });
            
            if (Object.keys(cleanedAttributes).length > 0) {
              formData.append('attributes', JSON.stringify(cleanedAttributes));
            }
          }

          // Add specifications if they exist (for new ads)
          if (currentFormData._specifications && Array.isArray(currentFormData._specifications) && currentFormData._specifications.length > 0) {
            formData.append('specifications', JSON.stringify(currentFormData._specifications));
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
            onSettled: () => setIsSubmittingForm(false),
            onSuccess: (data) => {
              console.log('✅ Ad created successfully:', data);
              toast.success('Ad posted successfully! Redirecting to My Ads...');
              // Invalidate ad limit status to refresh it after ad creation
              queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
              queryClient.invalidateQueries({ queryKey: ['business-package', 'status'] });
              // Redirect to My Ads - use window.location for reliable navigation after payment
              setTimeout(() => {
                console.log('🔄 Redirecting to /my-ads');
                if (typeof window !== 'undefined') {
                  window.location.href = '/my-ads';
                } else {
                  router.push('/my-ads');
                }
              }, 800);
            },
            onError: (error: any) => {
              const errorData = error.response?.data;
              if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
                const validationErrors = errorData.errors.map((err: any) => err.msg || err.message).join(', ');
                toast.error(`Validation failed: ${validationErrors}`, { duration: 5000 });
              } else {
                toast.error(errorData?.message || 'Failed to create ad. Please contact support.');
              }
            },
          });
        },
        onError: (error: any) => {
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
          name: 'Sell Box',
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
    return <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  // Show loading skeleton while categories are being fetched
  if (categoriesLoading) {
    return <CategorySkeleton />;
  }

  // FIX: Don't block entire UI - allow form to render so autocomplete can initialize
  // Location input must always render (not dependent on adLimitStatus)
  // Only disable submit button when adLimitStatus is not ready
  const canSubmit = !isLoadingAdLimit && adLimitStatus !== null;

  // Calculate form completion percentage
  const calculateCompletion = () => {
    let completed = 0;
    const total = 7;
    
    if (watch('title')) completed++;
    if (watch('description')) completed++;
    if (watch('categoryId')) completed++;
    if (images.length > 0) completed++;
    if (watch('price') || watch('attributes.price')) completed++;
    if (watch('state') && watch('city')) completed++;
    if (selectedCategory) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const completionPercentage = calculateCompletion();

  return (
    <div id="post-ad-page" className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Post your ad</h1>
          <p className="text-gray-600">Fill in the details below to reach thousands of buyers.</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-6">

        {/* Loading indicator for ad limits (non-blocking) */}
        {isLoadingAdLimit && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">Loading ad limits...</p>
          </div>
        )}

        {/* Ad Limit Alert - Only when limit reached AND user has no active business package (business ullapol "Free ad limit reached" kanikkaruthu) */}
        {!isLoadingAdLimit && adLimitStatus?.hasLimit && !adLimitStatus?.canPost && !isAdLimitAlertDismissed && !hasActiveBusinessPackage && (
          <AdLimitAlert
            packageName={adLimitStatus.packageName || 'Business Package'}
            maxAds={adLimitStatus.maxAds || 0}
            currentAds={adLimitStatus.currentAds || 0}
            message={adLimitStatus.blockReason || adLimitStatus.message || 'You have reached your ad limit.'}
            extraAdSlots={adLimitStatus.extraAdSlots || 0}
            totalAllowedAds={adLimitStatus.totalAllowedAds}
            onDismiss={() => setIsAdLimitAlertDismissed(true)}
            dismissible={true}
          />
        )}

        {/* Package Exhausted Alert - when business package slots used; show message + Upgrade + Post with single buy options */}
        {!isLoadingAdLimit && hasActiveBusinessPackage && !hasAdsRemaining && !adLimitStatus?.canPost && !isAdLimitAlertDismissed && (
          <div className="mb-6 p-6 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl shadow-lg relative">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FiAlertCircle className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-orange-900 mb-2">Package Exhausted</h3>
                <p className="text-orange-800 mb-4 leading-relaxed">
                  {adLimitStatus?.blockReason || adLimitStatus?.message || 'Package exhausted. Upgrade or post with single buy.'}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/business-package"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
                  >
                    <FiBriefcase className="w-5 h-5" />
                    Upgrade Package
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const premiumSection = document.querySelector('[data-premium-section]');
                      if (premiumSection) {
                        premiumSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        (premiumSection as HTMLElement).classList.add('ring-4', 'ring-amber-400');
                        setTimeout(() => (premiumSection as HTMLElement).classList.remove('ring-4', 'ring-amber-400'), 3000);
                      }
                    }}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-amber-600 hover:to-primary-700 transition-all shadow-md"
                  >
                    <FiStar className="w-5 h-5" />
                    Post with Single Buy
                  </button>
                </div>
              </div>
              <button
                onClick={() => setIsAdLimitAlertDismissed(true)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1.5"
                aria-label="Dismiss"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>
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
                <FiFlag className="w-5 h-5 text-primary-600" />
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
                <FiBriefcase className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 uppercase">BUSINESS PACKAGE</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-3xl font-bold ${adLimitStatus.businessAdsRemaining > 0 ? 'text-green-600' : 'text-primary-600'}`}>
                  {adLimitStatus.businessAdsRemaining || 0}
                </span>
                <span className="text-lg text-gray-500">/</span>
                <span className="text-lg text-gray-600 font-medium">
                  {adLimitStatus.packages?.reduce((sum: number, pkg: any) => sum + (pkg.totalAds || pkg.totalAdsAllowed || 0), 0) || 0}
                </span>
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Promotions available
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
                            <span className="px-1.5 py-0.5 bg-primary-700 text-white text-xs rounded font-bold">
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
            <FiInfo className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
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
              className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              View Packages
            </Link>
          )}
        </div>
        )}

        {/* Info Banner - When no ads available - HIDDEN (posting allowed without payment gate) */}
        {false && !isLoadingAdLimit && adLimitStatus && adLimitStatus.totalRemaining === 0 && !shouldHidePaymentOptions && (
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

            <form 
              onSubmit={handleSubmit(onSubmit)} 
              className="space-y-6"
            >
              {/* Step 1: Category Details – Category & Subcategory side by side */}
              <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600" aria-hidden>
                    <FiLayers className="w-4 h-4" />
                  </span>
                  Category Details
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Category Dropdown */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('categoryId', { required: 'Category is required' })}
                      className={`w-full pl-4 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white appearance-none cursor-pointer ${
                        errors.categoryId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      } ${aiFilledFields.includes('category') ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}
                      onChange={(e) => {
                        const newCategoryId = e.target.value;
                        setValue('categoryId', newCategoryId, { shouldValidate: true });
                        setValue('subcategoryId', '', { shouldValidate: false });
                        clearErrors('subcategoryId');
                        trigger('categoryId');
                      }}
                      value={selectedCategoryId || ''}
                      disabled={categoriesLoading}
                    >
                      <option value="">
                        {categoriesLoading ? 'Loading...' : 'Select Category'}
                      </option>
                      {!categoriesLoading && !categoriesError && displayCategories && displayCategories.length > 0 &&
                        displayCategories
                          .filter((cat: any) => !(cat.categoryId || cat.category_id))
                          .map((cat: any, index: number) => {
                            const categoryId = cat.id || cat._id || `cat-${index}`;
                            const categoryName = cat.name || `Category ${index + 1}`;
                            return (
                              <option key={categoryId} value={categoryId}>
                                {categoryName}
                              </option>
                            );
                          })}
                      {categoriesError && <option value="" disabled>Error loading categories</option>}
                      {!categoriesLoading && !categoriesError && (!displayCategories || displayCategories.length === 0) && (
                        <option value="" disabled>No categories available</option>
                      )}
                    </select>
                    <FiChevronDown className="absolute right-3 top-[2.6rem] w-5 h-5 text-gray-500 pointer-events-none" aria-hidden />
                    {errors.categoryId && (
                      <p className="text-red-500 text-sm mt-1">{errors.categoryId.message as string}</p>
                    )}
                  </div>

                  {/* Subcategory Dropdown – always visible, disabled when no category */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('subcategoryId', {
                        required:
                          selectedCategory?.subcategories && selectedCategory.subcategories.length > 0
                            ? 'Subcategory is required'
                            : false,
                      })}
                      className={`w-full pl-4 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white appearance-none ${
                        !selectedCategory ? 'cursor-not-allowed bg-gray-50' : 'cursor-pointer'
                      } ${
                        errors.subcategoryId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      } ${aiFilledFields.includes('subcategory') ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}
                      onChange={(e) => {
                        setValue('subcategoryId', e.target.value, { shouldValidate: true });
                        trigger('subcategoryId');
                      }}
                      value={selectedSubcategoryId || ''}
                      disabled={!selectedCategory || (selectedCategory.subcategories && selectedCategory.subcategories.length === 0)}
                    >
                      <option value="">
                        {!selectedCategory
                          ? 'Select category first'
                          : !selectedCategory.subcategories || selectedCategory.subcategories.length === 0
                            ? 'No subcategories'
                            : 'Select Subcategory'}
                      </option>
                      {selectedCategory?.subcategories?.map((sub: any, index: number) => {
                        const subcategoryId = sub.id || sub._id || `sub-${index}`;
                        return (
                          <option key={subcategoryId} value={subcategoryId}>
                            {sub.name || `Subcategory ${index + 1}`}
                          </option>
                        );
                      })}
                    </select>
                    <FiChevronDown className="absolute right-3 top-[2.6rem] w-5 h-5 text-gray-500 pointer-events-none" aria-hidden />
                    {errors.subcategoryId && (
                      <p className="text-red-500 text-sm mt-1">{errors.subcategoryId.message as string}</p>
                    )}
                  </div>
                </div>

                {selectedCategory && (!selectedCategory.subcategories || selectedCategory.subcategories.length === 0) && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-700 text-sm">
                      This category has no subcategories. You can proceed with just the category selection.
                    </p>
                  </div>
                )}
              </div>

              {/* Step 2: Ad Details - Title, Description, Condition, Location */}
              <div id="post-ad-step-2" className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600" aria-hidden>
                    <FiFileText className="w-4 h-4" />
                  </span>
                  <span className="text-primary-600 font-bold">2.</span> Ad Details
                </h2>
                <div className="space-y-5">
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
                      onBlur={() => {
                        const currentDesc = (description || '').toString().trim();
                        if (currentDesc.length > 0) return;
                        if (aiFilledFields.includes('description')) return;

                        const brand = attributes?.brand ?? attributes?.Brand ?? null;
                        const model = attributes?.model ?? attributes?.Model ?? null;

                        const generated = generateSeoDescriptionTemplate({
                          title,
                          categoryName: selectedCategory?.name,
                          categorySlug: selectedCategory?.slug,
                          brand: typeof brand === 'string' ? brand : null,
                          model: typeof model === 'string' ? model : null,
                          condition,
                          city,
                          state,
                        });

                        if (generated) {
                          setValue('description', generated, { shouldDirty: true });
                          clearErrors('description');
                          setAiFilledFields((prev) =>
                            prev.includes('description') ? prev : [...prev, 'description']
                          );
                        }
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        errors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      } ${aiFilledFields.includes('title') ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}
                      placeholder="e.g. 2022 Tesla Model 3 Long Range"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      A good title should include Brand, Model, and Key Feature
                    </p>
                    {errors.title && (
                      <p className="text-red-500 text-sm mt-1">{errors.title.message as string}</p>
                    )}
                  </div>

                  {/* Product Specifications - Moved here from Step 3 */}
                  {selectedCategory && (selectedCategory.slug || selectedCategory.name) && (
                    <div className="border-t border-gray-200 pt-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Product Specifications
                      </h3>
                      {selectedSubcategory && (selectedSubcategory.slug || selectedSubcategory.name) ? (
                        <DynamicSpecifications
                          categorySlug={
                            (() => {
                              const catSlug = (selectedCategory.slug || (selectedCategory.name || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '').toLowerCase();
                              const subSlug = (selectedSubcategory.slug || (selectedSubcategory.name || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '').toLowerCase();
                              if (catSlug === 'mobiles') return 'mobiles';
                              if (catSlug === 'electronics' && subSlug === 'mobile-phones') return 'mobiles';
                              if (catSlug === 'electronics' && ['tablets', 'accessories', 'smart-watches'].includes(subSlug)) return 'mobiles';
                              if (catSlug === 'electronics' && ['laptops', 'tvs', 'cameras', 'home-appliances', 'kitchen-appliances'].includes(subSlug)) return 'electronics-appliances';
                              return catSlug || selectedCategory.slug || 'vehicles';
                            })()
                          }
                          subcategorySlug={(selectedSubcategory.slug || (selectedSubcategory.name || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '').toLowerCase()}
                          register={register}
                          watch={watch}
                          setValue={setValue}
                          errors={errors}
                          aiPriceSuggestion={aiPriceSuggestion}
                          onApplySuggestedPrice={() => {
                            setAiFilledFields((prev) =>
                              prev.includes('price') ? prev : [...prev, 'price']
                            );
                          }}
                        />
                      ) : (
                        <DynamicSpecifications
                          categorySlug={(selectedCategory.slug || (selectedCategory.name || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '').toLowerCase()}
                          subcategorySlug={(selectedCategory.slug || (selectedCategory.name || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '').toLowerCase()}
                          register={register}
                          watch={watch}
                          setValue={setValue}
                          errors={errors}
                          aiPriceSuggestion={aiPriceSuggestion}
                          onApplySuggestedPrice={() => {
                            setAiFilledFields((prev) =>
                              prev.includes('price') ? prev : [...prev, 'price']
                            );
                          }}
                        />
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
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
                      className={`w-full px-4 py-3 border rounded-b-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${
                        errors.description ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      } ${aiFilledFields.includes('description') ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}
                      placeholder="Describe what you are selling. Be as detailed as possible."
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-500">SUPPORTED FORMATS: Plain text</p>
                      <p className="text-xs text-gray-500">{(watch('description')?.length || 0)}/5000</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        type="button"
                        onClick={generateDescription}
                        disabled={isGeneratingDescription || !title}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500 transition-colors shadow-sm"
                      >
                        <FiZap className={`w-4 h-4 shrink-0 ${isGeneratingDescription ? 'animate-pulse' : ''}`} />
                        <span>{isGeneratingDescription ? 'Generating...' : 'AI Text Generator'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={improveDescription}
                        disabled={isImprovingDescription || !description?.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiRefreshCw className={`w-4 h-4 shrink-0 ${isImprovingDescription ? 'animate-spin' : ''}`} />
                        <span>{isImprovingDescription ? 'Improving...' : 'Text Improve'}</span>
                      </button>
                    </div>
                    {errors.description && (
                      <p className="text-red-500 text-sm mt-1">{errors.description.message as string}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition
                    </label>
                    <select
                      {...register('condition')}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white ${
                        errors.condition ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select condition</option>
                      <option value="NEW">New</option>
                      <option value="LIKE_NEW">Like New</option>
                      <option value="USED">Used</option>
                      <option value="REFURBISHED">Refurbished</option>
                    </select>
                  </div>

                  {/* Location - inline in Basic Info */}
                  <div>
                    <input type="hidden" {...register('locationId')} />
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1" ref={locationDropdownRef}>
                        <div className="relative">
                          {googlePlacesLoaded ? (
                            isFirefox ? (
                              <div className="relative">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                                <PlaceAutocompleteInputFirefox
                                  visible
                                  placeholder="Search city or area"
                                  value={locationQuery}
                                  onPlaceSelect={handlePlaceSelect}
                                  includedRegionCodes={['in']}
                                  includedPrimaryTypes={['geocode', 'establishment']}
                                  className="w-full [&_input]:pl-11 [&_input]:pr-4 [&_input]:py-3 [&_input]:rounded-xl [&_input]:border [&_input]:border-gray-300 [&_input]:bg-white [&_input]:shadow-sm [&_input]:ring-1 [&_input]:ring-black/5 [&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-primary-500"
                                />
                              </div>
                            ) : (
                              <div
                                ref={locationAutocompleteContainerRef}
                                className="w-full [&>gmp-place-autocomplete]:w-full [&>gmp-place-autocomplete]:rounded-xl [&>gmp-place-autocomplete]:border [&>gmp-place-autocomplete]:border-gray-300 [&>gmp-place-autocomplete]:pl-11 [&>gmp-place-autocomplete]:pr-4 [&>gmp-place-autocomplete]:py-3 [&>gmp-place-autocomplete]:bg-white [&>gmp-place-autocomplete]:shadow-sm [&>gmp-place-autocomplete]:ring-1 [&>gmp-place-autocomplete]:ring-black/5"
                              />
                            )
                          ) : (
                            <>
                              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                              <input
                                id="location-input"
                                type="text"
                                autoComplete="off"
                                value={locationQuery}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  lastSelectedLocationQueryRef.current = null;
                                  setLocationQuery(value);
                                }}
                                onKeyDown={handleLocationKeyDown}
                                onFocus={() => {
                                  if (locationQuery.trim().length >= 2) setShowLocationDropdown(true);
                                }}
                                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl bg-white shadow-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Search city or area"
                              />
                            </>
                          )}
                          {!googlePlacesLoaded && showLocationDropdown && (locationSuggestions.length > 0 || isLoadingLocations) && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto">
                              {isLoadingLocations ? (
                                <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                              ) : (
                                <ul className="py-1">
                                  {locationSuggestions.map((loc: any, idx: number) => {
                                    const name = loc.name || loc.city || '';
                                    const display = loc.neighbourhood
                                      ? `${loc.neighbourhood}, ${loc.city || ''}${loc.state ? `, ${loc.state}` : ''}`.trim()
                                      : loc.city
                                        ? `${loc.city}${loc.state ? `, ${loc.state}` : ''}`
                                        : name;
                                    return (
                                      <li key={loc.id || idx}>
                                        <button
                                          type="button"
                                          onClick={() => handleLocationSelect(loc)}
                                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-orange-50 flex items-center gap-2 ${
                                            selectedLocationIndex === idx ? 'bg-orange-50' : ''
                                          }`}
                                        >
                                          <FiMapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                          <span className="truncate">{display || name}</span>
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                        {autoLocationMessage && (watch('city') || watch('state')) && (
                          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                            <FiCheckCircle className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-amber-900 leading-snug">{autoLocationMessage}</p>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={detectLocation}
                        disabled={isDetectingLocation}
                        className="shrink-0 px-4 py-3 rounded-xl transition-colors border flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed bg-primary-600 hover:bg-primary-700 border-primary-600 text-white shadow-sm"
                        title="Auto-detect your location"
                      >
                        {isDetectingLocation ? (
                          <span className="animate-spin inline-block w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full" />
                        ) : (
                          <FiNavigation className="w-5 h-5 text-white" />
                        )}
                        <span className="text-sm font-semibold hidden sm:inline">Detect</span>
                      </button>
                    </div>
                    {mapCoordinates && typeof mapCoordinates.lat === 'number' && typeof mapCoordinates.lng === 'number' && !isNaN(mapCoordinates.lat) && !isNaN(mapCoordinates.lng) ? (
                      <div className="relative h-48 rounded-lg overflow-hidden border border-gray-200 mt-4">
                        <div ref={mapRef} className="w-full h-full" style={{ minHeight: '200px' }} />
                      </div>
                    ) : (
                      <div className="h-48 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center mt-4">
                        <div className="text-center">
                          <FiMapPin className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Map will appear when location is selected</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Product Specifications - MOVED to Step 2 (below title) */}
              {/* Specifications now appear inline in Ad Details section */}
              
              {/* Legacy Hardcoded Specifications - Keep for backward compatibility (hidden) */}
              {false && selectedCategory && selectedSubcategory && (
                <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200 hidden">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Specifications (Legacy)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Brand and Model Fields - Show for any category/subcategory with brands-models data */}
                    {hasBrandsModels && (
                      <>
                        {/* Brand Dropdown with Autocomplete */}
                        {(
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
                                  borderColor: (errors.attributes as any)?.brand ? '#ef4444' : '#d1d5db',
                                  '&:hover': {
                                    borderColor: (errors.attributes as any)?.brand ? '#ef4444' : '#9ca3af'
                                  }
                                })
                              }}
                            />
                            {(errors.attributes as any)?.brand && (
                              <p className="text-red-500 text-sm mt-1">
                                {((errors.attributes as any).brand as any)?.message || 'Brand is required'}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Model Dropdown with Autocomplete - Show after brand is selected */}
                        {hasBrandsModels && selectedBrandFromForm && (
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
                                  borderColor: (errors.attributes as any)?.model ? '#ef4444' : '#d1d5db',
                                  '&:hover': {
                                    borderColor: (errors.attributes as any)?.model ? '#ef4444' : '#9ca3af'
                                  }
                                })
                              }}
                            />
                            {(errors.attributes as any)?.model && (
                              <p className="text-red-500 text-sm mt-1">
                                {((errors.attributes as any).model as any)?.message || 'Model is required'}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Mobile Phones Specific Fields (Color, Storage) */}
                    {isMobilePhones && (
                      <>
                        {/* Color Dropdown with Autocomplete */}
                        {(
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
                                  borderColor: (errors.attributes as any)?.color ? '#ef4444' : '#d1d5db',
                                  '&:hover': {
                                    borderColor: (errors.attributes as any)?.color ? '#ef4444' : '#9ca3af'
                                  }
                                })
                              }}
                            />
                            {(errors.attributes as any)?.color && (
                              <p className="text-red-500 text-sm mt-1">
                                {((errors.attributes as any).color as any)?.message || 'Invalid color'}
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
                                  borderColor: (errors.attributes as any)?.storage ? '#ef4444' : '#d1d5db',
                                  '&:hover': {
                                    borderColor: (errors.attributes as any)?.storage ? '#ef4444' : '#9ca3af'
                                  }
                                })
                              }}
                            />
                            {(errors.attributes as any)?.storage && (
                              <p className="text-red-500 text-sm mt-1">
                                {((errors.attributes as any).storage as any)?.message || 'Invalid storage'}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Price field is now handled by DynamicSpecifications component in Product Specifications section */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Warranty</label>
                          <select
                            {...register('attributes.warranty')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                          <input
                            type="text"
                            {...register('attributes.price_range')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. ₹5,000 - ₹10,000"
                          />
                        </div>
                      </>
                    )}

                    {/* Vehicles Category Fields - DISABLED: Now using DynamicSpecifications */}
                    {false && selectedCategory && (selectedCategory?.slug === 'vehicles' || selectedCategory?.name?.toLowerCase().includes('vehicle') || selectedCategory?.name?.toLowerCase().includes('car') || selectedCategory?.name?.toLowerCase().includes('bike')) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                          <input
                            type="text"
                            {...register('attributes.brand')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Maruti, Honda, Toyota"
                          />
                      </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                          <input
                            type="text"
                            {...register('attributes.model')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Swift, City, Innova"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                          <input
                            type="number"
                            {...register('attributes.year')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. 2020"
                            min="1900"
                            max={new Date().getFullYear() + 1}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Type</label>
                          <select
                            {...register('attributes.fuel_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. 50000"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Owner Type</label>
                          <select
                            {...register('attributes.owner_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. White, Black, Red"
                          />
                        </div>
                      </>
                    )}

                    {/* Properties Category Fields - DISABLED: Now using DynamicSpecifications */}
                    {false && selectedCategory && (() => {
                      const cat = selectedCategory;
                      return (cat?.slug === 'properties' || cat?.name?.toLowerCase().includes('property') || cat?.name?.toLowerCase().includes('real estate') || cat?.name?.toLowerCase().includes('house'));
                    })() && (
                      <>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                          <select
                            {...register('attributes.property_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. 1200"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                          <select
                            {...register('attributes.bedrooms')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. ₹50,00,000 - ₹1,00,00,000"
                          />
                        </div>
                      </>
                    )}

                    {/* Home & Furniture Category Fields - DISABLED: Now using DynamicSpecifications */}
                    {false && selectedCategory && (() => {
                      const cat = selectedCategory;
                      return (cat?.slug === 'home-furniture' || cat?.slug === 'home' || cat?.name?.toLowerCase().includes('home') || cat?.name?.toLowerCase().includes('furniture'));
                    })() && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                          <input
                            type="text"
                            {...register('attributes.material')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Wood, Metal, Plastic"
                          />
                      </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                          <input
                            type="text"
                            {...register('attributes.brand')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. IKEA, Godrej"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                          <select
                            {...register('attributes.condition')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Brown, White, Black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions</label>
                          <input
                            type="text"
                            {...register('attributes.dimensions')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. 120cm x 60cm x 75cm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Assembly Required</label>
                          <select
                            {...register('attributes.assembly_required')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. ₹5,000 - ₹20,000"
                          />
                        </div>
                      </>
                    )}

                    {/* Fashion Category Fields */}
                    {selectedCategory && (() => {
                      const cat = selectedCategory;
                      return (cat?.slug === 'fashion' || cat?.name?.toLowerCase().includes('fashion') || cat?.name?.toLowerCase().includes('clothing') || cat?.name?.toLowerCase().includes('apparel'));
                    })() && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                          <input
                            type="text"
                            {...register('attributes.brand')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Zara, H&M, Levi's"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                          <input
                            type="text"
                            {...register('attributes.size')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. S, M, L, XL, 32, 36"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                          <input
                            type="text"
                            {...register('attributes.color')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Red, Blue, Black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                          <select
                            {...register('attributes.gender')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Cotton, Polyester, Denim"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Fit Type</label>
                          <select
                            {...register('attributes.fit_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. ₹500 - ₹5,000"
                          />
                        </div>
                      </>
                    )}

                    {/* Books, Sports & Hobbies Category Fields */}
                    {selectedCategory && (() => {
                      const cat = selectedCategory;
                      return (cat?.slug === 'books' || cat?.slug === 'sports' || cat?.slug === 'hobbies' || cat?.name?.toLowerCase().includes('book') || cat?.name?.toLowerCase().includes('sport') || cat?.name?.toLowerCase().includes('hobby'));
                    })() && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Category Type</label>
                          <input
                            type="text"
                            {...register('attributes.category_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Fiction, Sports Equipment, Musical Instrument"
                          />
                    </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                          <input
                            type="text"
                            {...register('attributes.brand')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Nike, Adidas, Penguin"
                          />
                  </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Author / Maker</label>
                          <input
                            type="text"
                            {...register('attributes.author_maker')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. J.K. Rowling, Company Name"
                          />
                </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                          <select
                            {...register('attributes.language')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. ₹100 - ₹5,000"
                          />
                        </div>
                      </>
                    )}

                    {/* Pets Category Fields */}
                    {selectedCategory && (() => {
                      const cat = selectedCategory;
                      return (cat?.slug === 'pets' || cat?.name?.toLowerCase().includes('pet') || cat?.name?.toLowerCase().includes('animal'));
                    })() && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Breed</label>
                          <input
                            type="text"
                            {...register('attributes.breed')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Golden Retriever, Persian Cat"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                          <input
                            type="text"
                            {...register('attributes.age')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. 2 months, 1 year"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                          <select
                            {...register('attributes.gender')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Golden, Black, White"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                          <input
                            type="text"
                            {...register('attributes.price_range')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. ₹5,000 - ₹50,000"
                          />
                        </div>
                      </>
                    )}

                    {/* Services Category Fields */}
                    {selectedCategory && (() => {
                      const cat = selectedCategory;
                      return (cat?.slug === 'services' || cat?.name?.toLowerCase().includes('service'));
                    })() && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                          <input
                            type="text"
                            {...register('attributes.service_type')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Plumbing, Electrician, Tutor"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                          <select
                            {...register('attributes.experience_level')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. City, Area"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                          <input
                            type="text"
                            {...register('attributes.price_range')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. ₹500 - ₹5,000 per hour"
                          />
                        </div>
                      </>
                    )}

                    {/* Jobs Category Fields */}
                    {selectedCategory && (() => {
                      const cat = selectedCategory;
                      return (cat?.slug === 'jobs' || cat?.name?.toLowerCase().includes('job') || cat?.name?.toLowerCase().includes('career'));
                    })() && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Job Role</label>
                          <input
                            type="text"
                            {...register('attributes.job_role')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Software Developer, Sales Executive"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                          <select
                            {...register('attributes.experience_level')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. B.Tech, MBA, Diploma"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Salary Range</label>
                          <input
                            type="text"
                            {...register('attributes.salary_range')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. ₹20,000 - ₹50,000 per month"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                          <input
                            type="text"
                            {...register('attributes.location')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. City, Area"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: Business Package Status (only if active) OR Premium Features (only if no active package) */}
              {(hasActiveBusinessPackage || !hasActiveBusinessPackage) && (
              <div 
                data-premium-section
                className="bg-white rounded-xl shadow-md border border-gray-200"
              >
                {/* Business Package Status: only when user has an active business package */}
                {hasActiveBusinessPackage && (
                  <>
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                            <FiBriefcase className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-white mb-1">Business Package Status</h2>
                            <div className="flex items-center gap-2 flex-wrap">
                              {currentPackageDisplayName && (
                                <span className="inline-flex items-center gap-1 bg-white/90 text-primary-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                                  <FiShield className="w-3 h-3" />
                                  {currentPackageDisplayName}
                                </span>
                              )}
                              <span className="text-primary-50 text-xs">Manage your ad credits</span>
                            </div>
                          </div>
                        </div>
                        {adLimitStatus && adLimitStatus.businessAdsRemaining > 0 && (
                          <div className="bg-white/20 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <FiZap className="w-4 h-4 text-white" />
                              <span className="text-xl font-bold text-white">{adLimitStatus.businessAdsRemaining}</span>
                            </div>
                            <span className="text-xs text-primary-100 font-medium">Credits Left</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {adLimitStatus && adLimitStatus.packages && adLimitStatus.packages.length > 0 && (
                      <div className="p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                <FiPackage className="w-5 h-5 text-primary-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium uppercase">Total Credits</p>
                                <p className="text-xl font-bold text-gray-900">
                                  {adLimitStatus.packages.reduce((sum: number, pkg: any) => sum + (pkg.totalAds || 0), 0)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FiCheckCircle className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium uppercase">Used</p>
                                <p className="text-xl font-bold text-gray-900">
                                  {adLimitStatus.packages.reduce((sum: number, pkg: any) => sum + ((pkg.totalAds || 0) - (pkg.adsRemaining || 0)), 0)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border-2 border-primary-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                                <FiZap className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-xs text-primary-700 font-bold uppercase">Remaining</p>
                                <p className="text-xl font-bold text-primary-600">
                                  {adLimitStatus.businessAdsRemaining || 0}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Premium Features: show when no business package OR when business package but free ads finished (user can post via premium) */}
                {(!hasActiveBusinessPackage || (hasActiveBusinessPackage && !hasFreeAdsRemaining)) && (
                <div className={`p-5 bg-white ${hasActiveBusinessPackage ? 'border-t border-gray-200' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FiStar className="w-5 h-5 text-primary-600" />
                      <h3 className="text-base font-bold text-gray-900">Premium Features</h3>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full font-medium">Optional</span>
                  </div>

                  {/* Premium Features with Toggles */}
                  {isLoadingOffers ? (
                    <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-primary-500"></div>
                      <span className="ml-3 text-gray-600 font-medium">Loading premium options...</span>
                    </div>
                  ) : safePremiumSettings.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                      <FiInfo className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <p className="text-sm text-amber-800 font-medium">Premium options are not available right now. You can still post your ad.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* TOP Ads */}
                    {safePremiumSettings.find((o: any) => o.type === 'TOP') && (
                      <div
                        className={`relative flex flex-col h-full rounded-2xl p-5 transition-all duration-200 bg-gradient-to-b border-2 ${
                          selectedPremium === 'TOP'
                            ? 'from-primary-50 to-white border-primary-500 shadow-md'
                            : 'from-white to-gray-50 border-gray-200 hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5'
                        }`}
                      >
                        {selectedPremium === 'TOP' && (
                          <div className="absolute top-0 right-0 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                            SELECTED
                          </div>
                        )}
                        {/* Top row: icon + toggle */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
                            <FiFlag className="w-5 h-5 text-white" />
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
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 shadow-inner" />
                          </label>
                        </div>

                        {/* Text body: full width */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-bold text-gray-900">TOP Ads</h4>
                            <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              PREMIUM
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-600 leading-snug">
                            Display in the exclusive top section of search results for maximum visibility.
                          </p>
                        </div>

                        {/* Cost row */}
                        <div className="mt-3 pt-3 border-t border-primary-100 flex items-center justify-between">
                          <span className="text-xs text-gray-500">Cost</span>
                          <span className="text-sm font-bold text-primary-600">
                            {safePremiumSettings.find((o: any) => o.type === 'TOP')?.price || 0} Credits
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Featured Ad */}
                    {safePremiumSettings.find((o: any) => o.type === 'FEATURED') && (
                      <div
                        className={`relative flex flex-col h-full rounded-2xl p-5 transition-all duration-200 bg-gradient-to-b border-2 ${
                          selectedPremium === 'FEATURED'
                            ? 'from-yellow-50 to-white border-yellow-500 shadow-md'
                            : 'from-white to-gray-50 border-gray-200 hover:border-yellow-300 hover:shadow-md hover:-translate-y-0.5'
                        }`}
                      >
                        {selectedPremium === 'FEATURED' && (
                          <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                            SELECTED
                          </div>
                        )}
                        {/* Top row: icon + toggle */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-9 h-9 bg-yellow-500 rounded-xl flex items-center justify-center">
                            <FiStar className="w-5 h-5 text-white" />
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
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500 shadow-inner" />
                          </label>
                        </div>

                        {/* Text body: full width */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-bold text-gray-900">Featured Ad</h4>
                            <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              7 DAYS
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-600 leading-snug">
                            Pin your ad to the top of the category for 7 days with a featured badge.
                          </p>
                        </div>

                        {/* Cost row */}
                        <div className="mt-3 pt-3 border-t border-yellow-100 flex items-center justify-between">
                          <span className="text-xs text-gray-500">Cost</span>
                          <span className="text-sm font-bold text-yellow-600">
                            {safePremiumSettings.find((o: any) => o.type === 'FEATURED')?.price || 0} Credits
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Bump Up */}
                    {safePremiumSettings.find((o: any) => o.type === 'BUMP_UP') && (
                      <div
                        className={`relative flex flex-col h-full rounded-2xl p-5 transition-all duration-200 bg-gradient-to-b border-2 ${
                          selectedPremium === 'BUMP_UP'
                            ? 'from-green-50 to-white border-green-500 shadow-md'
                            : 'from-white to-gray-50 border-gray-200 hover:border-green-300 hover:shadow-md hover:-translate-y-0.5'
                        }`}
                      >
                        {selectedPremium === 'BUMP_UP' && (
                          <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                            SELECTED
                          </div>
                        )}
                        {/* Top row: icon + toggle */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
                            <FiTrendingUp className="w-5 h-5 text-white" />
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
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-inner" />
                          </label>
                        </div>

                        {/* Text body: full width */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-bold text-gray-900">Bump Up</h4>
                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              INCLUDED
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-600 leading-snug">
                            Automatically move your ad to the top of the list every 24 hours.
                          </p>
                        </div>

                        {/* Cost row */}
                        <div className="mt-3 pt-3 border-t border-green-100 flex items-center justify-between">
                          <span className="text-xs text-gray-500">Cost</span>
                          <div className="flex items-center gap-1">
                            <FiCheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-700">Free</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  )}
                </div>
                )}
              </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8">
                <button
                  type="submit"
                  disabled={
                    !canSubmit ||
                    isSubmittingForm ||
                    createAd.isPending || 
                    createPaymentOrder.isPending
                  }
                  className="flex-1 px-6 py-3 bg-primary-700 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmittingForm || createAd.isPending || createPaymentOrder.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Post Ad Now'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/my-ads')}
                  className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Save as Draft
                </button>
              </div>

              {/* Copyright Footer */}
              <div className="text-center text-sm text-gray-500 mt-8 pb-4">
                © 2024 Classifieds Marketplace. All rights reserved. Professional Selling Platform Variant 1.
              </div>

            </form>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Upload Photos */}
              <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-50 text-primary-600">
                    <FiCamera className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900">Upload Photos</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">First photo is the cover. JPG, PNG · Max 5MB each.</p>
                <div className="space-y-4">
                  <label className="block">
                    <div
                      className={`
                        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                        transition-all duration-200 ease-out
                        bg-gray-50 hover:bg-primary-50/50 hover:border-primary-400
                        border-gray-300
                        focus-within:ring-2 focus-within:ring-primary-400 focus-within:ring-offset-2
                        min-h-[140px] flex flex-col items-center justify-center
                      `}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-primary-500', 'bg-primary-50'); }}
                      onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary-500', 'bg-primary-50'); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-primary-500', 'bg-primary-50');
                        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                        if (files.length === 0) return;
                        const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
                        if (input) {
                          const dt = new DataTransfer();
                          [...images, ...files].slice(0, 20).forEach((f) => dt.items.add(f));
                          input.files = dt.files;
                          input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-gray-200 text-gray-400 mb-3 shadow-sm">
                        <FiImage className="w-7 h-7" />
                      </span>
                      <span className="text-sm font-semibold text-gray-700 mb-0.5 block">Add photos</span>
                      <span className="text-xs text-gray-500">Click or drag and drop</span>
                      {images.length > 0 && (
                        <span className="mt-2 inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                          {images.length} photo{images.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </label>
                  {previews.length > 0 && (
                    <div className="grid grid-cols-2 gap-2.5">
                      {previews.map((preview, index) => (
                        <div key={index} className="relative group group/preview">
                          <div className="aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm ring-1 ring-black/5">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover transition-transform group-hover/preview:scale-105"
                            />
                          </div>
                          {index === 0 && (
                            <span className="absolute bottom-1.5 left-1.5 bg-primary-600 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md shadow-sm">
                              Cover
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            aria-label="Remove photo"
                            className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-md opacity-0 group-hover/preview:opacity-100 transition-all focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                          >
                            <FiX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {images.length === 0 && (
                    <p className="text-red-500 text-xs flex items-center gap-1.5">
                      <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      At least one image required
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={autoFillDetailsFromImage}
                  disabled={images.length === 0 || isImageAiLoading}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-primary-200 bg-primary-50 text-primary-700 font-medium text-sm hover:bg-primary-100 hover:border-primary-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <FiZap className={`w-4 h-4 flex-shrink-0 ${isImageAiLoading ? 'animate-pulse' : ''}`} />
                  <span>{isImageAiLoading ? 'Analyzing image...' : 'AI Auto Generate'}</span>
                </button>
              </div>

              {/* Selling Tips */}
              <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-6 shadow-md border-2 border-primary-100">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                    <FiZap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Selling Tips</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-3 bg-white rounded-lg border border-gray-100 hover:border-primary-200 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiCamera className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Clear Photos</p>
                      <p className="text-sm text-gray-600 leading-relaxed">Ads with clear, high-quality photos get 10x more replies.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 bg-white rounded-lg border border-gray-100 hover:border-primary-200 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiFileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Be Specific</p>
                      <p className="text-sm text-gray-600 leading-relaxed">Be honest about your item's condition to build trust with buyers.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 bg-white rounded-lg border border-gray-100 hover:border-primary-200 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiDollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Price Fairly</p>
                      <p className="text-sm text-gray-600 leading-relaxed">Research similar ads to ensure your price is competitive.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Safe Selling */}
              <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-6 shadow-md border-2 border-green-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <FiShield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Safe Selling</h3>
                    <p className="text-xs text-green-700">Your security matters</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Your privacy and safety are important to us. Always meet buyers in public places and never share sensitive bank details.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-green-700 font-semibold">
                    <FiCheckCircle className="w-4 h-4" />
                    <span>Stay safe, sell smart</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>


      {/* Upgrade popup: shown only when backend returns showUpgradePopup === true (no local logic) */}
      <UpgradePopup
        open={adLimitStatus?.showUpgradePopup === true && !upgradePopupDismissed}
        onClose={() => setUpgradePopupDismissed(true)}
        onSelectPremium={() => {
          const el = document.querySelector('[data-premium-section]');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            (el as HTMLElement).classList.add('ring-4', 'ring-amber-400');
            setTimeout(() => (el as HTMLElement).classList.remove('ring-4', 'ring-amber-400'), 3000);
          }
        }}
      />

      {/* Payment Required Modal - only when user has no free/business ads left (ubhekum kanikaruthu) */}
      {showPaymentRequiredModal && totalRemaining === 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-primary-600 to-red-500 p-6 text-white">
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
                {/* Option 1: Select Premium Features (Single Buy) - visibility from backend hideSingleBuy only */}
                {!hideSingleBuy && (
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
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 rounded-xl font-semibold hover:from-yellow-600 hover:to-primary-700 flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <FiStar className="w-5 h-5" />
                  <span>Select Premium Features</span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Quick</span>
                </button>
                )}
                
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
                        onSettled: () => setIsSubmittingForm(false),
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
                            const condVal = normalizeCondition(adFormData.condition || adFormData.attributes?.condition);
                            if (condVal) formData.append('condition', condVal);
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
                              onSettled: () => setIsSubmittingForm(false),
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
                          // Pass form data to capture in closure (normalize so price is always at root)
                          openRazorpayCheckout(response, normalizeFormDataWithPrice(adFormData));
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
            : ['Post your ad on Sell Box', 'Reach thousands of buyers', 'Manage your listings'],
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



