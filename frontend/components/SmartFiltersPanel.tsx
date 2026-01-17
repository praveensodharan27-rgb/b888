'use client';

import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiFilter, FiX, FiDollarSign, FiMapPin, FiTag, FiLayers, FiCheck, FiPlus, FiStar, FiSearch } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFreeAdsStatus } from '@/hooks/useAds';
import api from '@/lib/api';
import { dummyCategories, dummyLocations } from '@/lib/dummyData';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';

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
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['category', 'location', 'price']));
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationSearchRef = useRef<HTMLDivElement>(null);

  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpand = onToggleExpand || (() => setInternalExpanded(!internalExpanded));

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const response = await api.get('/categories');
        return response.data.categories;
      } catch {
        return null;
      }
    },
  });

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const response = await api.get('/locations');
        return response.data.locations || [];
      } catch {
        return [];
      }
    },
  });

  const categories = categoriesData || dummyCategories;
  const locations = locationsData || dummyLocations;

  // Filter locations based on search query
  const filteredLocations = locationSearchQuery.trim()
    ? locations.filter((loc: any) => {
        const query = locationSearchQuery.toLowerCase();
        return (
          loc.name?.toLowerCase().includes(query) ||
          loc.city?.toLowerCase().includes(query) ||
          loc.state?.toLowerCase().includes(query) ||
          loc.neighbourhood?.toLowerCase().includes(query)
        );
      })
    : locations;

  // Get selected location name for display
  const selectedLocation = locations.find((loc: any) => loc.slug === filters.location);

  // Sync location search query with selected location
  useEffect(() => {
    if (filters.location && selectedLocation) {
      setLocationSearchQuery(selectedLocation.name);
    } else if (!filters.location) {
      setLocationSearchQuery('');
    }
  }, [filters.location, selectedLocation]);

  // Close location dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationSearchRef.current && !locationSearchRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleChange = (key: string, value: any) => {
    onFilterChange({ [key]: value });
  };

  const clearFilter = (key: string) => {
    onFilterChange({ [key]: '' });
  };

  const clearAllFilters = () => {
    onFilterChange({
      search: '',
      category: '',
      subcategory: '',
      location: '',
      minPrice: '',
      maxPrice: '',
      condition: '',
    });
  };

  const activeFiltersCount = [
    filters.search,
    filters.category,
    filters.location,
    filters.minPrice,
    filters.maxPrice,
    filters.condition,
  ].filter(Boolean).length;

  // Get selected category's subcategories
  const selectedCategory = categories.find((cat: any) => cat.slug === filters.category);
  const subcategories = selectedCategory?.subcategories || [];

  return (
    <div className="space-y-4">
      {/* Smart Filters Panel */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 bg-primary-50 cursor-pointer hover:bg-primary-100 transition-colors"
          onClick={toggleExpand}
        >
          <div className="flex items-center gap-2">
            <FiFilter className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900">Smart Filters</h2>
            {activeFiltersCount > 0 && (
              <span className="bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <button className="text-gray-600 hover:text-gray-900">
            {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
          </button>
        </div>

      {/* Filters Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Search Section */}
          <div className="border-b pb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Search
            </label>
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
              <input
                type="text"
                placeholder="Search for products, brands, etc..."
                value={filters.search || ''}
                onChange={(e) => {
                  const searchValue = e.target.value;
                  // When search exists, clear category and subcategory (search overrides category)
                  if (searchValue && searchValue.trim()) {
                    handleChange('search', searchValue);
                    handleChange('category', '');
                    handleChange('subcategory', '');
                  } else {
                    handleChange('search', '');
                  }
                }}
                className="w-full pl-12 pr-12 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 transition-all bg-white"
              />
              {filters.search && (
                <button
                  onClick={() => clearFilter('search')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                >
                  <FiX className="w-5 h-5" />
                </button>
              )}
            </div>
            {filters.search && (
              <button
                onClick={() => clearFilter('search')}
                className="mt-2 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <FiX className="w-3 h-3" />
                Clear search
              </button>
            )}
          </div>

          {/* Category Section */}
          <div className="border-b pb-4">
            <button
              onClick={() => toggleSection('category')}
              className="flex items-center justify-between w-full mb-3 text-left"
            >
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <FiLayers className="w-4 h-4" />
                Category
              </div>
              {expandedSections.has('category') ? (
                <FiChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <FiChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {expandedSections.has('category') && (
              <div className="space-y-2">
                <select
                  value={filters.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {filters.category && (
                  <button
                    onClick={() => clearFilter('category')}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <FiX className="w-3 h-3" />
                    Clear category
                  </button>
                )}
                {filters.category && subcategories.length > 0 && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Subcategory</label>
                    <select
                      value={filters.subcategory || ''}
                      onChange={(e) => handleChange('subcategory', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
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

          {/* Location Section */}
          <div className="border-b pb-4">
            <button
              onClick={() => toggleSection('location')}
              className="flex items-center justify-between w-full mb-3 text-left"
            >
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <FiMapPin className="w-4 h-4" />
                Location
              </div>
              {expandedSections.has('location') ? (
                <FiChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <FiChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {expandedSections.has('location') && (
              <div className="space-y-2" ref={locationSearchRef}>
                <div className="relative">
                  <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                    <input
                      type="text"
                      placeholder="Search location, city, or state..."
                      value={locationSearchQuery}
                      onChange={(e) => {
                        setLocationSearchQuery(e.target.value);
                        setShowLocationDropdown(true);
                      }}
                      onFocus={() => setShowLocationDropdown(true)}
                      className="w-full pl-12 pr-12 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 transition-all bg-white"
                    />
                    {filters.location && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFilter('location');
                          setLocationSearchQuery('');
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Location Dropdown */}
                  {showLocationDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <button
                        onClick={() => {
                          handleChange('location', '');
                          setLocationSearchQuery('');
                          setShowLocationDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                          !filters.location ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
                        }`}
                      >
                        <FiMapPin className="w-4 h-4" />
                        All Locations
                      </button>
                      {filteredLocations.length > 0 ? (
                        filteredLocations.slice(0, 20).map((loc: any) => (
                          <button
                            key={loc.id}
                            onClick={() => {
                              handleChange('location', loc.slug);
                              setLocationSearchQuery(loc.name);
                              setShowLocationDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-start gap-2 ${
                              filters.location === loc.slug ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
                            }`}
                          >
                            <FiMapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{loc.name}</div>
                              {(loc.city || loc.state) && (
                                <div className="text-xs text-gray-500 truncate">
                                  {[loc.city, loc.state].filter(Boolean).join(', ')}
                                </div>
                              )}
                            </div>
                            {filters.location === loc.slug && (
                              <FiCheck className="w-4 h-4 text-primary-600 flex-shrink-0" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          No locations found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Selected Location Display */}
                {filters.location && selectedLocation && (
                  <div className="flex items-center justify-between px-3 py-2 bg-primary-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FiMapPin className="w-4 h-4 text-primary-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{selectedLocation.name}</div>
                        {(selectedLocation.city || selectedLocation.state) && (
                          <div className="text-xs text-gray-600">
                            {[selectedLocation.city, selectedLocation.state].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        clearFilter('location');
                        setLocationSearchQuery('');
                      }}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price Range Section */}
          <div className="border-b pb-4">
            <button
              onClick={() => toggleSection('price')}
              className="flex items-center justify-between w-full mb-3 text-left"
            >
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <FiDollarSign className="w-4 h-4" />
                Price Range
              </div>
              {expandedSections.has('price') ? (
                <FiChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <FiChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {expandedSections.has('price') && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Min Price (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={filters.minPrice}
                      onChange={(e) => handleChange('minPrice', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Max Price (₹)</label>
                    <input
                      type="number"
                      placeholder="Any"
                      value={filters.maxPrice}
                      onChange={(e) => handleChange('maxPrice', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>
                {(filters.minPrice || filters.maxPrice) && (
                  <button
                    onClick={() => {
                      clearFilter('minPrice');
                      clearFilter('maxPrice');
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <FiX className="w-3 h-3" />
                    Clear price
                  </button>
                )}
                {/* Quick Price Filters */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { label: 'Under ₹1,000', min: '', max: '1000' },
                    { label: '₹1,000 - ₹5,000', min: '1000', max: '5000' },
                    { label: '₹5,000 - ₹10,000', min: '5000', max: '10000' },
                    { label: 'Above ₹10,000', min: '10000', max: '' },
                  ].map((range, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleChange('minPrice', range.min);
                        handleChange('maxPrice', range.max);
                      }}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        filters.minPrice === range.min && filters.maxPrice === range.max
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Condition Section */}
          <div className="border-b pb-4">
            <button
              onClick={() => toggleSection('condition')}
              className="flex items-center justify-between w-full mb-3 text-left"
            >
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <FiTag className="w-4 h-4" />
                Condition
              </div>
              {expandedSections.has('condition') ? (
                <FiChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <FiChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {expandedSections.has('condition') && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'].map((condition) => (
                    <button
                      key={condition}
                      onClick={() => handleChange('condition', filters.condition === condition ? '' : condition)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                        filters.condition === condition
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <FiX className="w-3 h-3" />
                    Clear condition
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Clear All Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
      </div>

      {/* Post Free Ad Advertisement - Under Filters */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 text-white">
          <div className="flex items-start gap-3 mb-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <FiPlus className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1 text-white leading-tight">Post Your Ad Free!</h3>
              <p className="text-sm text-white/90 mb-4 leading-relaxed">
                List your items for free and reach thousands of buyers in your area.
              </p>
            </div>
          </div>
          {isAuthenticated && freeAdsStatus && !isLoadingFreeAds ? (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <FiStar className="w-4 h-4 text-white" />
              <span className="font-medium text-white">
                {freeAdsStatus.remaining || 0} Free {freeAdsStatus.remaining === 1 ? 'Ad' : 'Ads'} Available
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <FiStar className="w-4 h-4 text-white" />
              <span className="font-medium text-white">2 Free Ads Available</span>
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
            className="w-full bg-white text-primary-600 font-semibold py-3 px-4 rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
          >
            <FiPlus className="w-5 h-5" />
            Post Free Ad Now
          </button>
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

