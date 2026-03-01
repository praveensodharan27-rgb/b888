'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import FilterCard from './FilterCard';
import RangeSlider from '../RangeSlider';
import { 
  FiChevronDown, 
  FiChevronUp, 
  FiX, 
  FiCheck,
  FiSliders,
  FiDollarSign,
  FiToggleLeft,
  FiToggleRight,
} from 'react-icons/fi';

interface FilterOption {
  value: string;
  label: string;
  order?: number;
}

interface FilterConfig {
  key: string;
  name: string;
  label: string;
  type: 'select' | 'multi' | 'range' | 'toggle';
  order: number;
  isRequired: boolean;
  placeholder?: string;
  helpText?: string;
  // Range-specific
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  // Toggle-specific
  defaultValue?: boolean;
  // Price range (category-specific)
  priceMin?: number;
  priceMax?: number;
  priceStep?: number;
  // Options
  options: FilterOption[];
  // Category/Subcategory info
  categoryId?: string | null;
  subcategoryId?: string | null;
  // Metadata
  metadata?: any;
}

interface ProductWiseFiltersProps {
  categorySlug?: string;
  subcategorySlug?: string;
  filters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  onPriceRangeChange?: (min: number | undefined, max: number | undefined) => void;
}

/**
 * Product-wise dynamic filters component
 * Supports: SELECT, MULTI, RANGE, TOGGLE filter types
 * Automatically clears filters on category change
 * Uses category-specific price ranges
 */
