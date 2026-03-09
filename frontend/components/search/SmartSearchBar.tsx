'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiSearch, FiX } from 'react-icons/fi';
import AutosuggestDropdown from './AutosuggestDropdown';
import { parseSearchQuery, buildSearchUrl, saveRecentSearch } from '@/utils/searchParser';

interface SmartSearchBarProps {
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  onSearch?: (query: string) => void;
  showMobileOverlay?: boolean;
}

export default function SmartSearchBar({
  placeholder = 'Search for products, brands, and more...',
  autoFocus = false,
  className = '',
  onSearch,
  showMobileOverlay = false,
}: SmartSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load search query from URL on mount
  useEffect(() => {
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      setQuery(searchQuery);
    }
  }, [searchParams]);

  // Auto focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;

    // Parse the query for location, price, etc.
    const parsed = parseSearchQuery(query);
    
    // Save to recent searches
    saveRecentSearch(query);

    // Build URL with parsed parameters
    const searchUrl = buildSearchUrl(parsed);
    
    // Close suggestions
    setShowSuggestions(false);
    setIsFocused(false);

    // Navigate or call callback
    if (onSearch) {
      onSearch(query);
    } else {
      router.push(searchUrl);
    }
  }, [query, router, onSearch]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setIsFocused(false);
    }
  };

  const handleSuggestionSelect = (suggestion: any) => {
    setQuery(suggestion.title);
    setShowSuggestions(false);
    setIsFocused(false);
    
    // Save to recent searches
    saveRecentSearch(suggestion.title);
    
    // Navigate immediately
    const parsed = parseSearchQuery(suggestion.title);
    const searchUrl = buildSearchUrl(parsed);
    router.push(searchUrl);
  };

  const handleClear = () => {
    setQuery('');
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className={`flex items-center bg-white border rounded-lg overflow-hidden transition-all ${
        isFocused ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'
      }`}>
        <FiSearch className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-500 border-none outline-none bg-transparent"
        />
        {query && (
          <button
            onClick={handleClear}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <FiSearch className="w-4 h-4" />
          <span className="hidden sm:inline text-sm font-medium">Search</span>
        </button>
      </div>

      {/* Autosuggest Dropdown */}
      <AutosuggestDropdown
        query={query}
        isOpen={showSuggestions && isFocused}
        onSelect={handleSuggestionSelect}
        onClose={() => setShowSuggestions(false)}
      />
    </div>
  );
}
