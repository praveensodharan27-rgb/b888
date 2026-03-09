'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import FilterCard from './FilterCard';
import { FiMapPin } from 'react-icons/fi';
import { FiX, FiSearch } from 'react-icons/fi';

interface Location {
  id: string;
  name: string;
  slug: string;
  city?: string;
  state?: string;
  type?: 'city' | 'state' | 'area';
}

interface LocationFilterCardProps {
  selectedLocation?: string;
  onLocationChange: (locationSlug: string | null) => void;
}

/**
 * Location Filter Card with search and dropdown
 */
export default function LocationFilterCard({
  selectedLocation,
  onLocationChange,
}: LocationFilterCardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch locations
  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const response = await api.get('/locations');
        return response.data?.locations || response.data || [];
      } catch (error) {
        console.error('Error fetching locations:', error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Filter locations by search
  const filteredLocations = useMemo(() => {
    if (!searchQuery) return locations.slice(0, 20); // Limit initial results
    const query = searchQuery.toLowerCase();
    return locations.filter(loc =>
      loc.name.toLowerCase().includes(query) ||
      loc.city?.toLowerCase().includes(query) ||
      loc.state?.toLowerCase().includes(query) ||
      loc.slug.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  const selectedLocationData = useMemo(() => {
    return locations.find(loc => loc.slug === selectedLocation);
  }, [locations, selectedLocation]);

  const handleClear = () => {
    onLocationChange(null);
    setSearchQuery('');
  };

  return (
    <FilterCard
      title="Location"
      icon={<FiMapPin className="w-5 h-5" />}
      selectedLabel={selectedLocationData?.name}
      selectedCount={selectedLocation ? 1 : 0}
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
              placeholder="Search city, state, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       text-sm"
            />
          </div>

          {/* Selected Location Display */}
          {selectedLocation && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700 flex-1">
                {selectedLocationData?.name}
              </span>
              <button
                onClick={handleClear}
                className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                aria-label="Clear location"
              >
                <FiX className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          )}

          {/* Location List */}
          <div className="space-y-1">
            {filteredLocations.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No locations found
              </p>
            ) : (
              filteredLocations.map((location) => {
                const isSelected = selectedLocation === location.slug;
                return (
                  <button
                    key={location.id}
                    onClick={() => {
                      if (isSelected) {
                        onLocationChange(null);
                      } else {
                        onLocationChange(location.slug);
                        setSearchQuery(''); // Clear search after selection
                      }
                    }}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm
                      transition-colors duration-200
                      ${
                        isSelected
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span>{location.name}</span>
                      {location.city && location.state && (
                        <span className="text-xs text-gray-500">
                          {location.city}, {location.state}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </FilterCard>
  );
}