export default function ProductWiseFilters({
  categorySlug,
  subcategorySlug,
  filters,
  onFilterChange,
  onPriceRangeChange,
}: ProductWiseFiltersProps) {
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(filters);

  // Clear dynamic filters when category/subcategory changes (but keep common filters)
  useEffect(() => {
    // Only clear special filters, keep common filters like price, location, condition
    const commonFilterKeys = ['price', 'location', 'postedDate', 'condition', 'brand', 'sellerType', 'verifiedSeller', 'deliveryAvailable'];
    const clearedFilters: Record<string, any> = {};
    
    // Keep common filters
    Object.keys(localFilters).forEach(key => {
      if (commonFilterKeys.includes(key)) {
        clearedFilters[key] = localFilters[key];
      }
    });
    
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  }, [categorySlug, subcategorySlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local filters with props
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Fetch filter configurations with safety fallback
  const { data: filterConfigData, isLoading, error: filterError } = useQuery<{
    success: boolean;
    filters: {
      normal: FilterConfig[];
      special: FilterConfig[];
      all: FilterConfig[];
      common: string[];
      category: string[];
      subcategory: string[];
    };
    category?: { id: string; name: string; slug: string } | null;
    subcategory?: { id: string; name: string; slug: string } | null;
    priceRange?: { min: number; max: number; step: number } | null;
    count: {
      normal: number;
      special: number;
      total: number;
    };
  }>({
    queryKey: ['filter-configurations', categorySlug, subcategorySlug],
    queryFn: async () => {
      try {
        // Always fetch normal filters (even without category)
        const params: any = {};
        if (categorySlug) params.categorySlug = categorySlug;
        if (subcategorySlug) params.subcategorySlug = subcategorySlug;

        const response = await api.get('/filter-configurations', { params });
        
        // ALWAYS return valid structure - never null
        const safeData = response.data || {};
        const safeFilters = safeData.filters || {};
        
        const result = {
          success: safeData.success !== false,
          filters: {
            normal: Array.isArray(safeFilters.normal) ? safeFilters.normal : [],
            special: Array.isArray(safeFilters.special) ? safeFilters.special : [],
            all: Array.isArray(safeFilters.all) ? safeFilters.all : [],
            common: Array.isArray(safeFilters.common) ? safeFilters.common : [],
            category: Array.isArray(safeFilters.category) ? safeFilters.category : [],
            subcategory: Array.isArray(safeFilters.subcategory) ? safeFilters.subcategory : [],
          },
          category: safeData.category || null,
          subcategory: safeData.subcategory || null,
          priceRange: safeData.priceRange || null,
          count: safeData.count || {
            normal: 0,
            special: 0,
            total: 0,
          },
        };

        console.log('📥 Filter API Response:', {
          success: result.success,
          normal: result.filters.normal.length,
          special: result.filters.special.length,
          categorySlug,
          subcategorySlug,
        });
        
        return result;
      } catch (error: any) {
        console.error('❌ Error fetching filters:', error);
        
        // Return safe fallback structure on error - NEVER null
        return {
          success: false,
          filters: {
            normal: [],
            special: [],
            all: [],
            common: [],
            category: [],
            subcategory: [],
          },
          category: null,
          subcategory: null,
          priceRange: null,
          count: {
            normal: 0,
            special: 0,
            total: 0,
          },
        };
      }
    },
    enabled: true, // Always enabled to show normal filters
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 2,
  });

  // Get normal and special filters - ALWAYS show normal filters (common filters)
  let normalFilters = filterConfigData?.filters?.normal || [];
  let specialFilters = categorySlug ? (filterConfigData?.filters?.special || []) : [];
  
  // ✅ FIX: Ensure normal filters always show, even when loading or no category selected
  // Normal filters (common filters) should always be visible
  
  // Remove duplicates by key (keep first occurrence) - deduplicate within each group first
  const normalFilterMap = new Map<string, FilterConfig>();
  normalFilters.forEach(filter => {
    if (!normalFilterMap.has(filter.key)) {
      normalFilterMap.set(filter.key, filter);
    }
  });
  normalFilters = Array.from(normalFilterMap.values());
  
  const specialFilterMap = new Map<string, FilterConfig>();
  specialFilters.forEach(filter => {
    if (!specialFilterMap.has(filter.key)) {
      specialFilterMap.set(filter.key, filter);
    }
  });
  specialFilters = Array.from(specialFilterMap.values());
  
  // Combine and ensure no duplicates between normal and special
  const allFilterMap = new Map<string, FilterConfig>();
  [...normalFilters, ...specialFilters].forEach(filter => {
    if (!allFilterMap.has(filter.key)) {
      allFilterMap.set(filter.key, filter);
    }
  });
  const allFilters = Array.from(allFilterMap.values());

  // Debug logging
  useEffect(() => {
    if (filterConfigData) {
      console.log('🔍 Filter Config Data:', {
        normal: normalFilters.length,
        special: specialFilters.length,
        total: allFilters.length,
        categorySlug,
        subcategorySlug,
        normalFilterKeys: normalFilters.map(f => `${f.key}(${f.type})`),
        specialFilterKeys: specialFilters.map(f => `${f.key}(${f.type})`),
      });
    }
    if (filterError) {
      console.error('❌ Filter fetch error:', filterError);
    }
    if (normalFilters.length === 0 && !isLoading) {
      console.warn('⚠️ No normal filters found! Check API response:', filterConfigData);
    }
  }, [filterConfigData, normalFilters.length, specialFilters.length, allFilters.length, categorySlug, subcategorySlug, filterError, isLoading]);
  const categoryPriceRange = useMemo(() => {
    // Use priceRange from API response, or find price filter config
    if (filterConfigData?.priceRange) {
      return filterConfigData.priceRange;
    }
    
    const priceFilter = allFilters.find(f => f.key === 'price');
    if (priceFilter) {
      return {
        min: priceFilter.priceMin ?? priceFilter.min ?? 0,
        max: priceFilter.priceMax ?? priceFilter.max ?? 10000000,
        step: priceFilter.priceStep ?? priceFilter.step ?? 1000,
      };
    }
    return null;
  }, [filterConfigData, allFilters]);

  // Update price range when category changes
  useEffect(() => {
    if (categoryPriceRange && onPriceRangeChange) {
      onPriceRangeChange(categoryPriceRange.min, categoryPriceRange.max);
    }
  }, [categoryPriceRange, onPriceRangeChange]);

  const toggleFilter = useCallback((filterKey: string) => {
    setExpandedFilters(prev => {
      const next = new Set(prev);
      if (next.has(filterKey)) {
        next.delete(filterKey);
      } else {
        next.add(filterKey);
      }
      return next;
    });
  }, []);

  const handleFilterChange = useCallback((key: string, value: any) => {
    const updated = { ...localFilters };
    
    if (value === null || value === undefined || value === '' || 
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && value.min === undefined && value.max === undefined)) {
      delete updated[key];
    } else {
      updated[key] = value;
    }

    setLocalFilters(updated);
    onFilterChange(updated);
  }, [localFilters, onFilterChange]);

  const clearFilter = useCallback((key: string) => {
    handleFilterChange(key, null);
  }, [handleFilterChange]);

  const clearAllFilters = useCallback(() => {
    setLocalFilters({});
    onFilterChange({});
  }, [onFilterChange]);

  // Fetch brands dynamically for brand filter
  const { data: brands = [] } = useQuery<any[]>({
    queryKey: ['brands', categorySlug],
    queryFn: async () => {
      try {
        const url = categorySlug 
          ? `/brands?category=${categorySlug}`
          : '/brands';
        const response = await api.get(url);
        return response.data?.brands || response.data || [];
      } catch (error) {
        console.error('Error fetching brands:', error);
        return [];
      }
    },
    enabled: true,
    staleTime: 10 * 60 * 1000,
  });

  const renderFilter = useCallback((config: FilterConfig) => {
    if (!config || !config.key) {
      console.warn('⚠️ Invalid filter config in renderFilter:', config);
      return null;
    }

    const isExpanded = expandedFilters.has(config.key);
    const currentValue = localFilters[config.key];

    // For brand filter, use dynamically fetched brands
    let filterOptions = config.options || [];
    if (config.key === 'brand' && brands.length > 0) {
      filterOptions = brands.map((brand: any) => ({
        value: brand.slug || brand.name,
        label: brand.name,
      }));
    }

    // Normalize type to lowercase for switch statement
    const filterType = (config.type || '').toLowerCase();

    switch (filterType) {
      case 'select':
      case 'multi':
        const selectedValues = Array.isArray(currentValue)
          ? currentValue
          : currentValue
          ? [currentValue]
          : [];

        return (
          <FilterCard
            key={config.key}
            title={config.label}
            icon={<FiSliders className="w-5 h-5" />}
            isExpanded={isExpanded}
            onToggle={() => toggleFilter(config.key)}
            selectedCount={selectedValues.length}
            selectedLabel={selectedValues.length > 0 
              ? config.type === 'multi' 
                ? `${selectedValues.length} selected`
                : selectedValues[0]
              : undefined}
          >
            {isExpanded && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filterOptions.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No options available yet
                  </p>
                ) : (
                  filterOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                      >
                        <input
                          type={config.type === 'multi' ? 'checkbox' : 'radio'}
                          checked={isSelected}
                          onChange={() => {
                            if (config.type === 'multi') {
                              const newValues = isSelected
                                ? selectedValues.filter(v => v !== option.value)
                                : [...selectedValues, option.value];
                              handleFilterChange(config.key, newValues.length > 0 ? newValues : null);
                            } else {
                              handleFilterChange(config.key, isSelected ? null : option.value);
                            }
                          }}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                        {isSelected && <FiCheck className="w-4 h-4 text-green-600" />}
                      </label>
                    );
                  })
                )}
                {selectedValues.length > 0 && (
                  <button
                    onClick={() => clearFilter(config.key)}
                    className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            )}
          </FilterCard>
        );

      case 'range':
        const rangeValue = currentValue || { min: config.min || 0, max: config.max || 1000000 };
        const minValue = rangeValue.min ?? config.min ?? 0;
        const maxValue = rangeValue.max ?? config.max ?? 1000000;

        return (
          <FilterCard
            key={config.key}
            title={config.label}
            icon={<FiDollarSign className="w-5 h-5" />}
            isExpanded={isExpanded}
            onToggle={() => toggleFilter(config.key)}
            selectedCount={currentValue ? 1 : 0}
            selectedLabel={currentValue 
              ? `${config.unit || '₹'}${minValue.toLocaleString()} - ${config.unit || '₹'}${maxValue.toLocaleString()}`
              : undefined}
          >
            {isExpanded && (
              <div className="space-y-4">
                <RangeSlider
                  min={config.min || 0}
                  max={config.max || 1000000}
                  step={config.step || 1000}
                  value={[minValue, maxValue]}
                  onChange={(values) => {
                    handleFilterChange(config.key, { min: values[0], max: values[1] });
                  }}
                />
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{config.unit || '₹'}{minValue.toLocaleString()}</span>
                  <span>{config.unit || '₹'}{maxValue.toLocaleString()}</span>
                </div>
                {currentValue && (
                  <button
                    onClick={() => clearFilter(config.key)}
                    className="w-full px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    Clear range
                  </button>
                )}
              </div>
            )}
          </FilterCard>
        );

      case 'toggle':
        const toggleValue = currentValue !== undefined ? currentValue : (config.defaultValue ?? false);

        return (
          <FilterCard
            key={config.key}
            title={config.label}
            icon={toggleValue ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
            isExpanded={false}
            onToggle={() => handleFilterChange(config.key, !toggleValue)}
            selectedCount={toggleValue ? 1 : 0}
            selectedLabel={toggleValue ? 'Yes' : 'No'}
          >
            {config.helpText && (
              <p className="text-xs text-gray-500 mt-2">{config.helpText}</p>
            )}
          </FilterCard>
        );

      default:
        console.warn(`⚠️ Unknown filter type: ${config.type} for filter: ${config.key}`);
        return null;
    }
  }, [expandedFilters, localFilters, toggleFilter, handleFilterChange, clearFilter, brands]);

  // Always show normal filters, even without category
  // Special filters only show when category is selected

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (filterError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-5">
        <p className="text-sm text-red-800 font-medium mb-2">
          Error loading filters
        </p>
        <p className="text-xs text-red-600">
          {filterError instanceof Error ? filterError.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  if (allFilters.length === 0 && !isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <p className="text-sm text-gray-500 text-center mb-3">
          No filters available
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-400 space-y-1">
            <div>Debug: normalFilters={normalFilters.length}, specialFilters={specialFilters.length}</div>
            <div>API Data: {filterConfigData ? 'Received' : 'Not received'}</div>
            <div>Category: {categorySlug || 'None'}, Subcategory: {subcategorySlug || 'None'}</div>
            {filterConfigData && (
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600">View API Response</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(filterConfigData, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    );
  }

  const activeFiltersCount = Object.keys(localFilters).filter(key => {
    const value = localFilters[key];
    return value !== null && value !== undefined && value !== '' &&
           !(Array.isArray(value) && value.length === 0) &&
           !(typeof value === 'object' && value.min === undefined && value.max === undefined);
  }).length;

  // ✅ FIX: Show loading state ONLY if we have no filters at all (not just normal filters)
  // This ensures common filters show immediately when available
  if (isLoading && allFilters.length === 0 && normalFilters.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          <p className="text-sm text-gray-500 mt-3 text-center">Loading filters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Normal Filters Section - Always Visible (Common Filters) */}
      {normalFilters.length > 0 ? (
        <div>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FiSliders className="w-4 h-4 text-blue-600" />
              Common Filters
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Available for all products ({normalFilters.length} filters)
            </p>
          </div>
          <div className="space-y-3">
            {normalFilters
              .sort((a, b) => a.order - b.order)
              .map(config => {
                // Skip category filter as it's handled separately
                if (config.key === 'category') return null;
                // Ensure unique key
                const uniqueKey = `normal-${config.key}-${config.order}`;
                const rendered = renderFilter(config);
                if (!rendered) {
                  console.warn(`⚠️ Filter ${config.key} (${config.type}) did not render`);
                  return null;
                }
                return (
                  <div key={uniqueKey}>
                    {rendered}
                  </div>
                );
              })
              .filter(Boolean)}
          </div>
        </div>
      ) : (
        !isLoading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ No common filters available. Please check backend configuration.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-xs text-yellow-700">
                API Response: {JSON.stringify(filterConfigData, null, 2)}
              </div>
            )}
          </div>
        )
      )}

      {/* Category-Level Filters - Show when category selected (no subcategory) */}
      {categorySlug && !subcategorySlug && specialFilters.length > 0 && (
        <div className="mt-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FiSliders className="w-4 h-4 text-green-600" />
              {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)} Filters
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {specialFilters.length} {specialFilters.length === 1 ? 'filter' : 'filters'} for this category
            </p>
          </div>
          <div className="space-y-3">
            {specialFilters
              .filter(config => !config.subcategoryId) // Only category-level filters
              .sort((a, b) => a.order - b.order)
              .map(config => (
                <div key={`category-${config.key}-${config.order}`}>
                  {renderFilter(config)}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Subcategory-Level Filters - Show when subcategory selected */}
      {categorySlug && subcategorySlug && specialFilters.length > 0 && (
        <div className="mt-4">
          {/* Category-level filters */}
          {specialFilters.filter(config => !config.subcategoryId).length > 0 && (
            <div className="mb-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FiSliders className="w-4 h-4 text-green-600" />
                  {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)} Filters
                </h3>
              </div>
              <div className="space-y-3">
                {specialFilters
                  .filter(config => !config.subcategoryId) // Category-level filters
                  .sort((a, b) => a.order - b.order)
                  .map(config => (
                    <div key={`category-${config.key}-${config.order}`}>
                      {renderFilter(config)}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Subcategory-specific filters */}
          {specialFilters.filter(config => config.subcategoryId).length > 0 && (
            <div>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3 mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FiSliders className="w-4 h-4 text-purple-600" />
                  {subcategorySlug.charAt(0).toUpperCase() + subcategorySlug.slice(1)} Specific Filters
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  {specialFilters.filter(config => config.subcategoryId).length} {specialFilters.filter(config => config.subcategoryId).length === 1 ? 'filter' : 'filters'} for this subcategory
                </p>
              </div>
              <div className="space-y-3">
                {specialFilters
                  .filter(config => config.subcategoryId) // Subcategory-specific filters
                  .sort((a, b) => a.order - b.order)
                  .map(config => (
                    <div key={`subcategory-${config.key}-${config.order}`}>
                      {renderFilter(config)}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clear All Button */}
      {activeFiltersCount > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={clearAllFilters}
            className="w-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <FiX className="w-4 h-4" />
            Clear All Filters ({activeFiltersCount})
          </button>
        </div>
      )}
    </div>
  );
}
