'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiX, FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface MobileFiltersProps {
  categorySlug?: string;
  subcategorySlug?: string;
  onFilterChange?: (filters: any) => void;
}

interface FilterState {
  brand: string[];
  ram: string[];
  storage: string[];
  condition: string[];
  minPrice: string;
  maxPrice: string;
  stateId: string;
  cityId: string;
  areaId: string;
  sort: string;
}

export default function MobileFilters({ categorySlug, subcategorySlug, onFilterChange }: MobileFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize filter state from URL params
  const [filters, setFilters] = useState<FilterState>(() => {
    const brandParam = searchParams.get('brand');
    const ramParam = searchParams.get('ram');
    const storageParam = searchParams.get('storage');
    const conditionParam = searchParams.get('condition');
    
    return {
      brand: brandParam ? brandParam.split(',').filter(Boolean) : [],
      ram: ramParam ? ramParam.split(',').filter(Boolean) : [],
      storage: storageParam ? storageParam.split(',').filter(Boolean) : [],
      condition: conditionParam ? conditionParam.split(',').filter(Boolean) : [],
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      stateId: searchParams.get('stateId') || '',
      cityId: searchParams.get('cityId') || '',
      areaId: searchParams.get('areaId') || '',
      sort: searchParams.get('sort') || 'newest',
    };
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['brand', 'price', 'condition', 'ram', 'storage', 'sort'])
  );

  // Fetch brands for mobile category
  const { data: brandsData } = useQuery({
    queryKey: ['brands', categorySlug, subcategorySlug],
    queryFn: async () => {
      if (!categorySlug) return [];
      try {
        const params: any = { categorySlug };
        if (subcategorySlug) params.subcategorySlug = subcategorySlug;
        const response = await api.get('/categories/brands', { params });
        return Array.isArray(response.data?.brands) ? response.data.brands : [];
      } catch (error) {
        console.error('Error fetching brands:', error);
        return [];
      }
    },
    enabled: !!categorySlug,
    staleTime: 5 * 60 * 1000,
  });

  // Extract unique RAM and Storage values from ads (could be fetched from API)
  const ramOptions = ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB'];
  const storageOptions = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'];
  const conditionOptions = [
    { value: 'NEW', label: 'New' },
    { value: 'USED', label: 'Used' },
    { value: 'REFURBISHED', label: 'Refurbished' },
  ];
  const sortOptions = [
    { value: 'newest', label: 'Latest' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'popular', label: 'Popular' },
  ];

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Update brand filter
    if (filters.brand.length > 0) {
      params.set('brand', filters.brand.join(','));
    } else {
      params.delete('brand');
    }
    
    // Update RAM filter
    if (filters.ram.length > 0) {
      params.set('ram', filters.ram.join(','));
    } else {
      params.delete('ram');
    }
    
    // Update Storage filter
    if (filters.storage.length > 0) {
      params.set('storage', filters.storage.join(','));
    } else {
      params.delete('storage');
    }
    
    // Update Condition filter
    if (filters.condition.length > 0) {
      params.set('condition', filters.condition.join(','));
    } else {
      params.delete('condition');
    }
    
    // Update Price filters
    if (filters.minPrice) {
      params.set('minPrice', filters.minPrice);
    } else {
      params.delete('minPrice');
    }
    
    if (filters.maxPrice) {
      params.set('maxPrice', filters.maxPrice);
    } else {
      params.delete('maxPrice');
    }
    
    // Update Location filters
    if (filters.stateId) {
      params.set('stateId', filters.stateId);
    } else {
      params.delete('stateId');
    }
    
    if (filters.cityId) {
      params.set('cityId', filters.cityId);
    } else {
      params.delete('cityId');
    }
    
    if (filters.areaId) {
      params.set('areaId', filters.areaId);
    } else {
      params.delete('areaId');
    }
    
    // Update Sort
    if (filters.sort && filters.sort !== 'newest') {
      params.set('sort', filters.sort);
    } else {
      params.delete('sort');
    }
    
    // Reset page when filters change
    params.delete('page');
    
    // Update URL without page reload
    router.replace(`?${params.toString()}`, { scroll: false });
    
    // Notify parent component if callback provided
    if (onFilterChange) {
      onFilterChange({
        brand: filters.brand.length > 0 ? filters.brand.join(',') : undefined,
        ram: filters.ram.length > 0 ? filters.ram.join(',') : undefined,
        storage: filters.storage.length > 0 ? filters.storage.join(',') : undefined,
        condition: filters.condition.length > 0 ? filters.condition.join(',') : undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        stateId: filters.stateId || undefined,
        cityId: filters.cityId || undefined,
        areaId: filters.areaId || undefined,
        sort: filters.sort || 'newest',
      });
    }
  }, [filters, router, searchParams, onFilterChange]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const toggleFilter = (type: 'brand' | 'ram' | 'storage' | 'condition', value: string) => {
    setFilters(prev => {
      const currentArray = prev[type];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(v => v !== value)
        : [...currentArray, value];
      return { ...prev, [type]: newArray };
    });
  };

  const clearFilters = () => {
    setFilters({
      brand: [],
      ram: [],
      storage: [],
      condition: [],
      minPrice: '',
      maxPrice: '',
      stateId: '',
      cityId: '',
      areaId: '',
      sort: 'newest',
    });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.brand.length > 0 ||
      filters.ram.length > 0 ||
      filters.storage.length > 0 ||
      filters.condition.length > 0 ||
      filters.minPrice !== '' ||
      filters.maxPrice !== '' ||
      filters.stateId !== '' ||
      filters.cityId !== '' ||
      filters.areaId !== '' ||
      filters.sort !== 'newest'
    );
  }, [filters]);

  const brands = Array.isArray(brandsData) ? brandsData : [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <FiX className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Brand Filter */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('brand')}
          className="flex items-center justify-between w-full text-left"
        >
          <h4 className="text-sm font-semibold text-gray-900">Brand</h4>
          {expandedSections.has('brand') ? (
            <FiChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <FiChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {expandedSections.has('brand') && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {brands.length > 0 ? (
              brands.map((brand: any) => {
                const brandName = typeof brand === 'string' ? brand : brand?.name || '';
                const isSelected = filters.brand.includes(brandName);
                return (
                  <label
                    key={brandName}
                    className="flex items-center gap-3 cursor-pointer py-1"
                  >
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFilter('brand', brandName)}
                        className="sr-only peer"
                      />
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-gray-300 hover:border-blue-400'
                      }`}>
                        {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <span className="text-sm text-gray-700 flex-1">{brandName}</span>
                  </label>
                );
              })
            ) : (
              <div className="text-sm text-gray-500 py-2">No brands available</div>
            )}
          </div>
        )}
      </div>

      {/* Price Range Filter */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left"
        >
          <h4 className="text-sm font-semibold text-gray-900">Price Range</h4>
          {expandedSections.has('price') ? (
            <FiChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <FiChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {expandedSections.has('price') && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Min Price</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="₹ Min"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Max Price</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="₹ Max"
              />
            </div>
          </div>
        )}
      </div>

      {/* Condition Filter */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('condition')}
          className="flex items-center justify-between w-full text-left"
        >
          <h4 className="text-sm font-semibold text-gray-900">Condition</h4>
          {expandedSections.has('condition') ? (
            <FiChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <FiChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {expandedSections.has('condition') && (
          <div className="mt-3 space-y-2">
            {conditionOptions.map(option => {
              const isSelected = filters.condition.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex items-center gap-3 cursor-pointer py-1"
                >
                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFilter('condition', option.value)}
                      className="sr-only peer"
                    />
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300 hover:border-blue-400'
                    }`}>
                      {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* RAM Filter */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('ram')}
          className="flex items-center justify-between w-full text-left"
        >
          <h4 className="text-sm font-semibold text-gray-900">RAM</h4>
          {expandedSections.has('ram') ? (
            <FiChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <FiChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {expandedSections.has('ram') && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {ramOptions.map(ram => {
              const isSelected = filters.ram.includes(ram);
              return (
                <label
                  key={ram}
                  className="flex items-center gap-3 cursor-pointer py-1"
                >
                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFilter('ram', ram)}
                      className="sr-only peer"
                    />
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300 hover:border-blue-400'
                    }`}>
                      {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 flex-1">{ram}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Storage Filter */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('storage')}
          className="flex items-center justify-between w-full text-left"
        >
          <h4 className="text-sm font-semibold text-gray-900">Storage</h4>
          {expandedSections.has('storage') ? (
            <FiChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <FiChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {expandedSections.has('storage') && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {storageOptions.map(storage => {
              const isSelected = filters.storage.includes(storage);
              return (
                <label
                  key={storage}
                  className="flex items-center gap-3 cursor-pointer py-1"
                >
                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFilter('storage', storage)}
                      className="sr-only peer"
                    />
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300 hover:border-blue-400'
                    }`}>
                      {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 flex-1">{storage}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Sort Filter */}
      <div className="border-b border-gray-200 pb-4">
        <button
          onClick={() => toggleSection('sort')}
          className="flex items-center justify-between w-full text-left"
        >
          <h4 className="text-sm font-semibold text-gray-900">Sort By</h4>
          {expandedSections.has('sort') ? (
            <FiChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <FiChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {expandedSections.has('sort') && (
          <div className="mt-3 space-y-2">
            {sortOptions.map(option => {
              const isSelected = filters.sort === option.value;
              return (
                <label
                  key={option.value}
                  className="flex items-center gap-3 cursor-pointer py-1"
                >
                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <input
                      type="radio"
                      name="sort"
                      checked={isSelected}
                      onChange={() => setFilters(prev => ({ ...prev, sort: option.value }))}
                      className="sr-only peer"
                    />
                    <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300 hover:border-blue-400'
                    }`}>
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 flex-1">{option.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
