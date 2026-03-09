'use client';

import { useState, useEffect } from 'react';
import { FiSearch, FiMapPin, FiGrid, FiClock, FiTrendingUp, FiX } from 'react-icons/fi';
import api from '@/lib/api';
import { getRecentSearches, getPopularSearches, clearRecentSearches } from '@/utils/searchParser';

interface Suggestion {
  type: 'product' | 'category' | 'location' | 'recent' | 'popular';
  title: string;
  subtitle?: string;
  category?: string;
  location?: string;
  icon?: React.ReactNode;
}

interface AutosuggestDropdownProps {
  query: string;
  isOpen: boolean;
  onSelect: (suggestion: Suggestion) => void;
  onClose: () => void;
  className?: string;
}

export default function AutosuggestDropdown({
  query,
  isOpen,
  onSelect,
  onClose,
  className = '',
}: AutosuggestDropdownProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  // Load recent searches on mount
  useEffect(() => {
    const recent = getRecentSearches(5);
    setRecentSearches(recent);
    setShowRecent(recent.length > 0 && !query.trim());
  }, [query]);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowRecent(recentSearches.length > 0);
      return;
    }

    setShowRecent(false);
    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        // Fetch autocomplete suggestions from backend
        const response = await api.get('/ads/autocomplete', {
          params: { q: query.trim(), limit: 8 },
        });

        if (response.data?.success && response.data?.suggestions) {
          const productSuggestions: Suggestion[] = response.data.suggestions.map((s: any) => ({
            type: 'product' as const,
            title: s.title,
            subtitle: [s.category, s.location].filter(Boolean).join(' • '),
            category: s.category,
            location: s.location,
          }));

          setSuggestions(productSuggestions);
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

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
    setShowRecent(false);
  };

  if (!isOpen) return null;

  // Show recent searches when no query
  if (showRecent && recentSearches.length > 0) {
    return (
      <div className={`absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden z-50 ${className}`}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Searches</h4>
            <button
              onClick={handleClearRecent}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => onSelect({ type: 'recent', title: search })}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <FiClock className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                </div>
                <span className="text-sm text-gray-800 flex-1">{search}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Popular Searches */}
        <div className="border-t border-gray-200 p-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Popular</h4>
          <div className="flex flex-wrap gap-2">
            {getPopularSearches().slice(0, 6).map((search, index) => (
              <button
                key={index}
                onClick={() => onSelect({ type: 'popular', title: search })}
                className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 text-sm text-gray-700 hover:text-blue-600 rounded-full transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show suggestions or loading state
  if (loading) {
    return (
      <div className={`absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden z-50 ${className}`}>
        <div className="p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0 && query.trim().length >= 2) {
    return (
      <div className={`absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden z-50 ${className}`}>
        <div className="p-4 text-center">
          <FiSearch className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No suggestions found</p>
          <p className="text-xs text-gray-500 mt-1">Try searching for products, categories, or locations</p>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className={`absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden z-50 ${className}`}>
      <div className="max-h-[400px] overflow-y-auto">
        <div className="p-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelect(suggestion)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors flex-shrink-0">
                {suggestion.type === 'product' && (
                  <FiSearch className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                )}
                {suggestion.type === 'category' && (
                  <FiGrid className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                )}
                {suggestion.type === 'location' && (
                  <FiMapPin className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                  {suggestion.title}
                </div>
                {suggestion.subtitle && (
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {suggestion.subtitle}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
