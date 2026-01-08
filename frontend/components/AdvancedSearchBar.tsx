'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch, FiX, FiFilter, FiMapPin, FiTag } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface AdvancedSearchBarProps {
  initialSearch?: string;
  onSearch?: (search: string) => void;
  showQuickFilters?: boolean;
}

export default function AdvancedSearchBar({ 
  initialSearch = '', 
  onSearch,
  showQuickFilters = true 
}: AdvancedSearchBarProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch recent searches or popular searches (you can implement this endpoint)
  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions', search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      try {
        // This would be a new endpoint for search suggestions
        // For now, return empty array
        return [];
      } catch {
        return [];
      }
    },
    enabled: search.length >= 2 && isFocused,
  });

  // Popular search terms (can be fetched from API)
  const popularSearches = [
    'iPhone', 'Laptop', 'Car', 'Bike', 'Furniture', 
    'Mobile', 'TV', 'Watch', 'Camera', 'Books'
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      if (onSearch) {
        onSearch(search.trim());
      } else {
        // Search overrides category - clear category from URL
        router.push(`/ads?search=${encodeURIComponent(search.trim())}`);
      }
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearch(suggestion);
    if (onSearch) {
      onSearch(suggestion);
    } else {
      // Search overrides category - clear category from URL
      router.push(`/ads?search=${encodeURIComponent(suggestion)}`);
    }
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setSearch('');
    searchRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <FiSearch className="absolute left-3 text-gray-400 w-5 h-5" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            placeholder="Search for anything..."
            className="w-full pl-10 pr-20 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          {search && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-12 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1 bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Search
          </button>
        </div>
      </form>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && isFocused && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto"
        >
          {search.length >= 2 && suggestions && suggestions.length > 0 ? (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Suggestions</div>
              {suggestions.map((suggestion: string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                >
                  <FiSearch className="w-4 h-4 text-gray-400" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          ) : search.length === 0 ? (
            <div className="p-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Popular Searches</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {popularSearches.map((term, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(term)}
                    className="px-3 py-1 bg-gray-100 hover:bg-primary-50 text-gray-700 hover:text-primary-600 rounded-full text-sm transition-colors flex items-center gap-1"
                  >
                    <FiTag className="w-3 h-3" />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Quick Filters */}
      {showQuickFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/ads?sort=featured')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <FiFilter className="w-4 h-4" />
            Featured
          </button>
          <button
            onClick={() => router.push('/ads?sort=newest')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <FiTag className="w-4 h-4" />
            Newest
          </button>
          <button
            onClick={() => router.push('/ads?sort=price_low')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <span>₹</span>
            Low Price
          </button>
        </div>
      )}
    </div>
  );
}

