'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiX, FiCheck } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import RangeSlider from './RangeSlider';

interface FilterSchema {
  name: string;
  label: string;
  type: 'dropdown' | 'range' | 'text' | 'toggle';
  key: string;
  options?: Array<{ value: string; label: string }>;
  multiple?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

interface FilterSidebarProps {
  categoryId?: string;
  filters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  isLoading?: boolean;
}

export default function FilterSidebar({
  categoryId,
  filters,
  onFilterChange,
  isLoading: externalLoading = false,
}: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['categories', 'price', 'condition', 'distance', 'postedWithin']));

  // Fetch filter schema from API
  const { data: filterSchema, isLoading: isLoadingSchema, refetch } = useQuery({
    queryKey: ['filter-schema', categoryId],
    queryFn: async () => {
      if (!categoryId) return { filters: [] };
      
      try {
        const response = await api.get('/ads/filters', {
          params: { categoryId },
        });
        
        const filterData = response.data?.filters || [];
        
        console.log('✅ Filter schema fetched:', {
          categoryId,
          filterCount: filterData.length,
        });
        
        return {
          success: response.data?.success !== false,
          filters: filterData,
          category: response.data?.category,
        };
      } catch (error: any) {
        console.error('❌ Error fetching filter schema:', error);
        
        if (error.response?.data?.filters && Array.isArray(error.response.data.filters)) {
          return {
            success: false,
            filters: error.response.data.filters,
            error: error.response.data.error,
          };
        }
        
        // Return base filters on error
        return {
          success: false,
          filters: [
            {
              name: 'price',
              label: 'Price Range',
              type: 'range',
              key: 'price',
              min: 0,
              max: 10000000,
              step: 1000,
            },
            {
              name: 'condition',
              label: 'Condition',
              type: 'dropdown',
              key: 'condition',
              options: [
                { value: 'NEW', label: 'New' },
                { value: 'USED', label: 'Used' },
                { value: 'LIKE_NEW', label: 'Like New' },
                { value: 'REFURBISHED', label: 'Refurbished' },
              ],
            },
          ],
        };
      }
    },
    enabled: !!categoryId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const filterSchemas: FilterSchema[] = filterSchema?.filters || [];
  const isLoading = isLoadingSchema || externalLoading;

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const handleFilterChange = (key: string, value: any) => {
    if (value === '' || value === null || value === undefined) {
      onFilterChange({ [key]: '' });
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      const hasValue = Object.values(value).some(v => v !== '' && v !== null && v !== undefined);
      onFilterChange({ [key]: hasValue ? value : '' });
    } else {
      onFilterChange({ [key]: value });
    }
  };

  const clearAllFilters = () => {
    const standardFilterKeys = ['category', 'subcategory', 'minPrice', 'maxPrice', 'condition', 'search', 'sort', 'location', 'city', 'state', 'latitude', 'longitude', 'radius'];
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
    allFilters.condition = '';
    
    onFilterChange(allFilters);
  };

  const hasActiveFilters = () => {
    const standardFilterKeys = ['category', 'subcategory', 'minPrice', 'maxPrice', 'condition', 'search', 'sort', 'location', 'city', 'state', 'latitude', 'longitude', 'radius'];
    return Object.keys(filters).some(key => {
      const value = filters[key];
      if (standardFilterKeys.includes(key)) {
        return value && value !== '';
      }
      return value && value !== '';
    });
  };

  if (isLoading) {
    return (
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          {hasActiveFilters() && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Verified Sellers Toggle - Always show */}
        <div className="border-b border-gray-200 pb-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-semibold text-gray-900">Verified Sellers</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={!!filters.verifiedSeller}
                onChange={(e) => handleFilterChange('verifiedSeller', e.target.checked ? 'true' : '')}
                className="sr-only"
              />
                <div
                  className={`w-11 h-6 rounded-full transition-colors ${
                    filters.verifiedSeller ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                    filters.verifiedSeller ? 'translate-x-5' : 'translate-x-0.5'
                  } mt-0.5`}
                />
              </div>
            </div>
          </label>
        </div>

        {/* Filter Sections */}
        {filterSchemas.map((filter) => {
          const isExpanded = expandedSections.has(filter.key);
          const filterValue = filters[filter.key];

          return (
            <div key={filter.key} className="border-b border-gray-200 pb-4 last:border-b-0">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(filter.key)}
                className="w-full flex items-center justify-between mb-3"
              >
                <span className="text-sm font-semibold text-gray-900">{filter.label}</span>
                {isExpanded ? (
                  <FiChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <FiChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="space-y-3">
                  {/* Toggle Type */}
                  {filter.type === 'toggle' && (
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-700">{filter.label}</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={!!filterValue}
                          onChange={(e) => handleFilterChange(filter.key, e.target.checked ? 'true' : '')}
                          className="sr-only"
                        />
                        <div
                          className={`w-11 h-6 rounded-full transition-colors ${
                            filterValue ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                              filterValue ? 'translate-x-5' : 'translate-x-0.5'
                            } mt-0.5`}
                          />
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Dropdown/Checkbox Type */}
                  {filter.type === 'dropdown' && (
                    <div className="space-y-2">
                      {filter.options && filter.options.length > 0 ? (
                        filter.options.map((option) => {
                          const isSelected = filter.multiple
                            ? Array.isArray(filterValue) && filterValue.includes(option.value)
                            : filterValue === option.value;

                          return (
                            <label
                              key={option.value}
                              className="flex items-center gap-3 cursor-pointer group py-1"
                            >
                              <div className="relative flex items-center justify-center flex-shrink-0">
                                <input
                                  type={filter.multiple ? 'checkbox' : 'radio'}
                                  checked={isSelected}
                                  onChange={() => {
                                    if (filter.multiple) {
                                      const currentValues = Array.isArray(filterValue) ? filterValue : [];
                                      const newValues = isSelected
                                        ? currentValues.filter((v) => v !== option.value)
                                        : [...currentValues, option.value];
                                      handleFilterChange(filter.key, newValues.length > 0 ? newValues : '');
                                    } else {
                                      handleFilterChange(filter.key, isSelected ? '' : option.value);
                                    }
                                  }}
                                  className="sr-only"
                                />
                                <div
                                  className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? 'bg-blue-600 border-blue-600'
                                      : 'bg-white border-gray-300 group-hover:border-blue-400'
                                  }`}
                                >
                                  {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                                </div>
                              </div>
                              <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                              {/* Item count - would be dynamic from API */}
                              <span className="text-xs text-gray-500">({Math.floor(Math.random() * 1000)})</span>
                            </label>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500">No options available</p>
                      )}
                    </div>
                  )}

                  {/* Range Type */}
                  {filter.type === 'range' && (
                    <div className="space-y-4">
                      {/* Min/Max Inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            MIN {filter.label.toUpperCase()}
                          </label>
                          <input
                            type="number"
                            min={filter.min || 0}
                            max={filter.max || 10000000}
                            step={filter.step || 1000}
                            value={typeof filterValue === 'object' && filterValue?.min !== undefined ? filterValue.min : ''}
                            onChange={(e) => {
                              const min = e.target.value ? parseFloat(e.target.value) : '';
                              const max = (typeof filterValue === 'object' && filterValue?.max !== undefined) ? filterValue.max : '';
                              handleFilterChange(filter.key, min || max ? { min, max } : '');
                            }}
                            placeholder="0"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            MAX {filter.label.toUpperCase()}
                          </label>
                          <input
                            type="number"
                            min={filter.min || 0}
                            max={filter.max || 10000000}
                            step={filter.step || 1000}
                            value={typeof filterValue === 'object' && filterValue?.max !== undefined ? filterValue.max : ''}
                            onChange={(e) => {
                              const min = (typeof filterValue === 'object' && filterValue?.min !== undefined) ? filterValue.min : '';
                              const max = e.target.value ? parseFloat(e.target.value) : '';
                              handleFilterChange(filter.key, min || max ? { min, max } : '');
                            }}
                            placeholder="1000+"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Range Slider */}
                      <RangeSlider
                        min={filter.min || 0}
                        max={filter.max || 10000000}
                        value={{
                          min: typeof filterValue === 'object' && filterValue?.min !== undefined 
                            ? filterValue.min 
                            : filter.min || 0,
                          max: typeof filterValue === 'object' && filterValue?.max !== undefined 
                            ? filterValue.max 
                            : filter.max || 10000000,
                        }}
                        onChange={(newValue) => handleFilterChange(filter.key, newValue)}
                        step={filter.step || 1000}
                        formatValue={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
                      />
                    </div>
                  )}

                  {/* Text Type */}
                  {filter.type === 'text' && (
                    <input
                      type="text"
                      value={filterValue || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      placeholder={filter.placeholder || `Enter ${filter.label}`}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Distance Filter - Always show if location available */}
        {filters.latitude && filters.longitude && (
          <div className="border-b border-gray-200 pb-4">
            <button
              onClick={() => toggleSection('distance')}
              className="w-full flex items-center justify-between mb-3"
            >
              <span className="text-sm font-semibold text-gray-900">Distance</span>
              {expandedSections.has('distance') ? (
                <FiChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <FiChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {expandedSections.has('distance') && (
              <div className="space-y-3">
                <RangeSlider
                  min={0}
                  max={100}
                  value={{
                    min: 0,
                    max: parseFloat(filters.radius || '25'),
                  }}
                  onChange={(newValue) => {
                    const maxValue = Array.isArray(newValue) ? newValue[1] : newValue.max;
                    handleFilterChange('radius', String(maxValue));
                  }}
                  step={5}
                  formatValue={(v) => `${v} miles`}
                />
              </div>
            )}
          </div>
        )}

        {/* Posted Within - Always show */}
        <div className="border-b border-gray-200 pb-4">
          <button
            onClick={() => toggleSection('postedWithin')}
            className="w-full flex items-center justify-between mb-3"
          >
            <span className="text-sm font-semibold text-gray-900">Posted Within</span>
            {expandedSections.has('postedWithin') ? (
              <FiChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <FiChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {expandedSections.has('postedWithin') && (
            <select
              value={filters.postedWithin || ''}
              onChange={(e) => handleFilterChange('postedWithin', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Any time</option>
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          )}
        </div>

        {/* Apply Filters Button - Always show */}
        <button
          onClick={() => {
            // Filters are applied automatically via onFilterChange
            console.log('Apply filters clicked');
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-sm"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
