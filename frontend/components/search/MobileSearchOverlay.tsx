'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch, FiX, FiClock, FiTrendingUp, FiArrowLeft } from 'react-icons/fi';
import { getRecentSearches, getPopularSearches, clearRecentSearches, saveRecentSearch, parseSearchQuery, buildSearchUrl } from '@/utils/searchParser';
import api from '@/lib/api';

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export default function MobileSearchOverlay({ isOpen, onClose, initialQuery = '' }: MobileSearchOverlayProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches(10));
      // Focus input when overlay opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Fetch suggestions
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const response = await api.get('/ads/autocomplete', {
          params: { q: query.trim(), limit: 10 },
        });

        if (response.data?.success && response.data?.suggestions) {
          setSuggestions(response.data.suggestions);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // Parse and save
    const parsed = parseSearchQuery(searchQuery);
    saveRecentSearch(searchQuery);

    // Navigate
    const searchUrl = buildSearchUrl(parsed);
    router.push(searchUrl);
    onClose();
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close search"
        >
          <FiArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          <FiSearch className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(query);
              }
            }}
            placeholder="Search products, brands..."
            className="flex-1 px-3 py-3 text-base text-gray-900 placeholder:text-gray-500 border-none outline-none bg-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Suggestions */}
        {loading && (
          <div className="p-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && suggestions.length > 0 && (
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Suggestions</h3>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(suggestion.title)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-blue-50 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <FiSearch className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{suggestion.title}</div>
                    {(suggestion.category || suggestion.location) && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {[suggestion.category, suggestion.location].filter(Boolean).join(' • ')}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Searches */}
        {!loading && query.trim().length < 2 && recentSearches.length > 0 && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Searches</h3>
              <button
                onClick={handleClearRecent}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(search)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <FiClock className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-800 flex-1">{search}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = recentSearches.filter((_, i) => i !== index);
                      setRecentSearches(updated);
                      localStorage.setItem('recent_searches', JSON.stringify(updated));
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Searches */}
        {!loading && query.trim().length < 2 && (
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FiTrendingUp className="w-4 h-4" />
              Popular Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {getPopularSearches().map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(search)}
                  className="px-4 py-2 bg-gray-100 hover:bg-blue-50 text-sm text-gray-700 hover:text-blue-600 rounded-full transition-colors font-medium"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && query.trim().length >= 2 && suggestions.length === 0 && (
          <div className="p-8 text-center">
            <FiSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No suggestions found</h3>
            <p className="text-sm text-gray-600 mb-4">Try different keywords or browse categories</p>
            <button
              onClick={() => handleSearch(query)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Search anyway
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
