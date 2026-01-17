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

  // Fetch autocomplete suggestions from API
  const { data: autocompleteData, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['search-autocomplete', search],
    queryFn: async () => {
      if (!search || search.length < 2) return { suggestions: [], categories: [] };
      try {
        const response = await api.get(`/search/autocomplete?q=${encodeURIComponent(search)}&limit=8`);
        return response.data || { suggestions: [], categories: [] };
      } catch {
        return { suggestions: [], categories: [] };
      }
    },
    enabled: search.length >= 2 && isFocused,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch popular searches when input is empty
  const { data: popularData } = useQuery({
    queryKey: ['popular-searches'],
    queryFn: async () => {
      try {
        const response = await api.get('/search/trending?limit=10');
        return response.data?.trending || [];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const suggestions = autocompleteData?.suggestions || [];
  const categories = autocompleteData?.categories || [];
  const popularSearches = popularData || [];


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

  const handleSuggestionClick = (suggestion: string | any) => {
    const searchTerm = typeof suggestion === 'string' ? suggestion : (suggestion.title || suggestion.query || suggestion);
    setSearch(searchTerm);
    if (onSearch) {
      onSearch(searchTerm);
    } else {
      // Search overrides category - clear category from URL
      router.push(`/ads?search=${encodeURIComponent(searchTerm)}`);
    }
    setShowSuggestions(false);
    setIsFocused(false);
  };

  const handleClear = () => {
    setSearch('');
    searchRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <FiSearch className="absolute left-4 text-gray-400 w-6 h-6 z-10" />
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
            className="w-full pl-14 pr-28 py-4 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:border-gray-300 transition-all bg-white"
          />
          {search && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-24 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold shadow-md hover:shadow-lg"
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
          {search.length >= 2 ? (
            // Show autocomplete suggestions when typing
            <div className="p-2">
              {isLoadingSuggestions ? (
                <div className="px-4 py-3 text-center text-gray-500 text-sm">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Searching...</span>
                </div>
              ) : (
                <>
                  {/* Categories */}
                  {categories && categories.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Categories</div>
                      {categories.map((cat: any, index: number) => (
                        <button
                          key={`cat-${index}`}
                          onClick={() => {
                            if (cat.slug) {
                              router.push(`/ads?category=${cat.slug}`);
                              setShowSuggestions(false);
                            } else {
                              handleSuggestionClick(cat.name || cat.query);
                            }
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                        >
                          <FiTag className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{cat.name || cat.query}</span>
                          {cat.count && (
                            <span className="ml-auto text-xs text-gray-500">({cat.count})</span>
                          )}
                        </button>
                      ))}
                    </>
                  )}
                  
                  {/* Search Suggestions */}
                  {suggestions && suggestions.length > 0 && (
                    <>
                      {categories && categories.length > 0 && (
                        <div className="border-t border-gray-200 my-2"></div>
                      )}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Suggestions</div>
                      {suggestions.map((suggestion: any, index: number) => (
                        <button
                          key={`sug-${index}`}
                          onClick={() => handleSuggestionClick(suggestion.title || suggestion.query || suggestion)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                        >
                          <FiSearch className="w-4 h-4 text-gray-400" />
                          <span>{suggestion.title || suggestion.query || suggestion}</span>
                          {suggestion.category && (
                            <span className="ml-auto text-xs text-gray-500">{suggestion.category}</span>
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  {/* No results */}
                  {!isLoadingSuggestions && (!suggestions || suggestions.length === 0) && (!categories || categories.length === 0) && (
                    <div className="px-4 py-3 text-center text-gray-500 text-sm">
                      No suggestions found for "{search}"
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            // Show popular searches when input is empty
            <div className="p-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Popular Searches</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {popularSearches.length > 0 ? (
                  popularSearches.map((item: any, index: number) => {
                    const term = item.query || item.name || item;
                    const count = item.count;
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (item.slug) {
                            router.push(`/ads?category=${item.slug}`);
                            setShowSuggestions(false);
                          } else {
                            handleSuggestionClick(term);
                          }
                        }}
                        className="px-3 py-1 bg-gray-100 hover:bg-primary-50 text-gray-700 hover:text-primary-600 rounded-full text-sm transition-colors flex items-center gap-1"
                      >
                        <FiTag className="w-3 h-3" />
                        {term}
                        {count && <span className="text-xs text-gray-500">({count})</span>}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500">No popular searches available</div>
                )}
              </div>
            </div>
          )}
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

