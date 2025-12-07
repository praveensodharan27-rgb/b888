'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { dummyCategories, dummyLocations } from '@/lib/dummyData';

interface FiltersProps {
  filters: any;
  onFilterChange: (filters: any) => void;
}

export default function Filters({ filters, onFilterChange }: FiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const response = await api.get('/categories');
        return response.data.categories;
      } catch (error) {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
  });

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
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
  });

  const categories = categoriesData || dummyCategories;
  const locations = locationsData || dummyLocations;

  const handleChange = (key: string, value: any) => {
    onFilterChange({ [key]: value });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow sticky top-20">
      <div className="flex items-center justify-between mb-4 lg:hidden">
        <h2 className="font-semibold">Filters</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-primary-600"
        >
          {showFilters ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className={`space-y-4 ${showFilters ? 'block' : 'hidden lg:block'}`}>
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={filters.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <select
            value={filters.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Locations</option>
            {locations.map((loc: any) => (
              <option key={loc.id} value={loc.slug}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Price Range</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => handleChange('minPrice', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => handleChange('maxPrice', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <button
          onClick={() => onFilterChange({ category: '', location: '', minPrice: '', maxPrice: '' })}
          className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}

