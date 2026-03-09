'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FiChevronDown, FiChevronUp, FiX, FiCheck } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface FilterOption {
  value: string;
  label: string;
  order?: number;
}

interface FilterConfig {
  key: string;
  name: string;
  label: string;
  type: 'select' | 'multi' | 'range' | 'toggle' | 'SELECT' | 'MULTI' | 'RANGE' | 'TOGGLE' | 'dropdown';
  order: number;
  isRequired: boolean;
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  defaultValue?: boolean;
  priceMin?: number;
  priceMax?: number;
  priceStep?: number;
  options: FilterOption[];
  categoryId?: string | null;
  subcategoryId?: string | null;
  filterable?: boolean;
}

interface DynamicFiltersProps {
  categorySlug?: string;
  subcategorySlug?: string;
  categoryId?: string;
  filters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
}

/**
 * DynamicFilters Component
 * Fetches and displays filters dynamically based on category/subcategory
 */
export default function DynamicFilters({
  categorySlug,
  subcategorySlug,
  categoryId,
  filters,
  onFilterChange,
}: DynamicFiltersProps) {
  // Start with common filter keys open; once API filters load, expand all sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(['price', 'condition', 'postedTime', 'sort'])
  );
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(filters);
  const hasInitializedExpandAll = useRef(false);

  // ✅ FIX 1: Fetch filter configurations with proper loading guard
  const { data: filterConfigData, isLoading: configLoading } = useQuery<{
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
  }>({
    queryKey: ['filter-configurations', categorySlug, subcategorySlug],
    queryFn: async () => {
      try {
        const params: any = {};
        if (categorySlug) params.categorySlug = categorySlug;
        if (subcategorySlug) params.subcategorySlug = subcategorySlug;
        if (categoryId) params.categoryId = categoryId;

        const response = await api.get('/filter-configurations', { params });
        
        // ✅ FIX 2: ALWAYS return valid structure - never null
        const safeData = response.data || {};
        const safeFilters = safeData.filters || {};
        
        return {
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
        };
      } catch (error: any) {
        console.error('❌ Error fetching filters:', error);
        
        // ✅ FIX 2: Return safe fallback structure on error - NEVER null
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
        };
      }
    },
    enabled: true, // Always enabled to show normal filters
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 2,
  });

  // ✅ FIX 2: Make filterConfig Always Safe - Never null/undefined
  // Define this BEFORE any conditional returns to ensure it's always in scope
  const filterConfigSafe = filterConfigData ?? {
    success: true,
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
  };

  // Get normal and special filters
  let normalFilters = filterConfigSafe.filters?.normal || [];
  let specialFilters = categorySlug ? (filterConfigSafe.filters?.special || []) : [];
  
  // ✅ FIX 3: Silent Deduplication - No Warnings
  const normalFilterMap = new Map<string, FilterConfig>();
  normalFilters.forEach(filter => {
    if (filter && filter.key) {
      if (!normalFilterMap.has(filter.key)) {
        normalFilterMap.set(filter.key, filter);
      }
    }
  });
  normalFilters = Array.from(normalFilterMap.values());
  
  const specialFilterMap = new Map<string, FilterConfig>();
  specialFilters.forEach(filter => {
    if (filter && filter.key) {
      if (!specialFilterMap.has(filter.key)) {
        specialFilterMap.set(filter.key, filter);
      }
    }
  });
  specialFilters = Array.from(specialFilterMap.values());
  
  // Combine and ensure no duplicates between normal and special
  const allFilterMap = new Map<string, FilterConfig>();
  [...normalFilters, ...specialFilters].forEach(filter => {
    if (filter && filter.key) {
      if (!allFilterMap.has(filter.key)) {
        allFilterMap.set(filter.key, filter);
      }
    }
  });
  const allFilters = Array.from(allFilterMap.values());
  const allFilterKeys = useMemo(() => allFilters.map((f) => f.key).join(','), [allFilters]);

  // Keep accordion open: when filters load from API, expand all sections (once)
  useEffect(() => {
    if (allFilters.length > 0 && !hasInitializedExpandAll.current) {
      setExpandedSections(new Set(allFilters.map((f) => f.key)));
      hasInitializedExpandAll.current = true;
    }
  }, [allFilterKeys]);

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

  // ✅ FIX 4: Initialize local filters from URL filters - Only when filters actually change
  const filtersString = useMemo(() => JSON.stringify(filters || {}), [filters]);
  useEffect(() => {
    if (filters && Object.keys(filters).length > 0) {
      setLocalFilters(filters);
    }
  }, [filtersString]);

  // Sync local filters with props
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const updateLocalFilter = useCallback((key: string, value: any) => {
    setLocalFilters(prev => {
      const updated = { ...prev };
      if (value === null || value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        delete updated[key];
      } else {
        updated[key] = value;
      }
      return updated;
    });
  }, []);

  // Apply filters
  const applyFilters = useCallback(() => {
    onFilterChange(localFilters);
  }, [localFilters, onFilterChange]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setLocalFilters({});
    onFilterChange({});
  }, [onFilterChange]);

  // Get available filter configurations - remove duplicates by key
  const availableFilters = useMemo(() => {
    // ✅ FIX 2: filterConfig is already safe (set above), but ensure structure
    if (!filterConfigSafe) {
      return [];
    }
    
    // Handle different response formats
    let filtersArray: FilterConfig[] = [];
    if (Array.isArray(filterConfigSafe.filters?.all)) {
      filtersArray = filterConfigSafe.filters.all;
    } else if (Array.isArray(filterConfigSafe.filters?.normal)) {
      filtersArray = [...filterConfigSafe.filters.normal];
      if (Array.isArray(filterConfigSafe.filters?.special)) {
        filtersArray = [...filtersArray, ...filterConfigSafe.filters.special];
      }
    }
    
    if (filtersArray.length === 0) {
      return [];
    }
    
    // Normalize filters
    const normalizedFilters = filtersArray.map(filter => {
      if (!filter || typeof filter !== 'object') {
        return null;
      }
      
      if (!filter.key && !filter.name) {
        return null;
      }
      
      const filterKey = filter.key || filter.name;
      
      return {
        ...filter,
        key: filterKey,
        name: filter.name || filterKey,
        label: filter.label || filter.name || filterKey,
        type: filter.type || 'dropdown',
        filterable: filter.filterable !== undefined ? filter.filterable : true,
        options: Array.isArray(filter.options) ? filter.options : (filter.options ? [filter.options] : []),
      };
    }).filter(Boolean) as FilterConfig[];
    
    // ✅ FIX 3: Silent Deduplication - No console warnings
    const filterMap = new Map<string, FilterConfig>();
    normalizedFilters.forEach(filter => {
      if (filter && filter.key) {
        // Silently override duplicates - keep first occurrence
        if (!filterMap.has(filter.key)) {
          filterMap.set(filter.key, filter);
        }
      }
    });
    const uniqueFilters = Array.from(filterMap.values());
    
    // Only show filters that are filterable
    const filterableFilters = uniqueFilters.filter(filter => {
      return filter.filterable !== false;
    });
    
    // ✅ FIX 4: Only log when filter keys actually change (not on every render)
    if (process.env.NODE_ENV === 'development' && filterableFilters.length > 0) {
      const filterKeys = filterableFilters.map(f => f.key).sort().join(',');
      const lastLoggedKeys = (window as any).__lastFilterKeys;
      if (lastLoggedKeys !== filterKeys) {
        (window as any).__lastFilterKeys = filterKeys;
        console.log('✅ Available filters processed:', {
          total: filtersArray.length,
          normalized: normalizedFilters.length,
          unique: uniqueFilters.length,
          filterable: filterableFilters.length,
        });
      }
    }
    
    return filterableFilters;
  }, [filterConfigSafe]); // ✅ FIX 4: Use safe filter config, not raw data

  // Merge filter options with actual values from ads
  const getFilterOptions = useCallback((filter: FilterConfig) => {
    if (filter.type !== 'dropdown' && filter.type !== 'multi' && filter.type !== 'SELECT' && filter.type !== 'MULTI') {
      return filter.options || [];
    }
    
    // If filter has predefined options, use them
    if (filter.options && filter.options.length > 0) {
      return filter.options;
    }
    
    return filter.options || [];
  }, []);

  // Handle filter input changes
  const handleFilterChange = useCallback((key: string, value: any) => {
    updateLocalFilter(key, value);
    // Auto-apply for immediate feedback (or debounce if needed)
    setTimeout(() => {
      const updated = { ...localFilters, [key]: value };
      if (value === null || value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        delete updated[key];
      }
      onFilterChange(updated);
    }, 300); // Debounce 300ms
  }, [localFilters, onFilterChange, updateLocalFilter]);

  // Render filter based on type
  const renderFilter = useCallback((filter: FilterConfig) => {
    if (!filter || !filter.key) {
      return null;
    }

    const isExpanded = expandedSections.has(filter.key);
    const currentValue = localFilters[filter.key];
    const options = getFilterOptions(filter);

    // For brand filter, use dynamically fetched brands
    let filterOptions = options;
    if (filter.key === 'brand' && brands.length > 0) {
      filterOptions = brands.map((brand: any) => ({
        value: brand.slug || brand.name,
        label: brand.name,
      }));
    }

    // Normalize type to lowercase for switch statement
    const filterType = (filter.type || '').toLowerCase();

    switch (filterType) {
      case 'select':
      case 'multi':
        const selectedValues = Array.isArray(currentValue)
          ? currentValue
          : currentValue
          ? [currentValue]
          : [];

        return (
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <button
              onClick={() => toggleSection(filter.key)}
              className="flex items-center justify-between w-full mb-4"
            >
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                {filter.label}
              </h3>
              {isExpanded ? (
                <FiChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <FiChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {isExpanded && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filterOptions.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No options available yet
                  </p>
                ) : (
                  filterOptions.map((option, idx) => {
                    const isSelected = selectedValues.includes(option.value);
                    const optionKey = `${filter.key}-${option.value ?? option.label ?? idx}-${idx}`;
                    return (
                      <label
                        key={optionKey}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                      >
                        <input
                          type={filterType === 'multi' ? 'checkbox' : 'radio'}
                          checked={isSelected}
                          onChange={() => {
                            if (filterType === 'multi') {
                              const newValues = isSelected
                                ? selectedValues.filter(v => v !== option.value)
                                : [...selectedValues, option.value];
                              handleFilterChange(filter.key, newValues.length > 0 ? newValues : null);
                            } else {
                              handleFilterChange(filter.key, isSelected ? null : option.value);
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                        {isSelected && <FiCheck className="w-4 h-4 text-blue-600" />}
                      </label>
                    );
                  })
                )}
                {selectedValues.length > 0 && (
                  <button
                    onClick={() => handleFilterChange(filter.key, null)}
                    className="w-full mt-2 text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 'range':
        const minValue = currentValue?.min || filter.min || 0;
        const maxValue = currentValue?.max || filter.max || 1000000;
        return (
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <button
              onClick={() => toggleSection(filter.key)}
              className="flex items-center justify-between w-full mb-4"
            >
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                {filter.label}
              </h3>
              {isExpanded ? (
                <FiChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <FiChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {isExpanded && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 mb-1 block">Min</label>
                    <input
                      type="number"
                      value={minValue}
                      onChange={(e) => {
                        const newMin = parseFloat(e.target.value) || 0;
                        handleFilterChange(filter.key, { min: newMin, max: maxValue });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      min={filter.min || 0}
                      max={filter.max || 1000000}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 mb-1 block">Max</label>
                    <input
                      type="number"
                      value={maxValue}
                      onChange={(e) => {
                        const newMax = parseFloat(e.target.value) || filter.max || 1000000;
                        handleFilterChange(filter.key, { min: minValue, max: newMax });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      min={filter.min || 0}
                      max={filter.max || 1000000}
                    />
                  </div>
                </div>
                {(minValue > (filter.min || 0) || maxValue < (filter.max || 1000000)) && (
                  <button
                    onClick={() => handleFilterChange(filter.key, null)}
                    className="w-full text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear range
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 'toggle':
        return (
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">
                  {filter.label}
                </h3>
                {filter.helpText && (
                  <p className="text-xs text-gray-500">{filter.helpText}</p>
                )}
              </div>
              <button
                onClick={() => handleFilterChange(filter.key, !currentValue)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  currentValue ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    currentValue ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [expandedSections, localFilters, getFilterOptions, brands, toggleSection, handleFilterChange]);

  if (allFilters.length === 0 && !configLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <p className="text-sm text-gray-500 text-center mb-3">
          No filters available
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-400 space-y-1">
            <div>Debug: normalFilters={normalFilters.length}, specialFilters={specialFilters.length}</div>
            <div>API Data: {filterConfigSafe ? 'Received' : 'Not received'}</div>
            <div>Category: {categorySlug || 'None'}, Subcategory: {subcategorySlug || 'None'}</div>
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

  // ✅ FIX 1: Loading state - handle in JSX instead of early return
  if (configLoading && !filterConfigData) {
    return (
      <div className="p-4 text-gray-500 text-center">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
        <p className="text-sm mt-2">Loading filters...</p>
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
              <FiChevronDown className="w-4 h-4 text-blue-600" />
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
        !configLoading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ No common filters available. Please check backend configuration.
            </p>
          </div>
        )
      )}

      {/* Category-Level Filters - Show when category selected (no subcategory) */}
      {categorySlug && !subcategorySlug && specialFilters.length > 0 && (
        <div className="mt-4">
          <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-lg p-3 mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FiChevronDown className="w-4 h-4 text-blue-600" />
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
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-lg p-3 mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FiChevronDown className="w-4 h-4 text-blue-600" />
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
                  <FiChevronDown className="w-4 h-4 text-purple-600" />
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
