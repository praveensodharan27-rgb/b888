'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiChevronDown, FiChevronUp, FiFilter, FiX, FiDollarSign, FiTag, FiLayers, FiCheck, FiPlus, FiStar } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFreeAdsStatus } from '@/hooks/useAds';
import { useCategories } from '@/hooks/useCategories';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';
import DynamicFilters from './DynamicFilters';

interface SmartFiltersPanelProps {
  filters: any;
  onFilterChange: (filters: any) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function SmartFiltersPanel({ 
  filters, 
  onFilterChange,
  isExpanded: controlledExpanded,
  onToggleExpand 
}: SmartFiltersPanelProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: freeAdsStatus, isLoading: isLoadingFreeAds } = useFreeAdsStatus(isAuthenticated);
  const [internalExpanded, setInternalExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['category', 'price', 'condition']));
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);

  const { categories: categoriesData } = useCategories();
  const categories = categoriesData?.length ? categoriesData : [];

  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpand = onToggleExpand || (() => setInternalExpanded(!internalExpanded));

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(section)) {
        newExpanded.delete(section);
      } else {
        newExpanded.add(section);
      }
      return newExpanded;
    });
  }, []);

  // Get category ID for dynamic filters
  const selectedCategory = categories.find((cat: any) => cat.slug === filters.category);
  const categoryId = selectedCategory?.id;
  const subcategories = selectedCategory?.subcategories || [];

  // Reset dynamic filters when category changes
  useEffect(() => {
    // Clear all dynamic filters (non-standard filters) when category changes
    const standardFilterKeys = ['category', 'subcategory', 'minPrice', 'maxPrice', 'condition', 'search', 'sort', 'location', 'city', 'state', 'latitude', 'longitude', 'radius'];
    const dynamicFilterKeys = Object.keys(filters).filter(key => !standardFilterKeys.includes(key));
    
    if (dynamicFilterKeys.length > 0) {
      const clearedFilters: Record<string, string> = {};
      dynamicFilterKeys.forEach(key => {
        clearedFilters[key] = '';
      });
      if (Object.keys(clearedFilters).length > 0) {
        onFilterChange(clearedFilters);
      }
    }
  }, [filters.category]); // Only reset when category changes

  const handleChange = useCallback((key: string, value: any) => {
    onFilterChange({ [key]: value });
  }, [onFilterChange]);

  const clearFilter = useCallback((key: string) => {
    onFilterChange({ [key]: '' });
  }, [onFilterChange]);

  const clearAllFilters = useCallback(() => {
    // Clear all filters including dynamic ones
    const allFilters: Record<string, string> = {
      category: '',
      subcategory: '',
      minPrice: '',
      maxPrice: '',
      condition: '',
    };
    
    // Also clear any dynamic filters
    const standardFilterKeys = ['category', 'subcategory', 'minPrice', 'maxPrice', 'condition', 'search', 'sort', 'location', 'city', 'state', 'latitude', 'longitude', 'radius'];
    Object.keys(filters).forEach(key => {
      if (!standardFilterKeys.includes(key)) {
        allFilters[key] = '';
      }
    });
    
    onFilterChange(allFilters);
  }, [filters, onFilterChange]);

  // Count active filters including dynamic ones
  const standardFilterKeys = ['category', 'subcategory', 'minPrice', 'maxPrice', 'condition', 'search', 'sort', 'location', 'city', 'state', 'latitude', 'longitude', 'radius'];
  const activeFiltersCount = [
    filters.category,
    filters.subcategory,
    filters.minPrice,
    filters.maxPrice,
    filters.condition,
    ...Object.keys(filters).filter(key => !standardFilterKeys.includes(key) && filters[key]),
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Smart Filters Panel */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 bg-gradient-to-r from-primary-500 to-primary-600 cursor-pointer hover:from-primary-600 hover:to-primary-700 transition-all duration-200"
          onClick={toggleExpand}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <FiFilter className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Smart Filters</h2>
              {activeFiltersCount > 0 && (
                <p className="text-white/90 text-xs mt-0.5">{activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}</p>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <span className="bg-white text-primary-600 text-xs font-bold px-2.5 py-1 rounded-full ml-2">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <button className="text-white hover:text-white/80 transition-colors">
            {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
          </button>
        </div>

      {/* Filters Content */}
      {isExpanded && (
        <div className="p-5 space-y-5">
          {/* Category Section */}
          <div className="border-b border-gray-200 pb-5">
            <button
              onClick={() => toggleSection('category')}
              className="flex items-center justify-between w-full mb-4 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary-50 p-2 rounded-lg group-hover:bg-primary-100 transition-colors">
                  <FiLayers className="w-4 h-4 text-primary-600" />
                </div>
                <span className="font-semibold text-gray-900">Category</span>
                {filters.category && (
                  <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              {expandedSections.has('category') ? (
                <FiChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <FiChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.has('category') && (
              <div className="space-y-3 pl-11">
                <div className="relative">
                  <select
                    value={filters.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white transition-all hover:border-gray-300"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                {filters.category && (
                  <button
                    onClick={() => clearFilter('category')}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <FiX className="w-3.5 h-3.5" />
                    Clear category
                  </button>
                )}
                {filters.category && subcategories.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Subcategory</label>
                    <select
                      value={filters.subcategory || ''}
                      onChange={(e) => handleChange('subcategory', e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white transition-all hover:border-gray-300"
                    >
                      <option value="">All Subcategories</option>
                      {subcategories.map((sub: any) => (
                        <option key={sub.id} value={sub.slug}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price Range Section - Now handled by DynamicFilters */}
          {/* Price filter will appear in DynamicFilters when category is selected */}

          {/* Price Range Section */}
          <div className="border-b border-gray-200 pb-5">
            <button
              onClick={() => toggleSection('price')}
              className="flex items-center justify-between w-full mb-4 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary-50 p-2 rounded-lg group-hover:bg-primary-100 transition-colors">
                  <FiDollarSign className="w-4 h-4 text-primary-600" />
                </div>
                <span className="font-semibold text-gray-900">Price Range</span>
                {(filters.minPrice || filters.maxPrice) && (
                  <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                    {filters.minPrice ? `₹${filters.minPrice}` : 'Any'} - {filters.maxPrice ? `₹${filters.maxPrice}` : 'Any'}
                  </span>
                )}
              </div>
              {expandedSections.has('price') ? (
                <FiChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <FiChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.has('price') && (
              <div className="space-y-3 pl-11">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Min Price</label>
                    <input
                      type="number"
                      value={filters.minPrice || ''}
                      onChange={(e) => handleChange('minPrice', e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white transition-all hover:border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Max Price</label>
                    <input
                      type="number"
                      value={filters.maxPrice || ''}
                      onChange={(e) => handleChange('maxPrice', e.target.value)}
                      placeholder="Any"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium bg-white transition-all hover:border-gray-300"
                    />
                  </div>
                </div>
                {(filters.minPrice || filters.maxPrice) && (
                  <button
                    onClick={() => {
                      clearFilter('minPrice');
                      clearFilter('maxPrice');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <FiX className="w-3.5 h-3.5" />
                    Clear price
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Condition Section */}
          <div className="border-b border-gray-200 pb-5">
            <button
              onClick={() => toggleSection('condition')}
              className="flex items-center justify-between w-full mb-4 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary-50 p-2 rounded-lg group-hover:bg-primary-100 transition-colors">
                  <FiTag className="w-4 h-4 text-primary-600" />
                </div>
                <span className="font-semibold text-gray-900">Condition</span>
                {filters.condition && (
                  <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                    {filters.condition.replace('_', ' ')}
                  </span>
                )}
              </div>
              {expandedSections.has('condition') ? (
                <FiChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <FiChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.has('condition') && (
              <div className="space-y-3 pl-11">
                <div className="grid grid-cols-2 gap-2.5">
                  {['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'].map((condition) => (
                    <button
                      key={condition}
                      onClick={() => handleChange('condition', filters.condition === condition ? '' : condition)}
                      className={`px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        filters.condition === condition
                          ? 'bg-primary-600 text-white border-primary-600 shadow-md transform scale-105'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                      }`}
                    >
                      {filters.condition === condition && <FiCheck className="w-4 h-4" />}
                      {condition.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                {filters.condition && (
                  <button
                    onClick={() => clearFilter('condition')}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <FiX className="w-3.5 h-3.5" />
                    Clear condition
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Dynamic Category Filters */}
          {categoryId && (
            <div className="border-t border-gray-200 pt-5 mt-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary-50 p-1.5 rounded-lg">
                  <FiLayers className="w-3.5 h-3.5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Category Filters</h3>
              </div>
              <DynamicFilters
                categoryId={categoryId}
                filters={filters}
                onFilterChange={onFilterChange}
              />
            </div>
          )}

          {/* Clear All Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <FiX className="w-4 h-4" />
              Clear All Filters ({activeFiltersCount})
            </button>
          )}
        </div>
      )}
      </div>

      {/* Post Free Ad Advertisement - Under Filters */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-xl shadow-xl border border-primary-400 overflow-hidden">
        <div className="p-6 text-white relative">
          {/* Decorative background pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
          
          <div className="relative z-10">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
                <FiPlus className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-2 text-white leading-tight">Post Your Ad Free!</h3>
                <p className="text-sm text-white/95 mb-4 leading-relaxed">
                  List your items for free and reach thousands of buyers in your area instantly.
                </p>
              </div>
            </div>
            {isAuthenticated && freeAdsStatus && !isLoadingFreeAds ? (
              <div className="flex items-center gap-2 mb-5 bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-lg border border-white/20">
                <FiStar className="w-5 h-5 text-yellow-300" />
                <span className="font-semibold text-white">
                  {freeAdsStatus.remaining || 0} Free {freeAdsStatus.remaining === 1 ? 'Ad' : 'Ads'} Available
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-5 bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-lg border border-white/20">
                <FiStar className="w-5 h-5 text-yellow-300" />
                <span className="font-semibold text-white">2 Free Ads Available</span>
              </div>
            )}
            <button
              onClick={() => {
                if (isAuthenticated) {
                  router.push('/post-ad');
                } else {
                  setLoginModalOpen(true);
                }
              }}
              className="w-full bg-white text-primary-600 font-bold py-3.5 px-4 rounded-xl hover:bg-white/95 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2 text-base"
            >
              <FiPlus className="w-5 h-5" />
              Post Free Ad Now
            </button>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)}
        onSwitchToSignup={() => {
          setLoginModalOpen(false);
          setSignupModalOpen(true);
        }}
      />

      {/* Signup Modal */}
      <SignupModal 
        isOpen={signupModalOpen} 
        onClose={() => setSignupModalOpen(false)}
        onSwitchToLogin={() => {
          setSignupModalOpen(false);
          setLoginModalOpen(true);
        }}
      />
    </div>
  );
}

