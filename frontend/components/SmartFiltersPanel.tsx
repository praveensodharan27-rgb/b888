'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ListingFilters } from '@/hooks/useListingFilters';

interface SmartFiltersPanelProps {
  filters: ListingFilters;
  onFilterChange: (filters: Partial<ListingFilters>) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function SmartFiltersPanel({
  filters,
  onFilterChange,
  isExpanded = true,
  onToggleExpand,
}: SmartFiltersPanelProps) {
  const [localMinPrice, setLocalMinPrice] = useState(filters.minPrice || '');
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice || '');

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const response = await api.get('/categories');
        return response.data.categories || [];
      } catch (error) {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const response = await api.get('/locations');
        return response.data.locations || [];
      } catch (error) {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch brands (category-wise if category is selected)
  const { data: brandsData } = useQuery({
    queryKey: ['brands', filters.category || 'popular'],
    queryFn: async () => {
      try {
        const params = filters.category ? `?category=${encodeURIComponent(filters.category)}` : '';
        const response = await api.get(`/brands${params}`);
        const categoryBrands = response.data?.brands || [];

        if (Array.isArray(categoryBrands) && categoryBrands.length > 0) {
          return categoryBrands;
        }

        // Fallback: global popular brands
        const popularResponse = await api.get('/brands');
        return popularResponse.data?.brands || [];
      } catch (error) {
        return [];
      }
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesData || [];
  const locations = locationsData || [];
  const brands = brandsData || [];

  // Get subcategories for selected category
  const selectedCategory = useMemo(() => {
    return categories.find((cat: any) => cat.slug === filters.category);
  }, [categories, filters.category]);

  const subcategories = selectedCategory?.subcategories || [];

  // Update local price state when filters change externally
  useEffect(() => {
    setLocalMinPrice(filters.minPrice || '');
    setLocalMaxPrice(filters.maxPrice || '');
  }, [filters.minPrice, filters.maxPrice]);

  const handleCategoryChange = (categorySlug: string) => {
    onFilterChange({
      category: categorySlug || undefined,
      subcategory: undefined, // Clear subcategory when category changes
    });
  };

  const handleSubcategoryChange = (subcategorySlug: string) => {
    onFilterChange({
      subcategory: subcategorySlug || undefined,
    });
  };

  const handleLocationChange = (locationSlug: string) => {
    onFilterChange({
      location: locationSlug || undefined,
    });
  };

  const handleConditionChange = (condition: string) => {
    onFilterChange({
      condition: condition || undefined,
    });
  };

  const handlePriceChange = () => {
    onFilterChange({
      minPrice: localMinPrice || undefined,
      maxPrice: localMaxPrice || undefined,
    });
  };

  const handleBrandChange = (brandName: string) => {
    // For now, we'll use search filter for brand
    // This can be enhanced later with a dedicated brands filter
    onFilterChange({
      search: brandName || undefined,
    });
  };

  const clearFilters = () => {
    setLocalMinPrice('');
    setLocalMaxPrice('');
    onFilterChange({
      category: undefined,
      subcategory: undefined,
      location: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      condition: undefined,
      search: undefined,
    });
  };

  const conditionOptions = [
    { value: 'new', label: 'New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="text-gray-500 hover:text-gray-700 lg:hidden"
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          {subcategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subcategory
              </label>
              <select
                value={filters.subcategory || ''}
                onChange={(e) => handleSubcategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Subcategories</option>
                {subcategories.map((subcat: any) => (
                  <option key={subcat.id} value={subcat.slug}>
                    {subcat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <select
              value={filters.location || ''}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Locations</option>
              {locations.map((loc: any) => (
                <option key={loc.id} value={loc.slug}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={localMinPrice}
                onChange={(e) => setLocalMinPrice(e.target.value)}
                onBlur={handlePriceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max"
                value={localMaxPrice}
                onChange={(e) => setLocalMaxPrice(e.target.value)}
                onBlur={handlePriceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Condition Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition
            </label>
            <select
              value={filters.condition || ''}
              onChange={(e) => handleConditionChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Conditions</option>
              {conditionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Brands Filter */}
          {brands.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Popular Brands
              </label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {brands.slice(0, 12).map((brand: any) => (
                  <label
                    key={brand.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={filters.search === brand.name}
                      onChange={() => handleBrandChange(brand.name)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{brand.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters Button */}
          <button
            onClick={clearFilters}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
