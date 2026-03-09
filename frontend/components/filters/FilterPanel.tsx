'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFilterState, FilterState } from '@/hooks/useFilterState';
import CategoryFilterCard from './CategoryFilterCard';
import BrandFilterCard from './BrandFilterCard';
import PriceFilterCard from './PriceFilterCard';
import ConditionFilterCard from './ConditionFilterCard';
import PostedTimeFilterCard from './PostedTimeFilterCard';
import SellerTypeFilterCard from './SellerTypeFilterCard';
import RatingFilterCard from './RatingFilterCard';
import FeaturesFilterCard from './FeaturesFilterCard';
import { FiX, FiFilter } from 'react-icons/fi';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

/**
 * Main Filter Panel Component
 * Mobile: Bottom sheet
 * Desktop: Side panel
 */
export default function FilterPanel({
  isOpen,
  onClose,
  isMobile = false,
}: FilterPanelProps) {
  const { filters, updateFilter, clearAll, activeFilterCount } = useFilterState();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Close on outside click (desktop)
  useEffect(() => {
    if (!isMobile && isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-filter-panel]')) {
          onClose();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isMobile, onClose]);

  // Prevent body scroll when mobile panel is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isMobile, isOpen]);

  const toggleCard = useCallback((cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);

  const handleCategoryChange = useCallback((categorySlug: string | null) => {
    updateFilter({ categorySlug: categorySlug || undefined });
    if (!categorySlug) {
      updateFilter({ subcategorySlug: undefined });
    }
  }, [updateFilter]);

  const handleSubcategoryChange = useCallback((subcategorySlug: string | null) => {
    updateFilter({ subcategorySlug: subcategorySlug || undefined });
  }, [updateFilter]);

  const handleBrandsChange = useCallback((brands: string[]) => {
    updateFilter({ brands });
  }, [updateFilter]);

  const handlePriceChange = useCallback((min: number | undefined, max: number | undefined) => {
    updateFilter({ minPrice: min, maxPrice: max });
  }, [updateFilter]);

  const handleConditionChange = useCallback((condition: FilterState['condition']) => {
    updateFilter({ condition: condition || undefined });
  }, [updateFilter]);

  const handlePostedTimeChange = useCallback((postedTime: FilterState['postedTime']) => {
    updateFilter({ postedTime: postedTime || undefined });
  }, [updateFilter]);

  const handleSellerTypeChange = useCallback((sellerType: FilterState['sellerType']) => {
    updateFilter({ sellerType: sellerType || undefined });
  }, [updateFilter]);

  const handleRatingChange = useCallback((rating: number | null) => {
    updateFilter({ minRating: rating || undefined });
  }, [updateFilter]);

  const handleFeaturesChange = useCallback((features: FilterState['features']) => {
    updateFilter({ features });
  }, [updateFilter]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black bg-opacity-50 z-40
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={isMobile ? onClose : undefined}
      />

      {/* Panel */}
      <div
        data-filter-panel
        className={`
          fixed z-50 bg-white shadow-2xl
          transition-transform duration-300 ease-in-out
          ${isMobile 
            ? 'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-3xl' 
            : 'top-0 right-0 w-96 h-full'
          }
          ${isOpen ? 'translate-y-0' : isMobile ? 'translate-y-full' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiFilter className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              {activeFilterCount > 0 && (
                <span className="bg-primary-600 text-white text-xs font-medium 
                               px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close filters"
              >
                <FiX className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Cards */}
        <div className={`overflow-y-auto px-4 py-4 space-y-3 ${isMobile ? 'pb-24' : 'pb-4'}`}>
          <CategoryFilterCard
            selectedCategory={filters.categorySlug}
            selectedSubcategory={filters.subcategorySlug}
            onCategoryChange={handleCategoryChange}
            onSubcategoryChange={handleSubcategoryChange}
          />

          <BrandFilterCard
            selectedBrands={filters.brands || []}
            onBrandsChange={handleBrandsChange}
            categorySlug={filters.categorySlug}
          />

          <PriceFilterCard
            minPrice={filters.minPrice}
            maxPrice={filters.maxPrice}
            onPriceChange={handlePriceChange}
          />

          <ConditionFilterCard
            selectedCondition={filters.condition as any}
            onConditionChange={(c) => handleConditionChange(c ?? undefined)}
          />

          <PostedTimeFilterCard
            selectedPostedTime={filters.postedTime}
            onPostedTimeChange={(v) => handlePostedTimeChange(v ?? undefined)}
          />

          <SellerTypeFilterCard
            selectedSellerType={filters.sellerType}
            onSellerTypeChange={(v) => handleSellerTypeChange(v ?? undefined)}
          />

          <RatingFilterCard
            selectedRating={filters.minRating}
            onRatingChange={handleRatingChange}
          />

          <FeaturesFilterCard
            selectedFeatures={filters.features}
            onFeaturesChange={handleFeaturesChange}
          />
        </div>

        {/* Mobile Footer - Sticky Apply Button */}
        {isMobile && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4">
            <button
              onClick={onClose}
              className="w-full bg-primary-600 text-white font-semibold 
                       py-3 rounded-xl hover:bg-primary-700 
                       transition-colors shadow-lg"
            >
              Apply Filters ({activeFilterCount})
            </button>
          </div>
        )}
      </div>
    </>
  );
}
