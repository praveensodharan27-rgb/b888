'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiSearch, FiCheck, FiRefreshCw, FiDollarSign, FiStar } from 'react-icons/fi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import RangeSlider from './RangeSlider';

interface ModernFilterSidebarProps {
  filters: any;
  onFilterChange: (filters: any) => void;
  categoryId?: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  _count?: { ads: number };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  subcategories?: Subcategory[];
  _count?: { ads: number };
}

export default function ModernFilterSidebar({ filters, onFilterChange, categoryId }: ModernFilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['premium', 'categories', 'price', 'brand', 'condition'])
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');

  // Initialize query client for cache management
  const queryClient = useQueryClient();

  // Fetch categories with subcategories (same as post-ad form)
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useQuery<Category[]>({
    queryKey: ['categories', 'with-subcategories'],
    queryFn: async (): Promise<Category[]> => {
      try {
        // Use same endpoint as post-ad form - backend includes subcategories by default
        const response = await api.get('/categories');
        
        // Handle different response formats
        let categories: Category[] = [];
        if (Array.isArray(response.data?.categories)) {
          categories = response.data.categories;
        } else if (Array.isArray(response.data)) {
          categories = response.data;
        } else if (response.data?.success && Array.isArray(response.data.categories)) {
          categories = response.data.categories;
        }
        
        // Ensure all categories have subcategories array
        const categoriesWithSubs = categories.map((category: Category) => ({
          ...category,
          subcategories: category.subcategories || []
        }));
        
        console.log('✅ Categories fetched:', categoriesWithSubs.length, categoriesWithSubs);
        return categoriesWithSubs;
      } catch (error: any) {
        console.error('❌ Error fetching categories:', error?.message || error);
        // Return empty array on error
        return [];
      }
    },
    initialData: [],
    placeholderData: [],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2, // Retry on failure
    refetchOnWindowFocus: false,
  });

  const categories = Array.isArray(categoriesData) && categoriesData.length > 0 
    ? categoriesData 
    : [];
  
  // Get selected category from filters or props (can be slug or id)
  const selectedCategorySlugOrId = categoryId || filters.category;
  const selectedCategory = selectedCategorySlugOrId 
    ? categories.find(cat => cat.slug === selectedCategorySlugOrId || cat.id === selectedCategorySlugOrId)
    : null;
  
  // Get category ID for API calls (prefer ID over slug)
  const selectedCategoryId = selectedCategory?.id || null;
  
  // Always show all categories (user can select any)
  const displayCategories = categories; // Show all categories for selection
  
  // Auto-expand selected category when categoryId changes (from navbar/search)
  useEffect(() => {
    if (selectedCategorySlugOrId && selectedCategory) {
      // Auto-expand the selected category
      setExpandedCategories(new Set([selectedCategory.id]));
      // Clear previous subcategory selection
      setExpandedSubcategories(new Set());
      setSelectedSubcategory(null);
      // Update filters if not already set (use slug for API compatibility)
      const categoryValue = selectedCategory.slug || selectedCategory.id;
      if (filters.category !== categoryValue) {
        onFilterChange({
          ...filters,
          category: categoryValue,
          subcategory: undefined,
          brand: undefined,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategorySlugOrId, selectedCategory?.id]);
  
  // Fetch subcategories dynamically for selected category
  // Try multiple methods to get subcategories
  const { data: subcategoriesData, isLoading: subcategoriesLoading, error: subcategoriesError } = useQuery({
    queryKey: ['subcategories', selectedCategoryId, selectedCategory?.slug],
    queryFn: async () => {
      if (!selectedCategoryId || !selectedCategory) {
        console.log('⚠️ No category selected for subcategories');
        return [];
      }
      
      console.log('🔄 Fetching subcategories for category:', {
        categoryId: selectedCategoryId,
        categoryName: selectedCategory.name,
        categorySlug: selectedCategory.slug
      });
      
      try {
        // Method 1: Try fetching from /categories/:id/subcategories endpoint (by ID or slug) - PRIMARY METHOD
        if (selectedCategoryId || selectedCategory?.slug) {
          // Try with ID first, then with slug as fallback
          const identifiers = [];
          if (selectedCategoryId) identifiers.push(selectedCategoryId);
          if (selectedCategory?.slug && selectedCategory.slug !== selectedCategoryId) {
            identifiers.push(selectedCategory.slug);
          }
          
          for (const identifier of identifiers) {
            try {
              const response = await api.get(`/categories/${identifier}/subcategories`);
              console.log('📦 Subcategories API response:', {
                identifier,
                success: response.data?.success,
                hasSubcategories: Array.isArray(response.data?.subcategories),
                subcategoriesCount: response.data?.subcategories?.length || 0,
                fullResponse: response.data
              });
              
              if (response.data?.success !== false) {
                // Check multiple response formats
                let subcats = [];
                if (Array.isArray(response.data?.subcategories)) {
                  subcats = response.data.subcategories;
                } else if (Array.isArray(response.data)) {
                  subcats = response.data;
                }
                
                if (subcats.length > 0) {
                  console.log('✅ Fetched subcategories from API endpoint:', subcats.length, subcats);
                  return subcats;
                } else {
                  console.warn('⚠️ API returned empty subcategories array for category:', selectedCategory.name, 'using identifier:', identifier);
                  // Continue to next identifier if this one returned empty
                  if (identifiers.indexOf(identifier) < identifiers.length - 1) {
                    continue;
                  }
                }
              }
            } catch (endpointError: any) {
              // Only log errors that are not expected (like 404)
              const is404 = endpointError?.response?.status === 404;
              const isNetworkError = !endpointError?.response;
              
              if (!is404 && process.env.NODE_ENV === 'development') {
                // Safely extract error information
                const errorInfo: any = {
                  identifier,
                  categoryId: selectedCategoryId,
                  categorySlug: selectedCategory?.slug,
                  categoryName: selectedCategory?.name
                };
                
                // Add error details if available
                if (endpointError?.response) {
                  errorInfo.status = endpointError.response.status;
                  errorInfo.statusText = endpointError.response.statusText;
                  errorInfo.responseData = endpointError.response.data;
                }
                
                if (endpointError?.message) {
                  errorInfo.message = endpointError.message;
                }
                
                if (endpointError?.code) {
                  errorInfo.code = endpointError.code;
                }
                
                if (isNetworkError) {
                  errorInfo.networkError = true;
                  errorInfo.note = 'Network error - backend may not be running';
                }
                
                console.error('❌ Subcategories endpoint error:', errorInfo);
              }
              
              // If this is the last identifier, don't throw, try other methods
              if (identifiers.indexOf(identifier) === identifiers.length - 1 && !is404) {
                // Don't throw, try other methods
              }
            }
          }
        }
        
        // Method 2: Check if subcategories already in category data
        if (selectedCategory.subcategories && Array.isArray(selectedCategory.subcategories) && selectedCategory.subcategories.length > 0) {
          console.log('✅ Using cached subcategories from category:', selectedCategory.subcategories.length);
          return selectedCategory.subcategories;
        }
        
        // Method 3: Refetch categories to get fresh subcategories
        try {
        const response = await api.get('/categories');
        const freshCategories = Array.isArray(response.data?.categories) 
          ? response.data.categories 
            : (Array.isArray(response.data) ? response.data : []);
        const category = freshCategories.find((c: Category) => 
          c.id === selectedCategory.id || c.slug === selectedCategory.slug
        );
        
          if (category?.subcategories && Array.isArray(category.subcategories) && category.subcategories.length > 0) {
            console.log('✅ Fetched subcategories from categories endpoint:', category.subcategories.length);
            return category.subcategories;
          }
        } catch (refetchError: any) {
          console.warn('⚠️ Error refetching categories:', refetchError?.message);
        }
        
        console.warn('⚠️ No subcategories found for category:', {
          categoryId: selectedCategoryId,
          categoryName: selectedCategory.name,
          categorySlug: selectedCategory.slug
        });
        return [];
      } catch (error: any) {
        console.error('❌ Error fetching subcategories:', {
          message: error?.message,
          stack: error?.stack,
          categoryId: selectedCategoryId,
          categoryName: selectedCategory?.name
        });
        // Fallback to cached subcategories
        if (selectedCategory?.subcategories && Array.isArray(selectedCategory.subcategories)) {
          console.log('✅ Using fallback cached subcategories:', selectedCategory.subcategories.length);
          return selectedCategory.subcategories;
        }
        return [];
      }
    },
    enabled: !!(selectedCategoryId && selectedCategory),
    staleTime: 5 * 60 * 1000,
    initialData: [],
    placeholderData: [],
    retry: 2,
  });
  
  // Get subcategories for selected category (dynamically loaded)
  // Priority: fetched data (if not empty) > cached category data > empty array
  const displaySubcategories = selectedCategory 
    ? (
        // Use fetched data if it exists and has items, otherwise use cached data
        (subcategoriesData && Array.isArray(subcategoriesData) && subcategoriesData.length > 0)
          ? subcategoriesData
          : (Array.isArray(selectedCategory.subcategories) && selectedCategory.subcategories.length > 0)
            ? selectedCategory.subcategories
            : []
      )
    : [];
  
  // Debug: Log subcategories state (always log in development)
  if (typeof window !== 'undefined' && selectedCategoryId) {
    console.log('🔍 Subcategories Display State:', {
      selectedCategoryId,
      selectedCategoryName: selectedCategory?.name,
      selectedCategorySlug: selectedCategory?.slug,
      subcategoriesDataLength: subcategoriesData?.length || 0,
      subcategoriesData: subcategoriesData,
      cachedSubcategoriesLength: selectedCategory?.subcategories?.length || 0,
      cachedSubcategories: selectedCategory?.subcategories,
      displaySubcategoriesLength: displaySubcategories.length,
      displaySubcategories: displaySubcategories?.slice(0, 3).map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        idType: typeof sub.id,
        isValidObjectId: sub.id && /^[0-9a-fA-F]{24}$/.test(sub.id)
      })),
      subcategoriesLoading,
      subcategoriesError: subcategoriesError?.message,
      queryEnabled: !!(selectedCategoryId && selectedCategory)
    });
  }
  
  // Get selected subcategory from filters (can be slug or id)
  const selectedSubcategorySlugOrId = filters.subcategory;
  
  // Find subcategory data - try multiple matching strategies
  let selectedSubcategoryData = null;
  if (selectedSubcategorySlugOrId && displaySubcategories.length > 0) {
    // Try exact slug match first
    selectedSubcategoryData = displaySubcategories.find((sub: any) => 
      sub.slug === selectedSubcategorySlugOrId || sub.id === selectedSubcategorySlugOrId
    );
    
    // If not found, try case-insensitive slug match
    if (!selectedSubcategoryData) {
      selectedSubcategoryData = displaySubcategories.find((sub: any) => 
        sub.slug?.toLowerCase() === selectedSubcategorySlugOrId?.toLowerCase() ||
        sub.name?.toLowerCase() === selectedSubcategorySlugOrId?.toLowerCase()
      );
    }
    
    // Debug: Log subcategory lookup
    if (typeof window !== 'undefined') {
      console.log('🔍 Subcategory Lookup:', {
        filtersSubcategory: filters.subcategory,
        selectedSubcategorySlugOrId,
        displaySubcategoriesCount: displaySubcategories.length,
        displaySubcategories: displaySubcategories.map((sub: any) => ({
          id: sub.id,
          name: sub.name,
          slug: sub.slug
        })),
        found: !!selectedSubcategoryData,
        foundSubcategory: selectedSubcategoryData ? {
          id: selectedSubcategoryData.id,
          name: selectedSubcategoryData.name,
          slug: selectedSubcategoryData.slug
        } : null
      });
    }
  }
  
  // Use ID only if it's a valid MongoDB ObjectId (24 hex characters)
  // Otherwise, use slug for API calls
  const isValidObjectId = (id: string) => {
    if (!id || typeof id !== 'string') return false;
    return /^[0-9a-fA-F]{24}$/.test(id);
  };
  
  // Always use the actual ID from selectedSubcategoryData if available (correct MongoDB ObjectId format)
  // If filters.subcategory is "2-3" format, selectedSubcategoryData should have the correct ID
  const selectedSubcategoryId = selectedSubcategoryData?.id && isValidObjectId(selectedSubcategoryData.id)
    ? selectedSubcategoryData.id
    : (selectedSubcategorySlugOrId && isValidObjectId(selectedSubcategorySlugOrId) ? selectedSubcategorySlugOrId : null);
  
  // Always prefer slug for API calls if ID is not valid ObjectId
  const subcategorySlugForAPI = selectedSubcategoryData?.slug || (selectedSubcategorySlugOrId && !isValidObjectId(selectedSubcategorySlugOrId) ? selectedSubcategorySlugOrId : null);
  
  // Debug: Log subcategory selection
  if (typeof window !== 'undefined' && selectedSubcategorySlugOrId) {
    console.log('🔍 Selected Subcategory Debug:', {
      filtersSubcategory: filters.subcategory,
      selectedSubcategorySlugOrId,
      selectedSubcategoryData: selectedSubcategoryData ? {
        id: selectedSubcategoryData.id,
        name: selectedSubcategoryData.name,
        slug: selectedSubcategoryData.slug,
        idType: typeof selectedSubcategoryData.id,
        idIsValidObjectId: isValidObjectId(selectedSubcategoryData.id || ''),
        idFormat: selectedSubcategoryData.id ? (selectedSubcategoryData.id.includes('-') ? 'contains-dash' : 'no-dash') : 'no-id'
      } : null,
      selectedSubcategoryId,
      subcategorySlugForAPI,
      isValidObjectId: isValidObjectId(selectedSubcategoryId || ''),
      willUseSlug: !selectedSubcategoryId && !!subcategorySlugForAPI
    });
  }
  
  // Debug: Log subcategories state
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    if (selectedCategoryId && selectedCategory) {
      console.log('🔍 Subcategories State:', {
        selectedCategoryId,
        selectedCategoryName: selectedCategory.name,
        displaySubcategoriesCount: displaySubcategories.length,
        subcategoriesDataCount: subcategoriesData?.length || 0,
        cachedSubcategoriesCount: selectedCategory.subcategories?.length || 0,
        subcategoriesLoading,
        hasSubcategoriesData: !!subcategoriesData,
        hasCachedSubcategories: !!(selectedCategory.subcategories && selectedCategory.subcategories.length > 0),
      });
    }
  }
  
  // Debug: Log categories state
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('🔍 Filter Categories Debug:', {
      categoriesTotal: categories.length,
      displayCategoriesTotal: displayCategories.length,
      selectedCategoryId,
      selectedCategory: selectedCategory?.name,
      subcategoriesCount: displaySubcategories.length,
      subcategoriesLoading,
      categoriesLoading,
      categoriesError: categoriesError?.message,
    });
  }
  
  // Debug logging (development only)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    if (categoriesLoading) {
      console.log('🔄 Loading categories...');
    } else if (categoriesError) {
      console.error('❌ Categories error:', categoriesError);
    } else if (categories.length === 0) {
      console.warn('⚠️ No categories found. Response:', categoriesData);
    } else {
      console.log('✅ Categories loaded:', {
        total: categories.length,
        selectedCategoryId,
        selectedCategory: selectedCategory?.name,
        displayCategories: displayCategories.length,
        displaySubcategories: displaySubcategories.length
      });
    }
  }

  // Toggle section
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
      // Also close subcategories when closing category
      const category = categories.find(c => c.id === categoryId);
      if (category?.subcategories) {
        category.subcategories.forEach(sub => {
          expandedSubcategories.delete(sub.id);
        });
        setExpandedSubcategories(new Set(expandedSubcategories));
      }
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Toggle subcategory expansion
  const toggleSubcategory = (subcategoryId: string, categoryId: string) => {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(subcategoryId)) {
      newExpanded.delete(subcategoryId);
      setSelectedSubcategory(null);
    } else {
      newExpanded.add(subcategoryId);
      setSelectedSubcategory(subcategoryId);
      // Ensure parent category is expanded
      if (!expandedCategories.has(categoryId)) {
        setExpandedCategories(new Set([...Array.from(expandedCategories), categoryId]));
      }
    }
    setExpandedSubcategories(newExpanded);
  };

  // Handle category selection - dynamically update subcategories
  const handleCategoryToggle = (categorySlugOrId: string) => {
    // Find category by slug or id
    const category = categories.find((cat: any) => cat.slug === categorySlugOrId || cat.id === categorySlugOrId);
    if (!category) return;
    
    // Use slug for API compatibility (prefer slug over id)
    const categoryValue = category.slug || category.id;
    const isCurrentlySelected = filters.category === categoryValue || filters.category === category.slug || filters.category === category.id;
    
    if (isCurrentlySelected) {
      // Deselect category - clear all related filters
      onFilterChange({
        ...filters,
        category: undefined,
        subcategory: undefined,
        brand: undefined,
      });
      // Clear expanded states
      setExpandedCategories(new Set());
      setExpandedSubcategories(new Set());
      setSelectedSubcategory(null);
    } else {
      // Select category - update filters and expand (use slug for API)
      onFilterChange({
        ...filters,
        category: category.slug || category.id, // Prefer slug for API compatibility
        subcategory: undefined, // Clear previous subcategory
        brand: undefined, // Clear previous brand
      });
      // Auto-expand selected category to show subcategories
      setExpandedCategories(new Set([category.id]));
      setExpandedSubcategories(new Set());
      setSelectedSubcategory(null);
    }
  };

  // Handle subcategory selection - dynamically update brands
  const handleSubcategoryToggle = (subcategoryId: string, categoryId: string) => {
    const isCurrentlySelected = filters.subcategory === subcategoryId;
    
    if (isCurrentlySelected) {
      // Deselect subcategory - clear brand filter
      onFilterChange({
        ...filters,
        subcategory: undefined,
        brand: undefined,
      });
      setSelectedSubcategory(null);
      const newExpanded = new Set(expandedSubcategories);
      newExpanded.delete(subcategoryId);
      setExpandedSubcategories(newExpanded);
    } else {
      // Select subcategory - update filters and fetch brands
      onFilterChange({
        ...filters,
        category: categoryId, // Ensure parent category is set
        subcategory: subcategoryId,
        brand: undefined, // Clear previous brand
      });
      // Auto-expand subcategory to show brands
      toggleSubcategory(subcategoryId, categoryId);
    }
  };

  // Handle price range - use minPrice/maxPrice for API compatibility
  const handlePriceRangeChange = (min: number, max: number) => {
    onFilterChange({
      ...filters,
      minPrice: min || '',
      maxPrice: max || '',
      priceMin: min || '', // Keep for backward compatibility
      priceMax: max || '', // Keep for backward compatibility
    });
  };

  // Handle brand selection
  // Brands section removed - handler no longer needed
  // Brands section removed - handlers no longer needed

  // Handle condition selection
  const handleConditionChange = (condition: string) => {
    onFilterChange({
      ...filters,
      condition: filters.condition === condition ? undefined : condition,
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    const standardFilterKeys = ['category', 'subcategory', 'minPrice', 'maxPrice', 'priceMin', 'priceMax', 'condition', 'search', 'sort', 'location', 'city', 'state', 'latitude', 'longitude', 'radius', 'brand', 'model'];
    const allFilters: Record<string, string> = {};
    
    Object.keys(filters).forEach(key => {
      if (!standardFilterKeys.includes(key)) {
        allFilters[key] = '';
      }
    });
    
    // Also clear standard filters
    allFilters.category = '';
    allFilters.subcategory = '';
    allFilters.minPrice = '';
    allFilters.maxPrice = '';
    allFilters.priceMin = '';
    allFilters.priceMax = '';
    allFilters.condition = '';
    allFilters.brand = '';
    allFilters.model = '';
    
    onFilterChange(allFilters);
  };

  // Clear cache for categories, brands, models, and subcategories
  const clearCache = () => {
    // Clear React Query cache for all filter-related queries
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['categories', 'with-subcategories'] });
    queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    queryClient.invalidateQueries({ queryKey: ['brands'] });
    queryClient.invalidateQueries({ queryKey: ['models'] });
    
    // Remove cached data
    queryClient.removeQueries({ queryKey: ['categories'] });
    queryClient.removeQueries({ queryKey: ['categories', 'with-subcategories'] });
    queryClient.removeQueries({ queryKey: ['subcategories'] });
    queryClient.removeQueries({ queryKey: ['brands'] });
    queryClient.removeQueries({ queryKey: ['models'] });
    
    console.log('✅ Cache cleared for categories, brands, models, and subcategories');
  };

  // Brands section removed - query and related code no longer needed

  // Fetch models from brands-models endpoint when category is selected
  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ['models', selectedCategoryId, selectedCategory?.slug],
    queryFn: async () => {
      if (!selectedCategoryId || !selectedCategory) {
        return [];
      }
      
      try {
        const response = await api.get('/categories/brands-models', {
          params: {
            categorySlug: selectedCategory.slug
          }
        });
        
        // Extract models from brands-models response
        const categories = response.data?.categories || [];
        const categoryData = categories.find((cat: any) => 
          cat.id === selectedCategoryId || cat.slug === selectedCategory.slug
        );
        
        if (!categoryData) return [];
        
        // Collect all models from all brands in this category
        const allModels: string[] = [];
        
        // Get models from category level
        if (categoryData.brands && Array.isArray(categoryData.brands)) {
          categoryData.brands.forEach((brand: any) => {
            if (typeof brand === 'object' && Array.isArray(brand.models)) {
              brand.models.forEach((model: string) => {
                if (model && !allModels.includes(model)) {
                  allModels.push(model);
                }
              });
            }
          });
        }
        
        // Get models from subcategories
        if (categoryData.subcategories && Array.isArray(categoryData.subcategories)) {
          categoryData.subcategories.forEach((subcat: any) => {
            if (subcat.brands && Array.isArray(subcat.brands)) {
              subcat.brands.forEach((brand: any) => {
                if (typeof brand === 'object' && Array.isArray(brand.models)) {
                  brand.models.forEach((model: string) => {
                    if (model && !allModels.includes(model)) {
                      allModels.push(model);
                    }
                  });
                }
              });
            }
          });
        }
        
        return allModels.sort();
      } catch (error: any) {
        console.warn('Error fetching models:', error);
        return [];
      }
    },
    enabled: !!selectedCategoryId,
    staleTime: 5 * 60 * 1000,
    initialData: [],
    placeholderData: [],
  });

  const models = Array.isArray(modelsData) ? modelsData : [];
  const shouldShowModels = selectedCategoryId && models.length > 0;

  // Handle model selection
  const handleModelToggle = (model: string) => {
    const currentModels = filters.model ? (Array.isArray(filters.model) ? filters.model : [filters.model]) : [];
    const newModels = currentModels.includes(model)
      ? currentModels.filter((m: string) => m !== model)
      : [...currentModels, model];
    
    onFilterChange({
      ...filters,
      model: newModels.length > 0 ? (newModels.length === 1 ? newModels[0] : newModels) : undefined,
    });
  };

  // Handle "All Models" toggle - select/deselect all models
  const handleAllModelsToggle = () => {
    const currentModels = filters.model ? (Array.isArray(filters.model) ? filters.model : [filters.model]) : [];
    const filteredModels = models.filter((model: string) => {
      return model.toLowerCase().includes(modelSearch.toLowerCase());
    });
    
    // If all visible models are selected, deselect all. Otherwise, select all visible models.
    const allSelected = filteredModels.length > 0 && filteredModels.every((model: string) => 
      currentModels.includes(model)
    );
    
    if (allSelected) {
      // Deselect all visible models
      const newModels = currentModels.filter((m: string) => !filteredModels.includes(m));
      onFilterChange({
        ...filters,
        model: newModels.length > 0 ? (newModels.length === 1 ? newModels[0] : newModels) : undefined,
      });
    } else {
      // Select all visible models
      const newModels = Array.from(new Set([...currentModels, ...filteredModels]));
      onFilterChange({
        ...filters,
        model: newModels.length > 0 ? (newModels.length === 1 ? newModels[0] : newModels) : undefined,
      });
    }
  };
              
              return (
    <aside className="w-full lg:w-80 flex-shrink-0 space-y-4 sticky top-4 h-fit max-h-[calc(100vh-2rem)] overflow-x-hidden overflow-y-auto scrollbar-hide">
      {/* Cache Clear Button - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
                    <button
            onClick={clearCache}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            title="Clear React Query cache for categories, brands, models, and subcategories"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Clear Cache</span>
          </button>
                      </div>
      )}
      
      {/* Main Category Selection - Only show when no category selected */}
      {!selectedCategoryId && (
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Categories</h3>
        <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
                    </button>
                  </div>
                  
          <div className="space-y-3">
            <select
              value=""
              onChange={(e) => {
                const categoryValue = e.target.value;
                if (categoryValue) {
                  // Find category by slug or id
                  const selectedCat = categories.find((cat: any) => cat.slug === categoryValue || cat.id === categoryValue);
                  if (selectedCat) {
                    // Use slug for API compatibility
                    handleCategoryToggle(selectedCat.slug || selectedCat.id);
                  }
                }
              }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium"
            >
              <option value="">All Categories</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.slug || cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            
            <p className="text-sm text-gray-500 text-center py-4">
              Select a category to see related filters
            </p>
                        </div>
        </div>
      )}

      {/* Subcategories Card - Only show when category is selected */}
      {selectedCategoryId && (
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Sub Categories</h3>
                              <button
              onClick={() => {
                onFilterChange({ ...filters, category: undefined, subcategory: undefined, brand: undefined });
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
                              </button>
                            </div>
                            
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
            {subcategoriesLoading ? (
              <div className="text-sm text-gray-500 text-center py-4">Loading subcategories...</div>
            ) : subcategoriesError ? (
              <div className="text-sm text-red-500 text-center py-4">
                Error loading subcategories. Please try again.
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs mt-1 text-gray-400">
                    {subcategoriesError?.message || 'Unknown error'}
                                </div>
                )}
                            </div>
            ) : displaySubcategories && displaySubcategories.length > 0 ? (
              <>
                {/* All Services - show when Services category selected */}
                {selectedCategory?.slug === 'services' && (
                  <label className="flex items-center gap-3 cursor-pointer group py-1">
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={!filters.subcategory}
                        onChange={() => onFilterChange({ ...filters, subcategory: undefined, brand: undefined })}
                        className="sr-only peer"
                      />
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                        !filters.subcategory ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'
                      }`}>
                        {!filters.subcategory && <FiCheck className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700 flex-1">All Services</span>
                  </label>
                )}
                {displaySubcategories.map((subcategory: any) => {
                const isSubcategorySelected = filters.subcategory === subcategory.slug || filters.subcategory === subcategory.id;
                const subcategoryCount = subcategory._count?.ads || 0;
                const formattedCount = subcategoryCount >= 1000 
                  ? `${(subcategoryCount / 1000).toFixed(1)}k` 
                  : subcategoryCount.toString();
                                      
                                      return (
                                        <label
                    key={subcategory.id}
                    className="flex items-center gap-3 cursor-pointer group py-1"
                  >
                    <div className="relative flex items-center justify-center flex-shrink-0">
                                            <input
                                              type="checkbox"
                        checked={isSubcategorySelected}
                        onChange={() => {
                          const subcategoryValue = subcategory.slug || subcategory.id;
                          if (isSubcategorySelected) {
                            onFilterChange({ ...filters, subcategory: undefined, brand: undefined });
                          } else {
                            onFilterChange({ 
                              ...filters, 
                              subcategory: subcategoryValue,
                              brand: undefined // Clear brand when subcategory changes
                            });
                          }
                        }}
                                              className="sr-only peer"
                                            />
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                        isSubcategorySelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-gray-300 group-hover:border-blue-400'
                      }`}>
                        {isSubcategorySelected && <FiCheck className="w-3 h-3 text-white" />}
                                            </div>
                                          </div>
                    <span className="text-sm text-gray-700 flex-1">{subcategory.name}</span>
                                {subcategoryCount > 0 && (
                      <span className="text-xs text-gray-500">{formattedCount}</span>
                                          )}
                                        </label>
                                      );
                                    })}
              </>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                <div>No subcategories found for this category</div>
                {process.env.NODE_ENV === 'development' && selectedCategoryId && (
                  <div className="text-xs mt-2 text-gray-400 space-y-1">
                    <div>Category ID: {selectedCategoryId}</div>
                    <div>Category: {selectedCategory?.name}</div>
                    <div>Category Slug: {selectedCategory?.slug}</div>
                    <div>Fetched from API: {subcategoriesData?.length || 0} subcategories</div>
                    <div>Cached in category: {selectedCategory?.subcategories?.length || 0} subcategories</div>
                    <div>Display count: {displaySubcategories.length}</div>
                    <div>Loading: {subcategoriesLoading ? 'Yes' : 'No'}</div>
                    {subcategoriesError && (
                      <div className="text-red-400">Error: {(subcategoriesError as Error).message}</div>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <div className="font-semibold">Debug Info:</div>
                      <div>Query enabled: {!!(selectedCategoryId && selectedCategory) ? 'Yes' : 'No'}</div>
                      <div>Category object: {selectedCategory ? 'Found' : 'Not found'}</div>
                      <div>Subcategories data type: {Array.isArray(subcategoriesData) ? 'Array' : typeof subcategoriesData}</div>
                              </div>
                          </div>
                      )}
                    </div>
                  )}
                </div>
          </div>
        )}

      {/* Popular Brands section removed */}

      {/* Models Card - Show only when category/subcategory selected and models available */}
      {selectedCategoryId && shouldShowModels && (
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Models</h3>
          
          <div className="space-y-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Find models..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
              {modelsLoading ? (
                <div className="text-sm text-gray-500 text-center py-4">Loading models...</div>
              ) : models.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">No models found</div>
              ) : (
                <>
                  {/* All Models Option */}
                  {(() => {
                    const filteredModels = models.filter((model: string) => {
                      return model.toLowerCase().includes(modelSearch.toLowerCase());
                    });
                    
                    const selectedModels = filters.model ? (Array.isArray(filters.model) ? filters.model : [filters.model]) : [];
                    const allSelected = filteredModels.length > 0 && filteredModels.every((model: string) => 
                      selectedModels.includes(model)
                    );
                    
                    return (
                      <label
                        key="all-models"
                        className="flex items-center gap-3 cursor-pointer group py-1.5 border-b border-gray-200 pb-2 mb-1"
                      >
                        <div className="relative flex items-center justify-center flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={handleAllModelsToggle}
                            className="sr-only peer"
                          />
                          <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                            allSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300 group-hover:border-blue-400'
                          }`}>
                            {allSelected && <FiCheck className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 flex-1">All Models</span>
                        <span className="text-xs text-gray-500">({filteredModels.length})</span>
                      </label>
                    );
                  })()}
                  
                  {/* Individual Model Options */}
                  {models
                    .filter((model: string) => {
                      return model.toLowerCase().includes(modelSearch.toLowerCase());
                    })
                    .map((model: string, index: number) => {
                      const modelId = model.toLowerCase().replace(/\s+/g, '-');
                      const selectedModels = filters.model ? (Array.isArray(filters.model) ? filters.model : [filters.model]) : [];
                      const isSelected = selectedModels.includes(model) || selectedModels.includes(modelId);
                      
                      return (
                        <label
                          key={`${modelId}-${index}`}
                          className="flex items-center gap-3 cursor-pointer group py-1"
                        >
                          <div className="relative flex items-center justify-center flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleModelToggle(model)}
                              className="sr-only peer"
                            />
                            <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-white border-gray-300 group-hover:border-blue-400'
                            }`}>
                              {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                          </div>
                          </div>
                          <span className="text-sm text-gray-700 flex-1">{model}</span>
                      </label>
                    );
                    })}
                </>
              )}
            </div>
          </div>
      </div>
      )}

      {/* Price Range Card - Show only when category is selected */}
      {selectedCategoryId && (
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
          <FiDollarSign className="w-4 h-4 text-blue-600 flex-shrink-0" aria-hidden />
          Price Range
        </h3>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">MIN</label>
                <input
                  type="number"
                  value={filters.minPrice || filters.priceMin || ''}
                  onChange={(e) => {
                    const min = e.target.value ? Number(e.target.value) : '';
                    // Update both minPrice (for API) and priceMin (for backward compatibility)
                    onFilterChange({ 
                      ...filters, 
                      minPrice: min || '', 
                      maxPrice: filters.maxPrice || filters.priceMax || '',
                      priceMin: min || '',
                      priceMax: filters.maxPrice || filters.priceMax || ''
                    });
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Min"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">MAX</label>
                <input
                  type="number"
                  value={filters.maxPrice || filters.priceMax || ''}
                  onChange={(e) => {
                    const max = e.target.value ? Number(e.target.value) : '';
                    // Update both maxPrice (for API) and priceMax (for backward compatibility)
                    onFilterChange({ 
                      ...filters, 
                      minPrice: filters.minPrice || filters.priceMin || '',
                      maxPrice: max || '',
                      priceMin: filters.minPrice || filters.priceMin || '',
                      priceMax: max || ''
                    });
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Max"
                />
              </div>
            </div>
        <button
              onClick={() => onFilterChange(filters)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              Apply
        </button>
          </div>
        </div>
      )}

      {/* Condition Card - Show only when category is selected */}
      {selectedCategoryId && (
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
          <FiStar className="w-4 h-4 text-blue-600 flex-shrink-0" aria-hidden />
          Condition
        </h3>
          
          <div className="space-y-2">
            {['NEW', 'LIKE_NEW', 'USED', 'FOR_PARTS'].map((condition) => {
              const conditionLabel = condition === 'LIKE_NEW' ? 'Like New' : condition === 'FOR_PARTS' ? 'For Parts' : condition;
              const isSelected = filters.condition === condition || filters.condition === conditionLabel;
              
              return (
                <label
                  key={condition}
                  className="flex items-center gap-3 cursor-pointer group py-1"
                >
                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const newCondition = isSelected ? '' : condition;
                        onFilterChange({ ...filters, condition: newCondition });
                      }}
                      className="sr-only peer"
                    />
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300 group-hover:border-blue-400'
                    }`}>
                      {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 flex-1">{conditionLabel}</span>
                </label>
              );
            })}
          </div>
      </div>
      )}

    </aside>
  );
}
