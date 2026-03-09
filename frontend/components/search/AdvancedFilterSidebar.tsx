'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface FilterSection {
  id: string;
  label: string;
  type: 'checkbox' | 'radio' | 'range' | 'select';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

const FILTER_SECTIONS: FilterSection[] = [
  {
    id: 'condition',
    label: 'Condition',
    type: 'radio',
    options: [
      { value: 'NEW', label: 'New' },
      { value: 'LIKE_NEW', label: 'Like New' },
      { value: 'USED', label: 'Used' },
      { value: 'REFURBISHED', label: 'Refurbished' },
    ],
  },
  {
    id: 'price',
    label: 'Price Range',
    type: 'range',
    min: 0,
    max: 10000000,
    step: 1000,
  },
  {
    id: 'fuelType',
    label: 'Fuel Type',
    type: 'checkbox',
    options: [
      { value: 'PETROL', label: 'Petrol' },
      { value: 'DIESEL', label: 'Diesel' },
      { value: 'ELECTRIC', label: 'Electric' },
      { value: 'CNG', label: 'CNG' },
      { value: 'HYBRID', label: 'Hybrid' },
    ],
  },
  {
    id: 'sort',
    label: 'Sort By',
    type: 'radio',
    options: [
      { value: 'newest', label: 'Newest First' },
      { value: 'oldest', label: 'Oldest First' },
      { value: 'price_low', label: 'Price: Low to High' },
      { value: 'price_high', label: 'Price: High to Low' },
      { value: 'featured', label: 'Featured' },
    ],
  },
  {
    id: 'postedTime',
    label: 'Posted',
    type: 'radio',
    options: [
      { value: '24h', label: 'Last 24 hours' },
      { value: '3d', label: 'Last 3 days' },
      { value: '7d', label: 'Last 7 days' },
      { value: '30d', label: 'Last 30 days' },
    ],
  },
];

export default function AdvancedFilterSidebar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['condition', 'price', 'sort'])
  );
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Load price from URL
  useEffect(() => {
    const min = searchParams.get('minPrice');
    const max = searchParams.get('maxPrice');
    if (min) setPriceMin(min);
    if (max) setPriceMax(max);
  }, [searchParams]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleFilterChange = (key: string, value: any) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === null || value === undefined || value === '') {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    
    // Reset to page 1
    params.delete('page');
    
    router.push(`/ads?${params.toString()}`, { scroll: false });
  };

  const handlePriceChange = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (priceMin) {
      params.set('minPrice', priceMin);
    } else {
      params.delete('minPrice');
    }
    
    if (priceMax) {
      params.set('maxPrice', priceMax);
    } else {
      params.delete('maxPrice');
    }
    
    params.delete('page');
    router.push(`/ads?${params.toString()}`, { scroll: false });
  };

  const isFilterActive = (key: string, value: string) => {
    return searchParams.get(key) === value;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Filters</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {FILTER_SECTIONS.map((section) => (
          <div key={section.id} className="p-4">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <h3 className="text-sm font-semibold text-gray-900">{section.label}</h3>
              {expandedSections.has(section.id) ? (
                <FiChevronUp className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
              ) : (
                <FiChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
              )}
            </button>

            {expandedSections.has(section.id) && (
              <div className="space-y-2">
                {/* Radio buttons */}
                {section.type === 'radio' && section.options && (
                  <div className="space-y-2">
                    {section.options.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name={section.id}
                          value={option.value}
                          checked={isFilterActive(section.id, option.value)}
                          onChange={() => handleFilterChange(section.id, option.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          {option.label}
                        </span>
                      </label>
                    ))}
                    {isFilterActive(section.id, searchParams.get(section.id) || '') && (
                      <button
                        onClick={() => handleFilterChange(section.id, null)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}

                {/* Checkboxes */}
                {section.type === 'checkbox' && section.options && (
                  <div className="space-y-2">
                    {section.options.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          value={option.value}
                          checked={isFilterActive(section.id, option.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleFilterChange(section.id, option.value);
                            } else {
                              handleFilterChange(section.id, null);
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Price Range */}
                {section.type === 'range' && section.id === 'price' && (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">Min Price</label>
                        <input
                          type="number"
                          value={priceMin}
                          onChange={(e) => setPriceMin(e.target.value)}
                          onBlur={handlePriceChange}
                          placeholder="₹ Min"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">Max Price</label>
                        <input
                          type="number"
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          onBlur={handlePriceChange}
                          placeholder="₹ Max"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    {(priceMin || priceMax) && (
                      <button
                        onClick={() => {
                          setPriceMin('');
                          setPriceMax('');
                          handleFilterChange('minPrice', null);
                          handleFilterChange('maxPrice', null);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Clear price
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
