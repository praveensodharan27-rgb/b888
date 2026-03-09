'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import FilterCard from './FilterCard';
import { FiTag, FiX, FiSearch, FiCheckCircle } from 'react-icons/fi';
import api from '@/lib/api';

interface BrandFilterCardProps {
  selectedBrands?: string[];
  onBrandsChange?: (brands: string[]) => void;
  categorySlug?: string;
}

export default function BrandFilterCard({
  selectedBrands = [],
  onBrandsChange,
  categorySlug,
}: BrandFilterCardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(8);

  // Fetch brands
  const { data: brands = [], isLoading } = useQuery<string[]>({
    queryKey: ['brands', categorySlug],
    queryFn: async () => {
      try {
        const response = await api.get('/brands', {
          params: categorySlug ? { category: categorySlug } : {},
        });
        return response.data?.brands || response.data || [];
      } catch (error) {
        console.error('Error fetching brands:', error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Filter brands by search
  const filteredBrands = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = searchQuery 
      ? brands.filter(brand => brand.toLowerCase().includes(query))
      : brands;
    
    // Show all when searching, otherwise show based on visibleCount
    if (searchQuery) {
      return filtered;
    }
    return filtered.slice(0, visibleCount);
  }, [brands, searchQuery, visibleCount]);
  
  const hasMore = !searchQuery && brands.length > visibleCount;
  const remainingCount = brands.length - visibleCount;

  const handleToggleBrand = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      onBrandsChange?.(selectedBrands.filter(b => b !== brand));
    } else {
      onBrandsChange?.([...selectedBrands, brand]);
    }
  };

  const handleClear = () => {
    onBrandsChange?.([]);
    setSearchQuery('');
  };

  return (
    <FilterCard
      title="BRAND"
      icon={<FiTag className="w-4 h-4" />}
      selectedCount={selectedBrands.length}
    >
      {isLoading ? (
        <div className="py-4">
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-gray-200 rounded-lg"></div>
            <div className="h-8 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       text-sm"
            />
          </div>

          {/* Selected Brands Display */}
          {selectedBrands.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-blue-50 rounded-lg">
              {selectedBrands.map((brand) => (
                <span
                  key={brand}
                  className="inline-flex items-center gap-1 px-2 py-1 
                           bg-blue-100 text-blue-700 rounded-full text-xs font-semibold"
                >
                  {brand}
                  <button
                    onClick={() => handleToggleBrand(brand)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                    aria-label={`Remove ${brand}`}
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={handleClear}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Brand List */}
          <div className="space-y-1">
            {filteredBrands.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No brands found
              </p>
            ) : (
              <>
                {filteredBrands.map((brand) => {
                  const isSelected = selectedBrands.includes(brand);
                  return (
                    <button
                      key={brand}
                      onClick={() => handleToggleBrand(brand)}
                      className={`
                        w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-colors duration-200
                        ${
                          isSelected
                            ? 'bg-blue-100 text-blue-700'
                            : 'hover:bg-gray-50 text-gray-700'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span>{brand}</span>
                        {isSelected && (
                          <FiCheckCircle className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
                
                {/* View More / View Less Button */}
                {hasMore && (
                  <button
                    onClick={() => setVisibleCount(brands.length)}
                    className="w-full mt-2 px-3 py-2.5 rounded-lg text-sm font-semibold
                             text-primary-600 hover:bg-primary-50 transition-colors
                             border border-primary-200 hover:border-primary-300"
                  >
                    View More
                  </button>
                )}
                
                {/* View Less Button */}
                {!searchQuery && visibleCount > 8 && (
                  <button
                    onClick={() => setVisibleCount(8)}
                    className="w-full mt-2 px-3 py-2.5 rounded-lg text-sm font-semibold
                             text-gray-600 hover:bg-gray-50 transition-colors
                             border border-gray-200 hover:border-gray-300"
                  >
                    View Less
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </FilterCard>
  );
}
