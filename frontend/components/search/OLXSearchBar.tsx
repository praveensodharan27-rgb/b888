'use client';

/**
 * OLXSearchBar - Smart search bar with instant suggestions
 * 
 * Features:
 * - Instant autocomplete suggestions
 * - Recent searches
 * - Trending searches
 * - Debounced input
 * - Keyboard navigation
 * - Mobile responsive
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/hooks/useSearch';
import { FiSearch, FiX, FiClock, FiTrendingUp } from 'react-icons/fi';

interface OLXSearchBarProps {
  placeholder?: string;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
  showButton?: boolean;
}

export default function OLXSearchBar({
  placeholder = 'Search for products, brands, and more...',
  autoFocus = false,
  onSearch,
  className = '',
  showButton = true,
}: OLXSearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    query,
    setQuery,
    suggestions,
    isLoadingSuggestions,
    showSuggestions,
    setShowSuggestions,
    recentSearches,
    removeRecentSearch,
    clearRecentSearches,
    trending,
  } = useSearch({ autoSearch: false });

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowSuggestions]);

  // Handle search submit
  const handleSearch = (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setShowSuggestions(false);
    
    if (onSearch) {
      onSearch(q);
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    const allItems = [
      ...suggestions,
      ...recentSearches.map(q => ({ id: `recent-${q}`, title: q, isRecent: true })),
    ];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && allItems[selectedIndex]) {
          const item = allItems[selectedIndex];
          if ('isRecent' in item) {
            handleSearch(item.title);
          } else {
            router.push(`/ads/${item.id}`);
          }
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  // Handle input focus
  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
  };

  // Handle input blur
  const handleBlur = () => {
    setIsFocused(false);
  };

  // Clear input
  const handleClear = () => {
    setQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    if (price >= 1000) return `₹${(price / 1000).toFixed(2)} K`;
    return `₹${price}`;
  };

  const showDropdown = showSuggestions && (suggestions.length > 0 || recentSearches.length > 0 || trending.length > 0);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className={`relative flex items-center bg-white border-2 rounded-lg transition-all ${
        isFocused ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
      }`}>
        <div className="absolute left-4 text-gray-400">
          <FiSearch size={20} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full pl-12 pr-24 py-3 text-gray-900 placeholder-gray-400 focus:outline-none rounded-lg"
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute right-20 text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <FiX size={20} />
          </button>
        )}

        {showButton && (
          <button
            onClick={() => handleSearch()}
            className="absolute right-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            type="button"
          >
            Search
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto"
        >
          {/* Autocomplete Suggestions */}
          {suggestions.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => router.push(`/ads/${suggestion.id}`)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                    selectedIndex === index ? 'bg-blue-50' : ''
                  }`}
                  type="button"
                >
                  {suggestion.images && suggestion.images[0] ? (
                    <img
                      src={suggestion.images[0]}
                      alt={suggestion.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <FiSearch className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">{suggestion.title}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      {suggestion.categoryName && <span>{suggestion.categoryName}</span>}
                      {suggestion.city && (
                        <>
                          <span>•</span>
                          <span>{suggestion.city}</span>
                        </>
                      )}
                      {suggestion.price && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-gray-700">
                            {formatPrice(suggestion.price)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="py-2 border-t border-gray-100">
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                  <FiClock size={14} />
                  Recent Searches
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  type="button"
                >
                  Clear All
                </button>
              </div>
              {recentSearches.slice(0, 5).map((search, index) => (
                <div
                  key={`recent-${search}`}
                  className={`px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    selectedIndex === suggestions.length + index ? 'bg-blue-50' : ''
                  }`}
                >
                  <button
                    onClick={() => handleSearch(search)}
                    className="flex-1 text-left text-gray-700 hover:text-gray-900"
                    type="button"
                  >
                    {search}
                  </button>
                  <button
                    onClick={() => removeRecentSearch(search)}
                    className="text-gray-400 hover:text-gray-600"
                    type="button"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Trending Searches */}
          {trending.length > 0 && !query && (
            <div className="py-2 border-t border-gray-100">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                <FiTrendingUp size={14} />
                Trending Searches
              </div>
              <div className="px-4 py-2 flex flex-wrap gap-2">
                {trending.slice(0, 8).map((item) => (
                  <button
                    key={item.query}
                    onClick={() => handleSearch(item.query)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
                    type="button"
                  >
                    {item.query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoadingSuggestions && (
            <div className="px-4 py-8 text-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
