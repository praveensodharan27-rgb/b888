'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch, FiClock, FiTrendingUp, FiX, FiMapPin, FiChevronDown } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Suggestion {
  type?: 'product' | 'category';
  title: string;
  category?: string;
  subcategory?: string;
  location?: string;
  slug?: string;
  icon?: string;
  count?: number;
}

export default function Hero() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [trendingItems, setTrendingItems] = useState<Suggestion[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearchesUpdate, setRecentSearchesUpdate] = useState(0); // Force re-render when recent searches change
  const [selectedLocation, setSelectedLocation] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.get('/locations');
      return response.data.locations || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const locations = locationsData || [];
  const currentLocation = locations.find((loc: any) => loc.slug === selectedLocation) || locations[0] || { name: 'New York' };

  // Get recent searches from localStorage
  const getRecentSearches = (): string[] => {
    if (typeof window === 'undefined') return [];
    const recent = localStorage.getItem('recentSearches');
    return recent ? JSON.parse(recent) : [];
  };

  const saveRecentSearch = (query: string) => {
    if (typeof window === 'undefined') return;
    const recent = getRecentSearches();
    const updated = [query, ...recent.filter(s => s !== query)].slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const deleteRecentSearch = (query: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (typeof window === 'undefined') return;
    const recent = getRecentSearches();
    const updated = recent.filter(s => s !== query);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
    // Force re-render by updating state
    setRecentSearchesUpdate(prev => prev + 1);
  };

  const clearAllRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof window === 'undefined') return;
    localStorage.setItem('recentSearches', JSON.stringify([]));
    // Force re-render
    setRecentSearchesUpdate(prev => prev + 1);
  };

  // Fetch trending items when focused and input is empty
  useEffect(() => {
    if (isFocused && search.trim().length === 0) {
      api.get('/search/autocomplete', { params: { q: '', limit: 8 } })
        .then(response => {
          setTrendingItems(response.data.suggestions || []);
          setSuggestions([]); // Clear suggestions when showing trending
          setSelectedIndex(-1); // Reset selection
        })
        .catch(() => {
          setTrendingItems([]);
          setSelectedIndex(-1);
        });
    }
  }, [isFocused, search]);

  // Debounce autocomplete requests (250ms) when user types
  useEffect(() => {
    if (search.trim().length === 0) {
      // If input becomes empty, clear suggestions and show trending if focused
      setSuggestions([]);
      if (isFocused) {
        api.get('/search/autocomplete', { params: { q: '', limit: 8 } })
          .then(response => {
            setTrendingItems(response.data.suggestions || []);
          })
          .catch(() => {
            setTrendingItems([]);
          });
      }
      return;
    }

    // User is typing - hide trending and fetch suggestions
    setTrendingItems([]);
    setIsLoading(true);
    setSelectedIndex(-1); // Reset selection when starting to type

    const timeoutId = setTimeout(async () => {
      try {
        const response = await api.get('/search/autocomplete', {
          params: { q: search.trim(), limit: 8 },
        });
        setSuggestions(response.data.suggestions || []);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 250); // 250ms debounce

    return () => clearTimeout(timeoutId);
  }, [search, isFocused]);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setIsFocused(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
        setIsFocused(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    setIsFocused(false);
    if (search.trim()) {
      saveRecentSearch(search.trim());
      // Search overrides category - clear category from URL
      router.push(`/ads?search=${encodeURIComponent(search)}`);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.type === 'category' && suggestion.slug) {
      // Navigate to category page
      saveRecentSearch(suggestion.title);
      setShowDropdown(false);
      setIsFocused(false);
      router.push(`/ads?category=${suggestion.slug}`);
    } else {
      // Navigate to search results
      saveRecentSearch(suggestion.title);
      setSearch(suggestion.title);
      setShowDropdown(false);
      setIsFocused(false);
      router.push(`/ads?search=${encodeURIComponent(suggestion.title)}`);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (search.trim().length === 0) {
      // Show trending items when input is empty and focused
      setShowDropdown(true);
      api.get('/search/autocomplete', { params: { q: '', limit: 8 } })
        .then(response => {
          setTrendingItems(response.data.suggestions || []);
          setSuggestions([]);
        })
        .catch(() => {
          setTrendingItems([]);
        });
    } else if (suggestions.length > 0 || isLoading) {
      // Show suggestions if available or loading
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    // Don't hide immediately - let click handler manage it
    // This prevents dropdown from closing when clicking on it
  };

  // Keyboard navigation for both trending and suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const itemsToNavigate = search.trim().length === 0 ? trendingItems : suggestions;
    const totalItems = itemsToNavigate.length;

    if (!showDropdown || totalItems === 0) {
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setIsFocused(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < totalItems - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < totalItems) {
      e.preventDefault();
      handleSuggestionClick(itemsToNavigate[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
      setIsFocused(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      // When showing trending: header (1) + trending items
      // When showing suggestions: just suggestions
      const offset = search.trim().length === 0 && isFocused ? 1 : 0; // Trending header
      const actualIndex = offset + selectedIndex;
      
      const selectedElement = suggestionsRef.current.children[actualIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, search, trendingItems, suggestions, isFocused]);

  return (
    <div className="relative w-full bg-slate-900 dark:bg-black overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 opacity-50 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1570126618953-d437176e8c79?q=80&w=2594&auto=format&fit=crop')"
        }}
      ></div>
      
      {/* Content */}
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 flex flex-col items-center justify-center min-h-[350px] sm:min-h-[400px] text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 sm:mb-4 tracking-tight drop-shadow-lg max-w-4xl">
          Find anything in <span className="text-blue-300 break-words">{currentLocation.name}</span>
        </h1>
        <h2 className="text-base sm:text-lg md:text-xl text-slate-200 mb-6 sm:mb-8 max-w-2xl font-medium drop-shadow-md px-4">
          Buy and sell everything from cars to mobile phones right now!
        </h2>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-lg p-2 shadow-2xl flex flex-col md:flex-row gap-2 backdrop-blur-sm">
          {/* Search Input */}
          <div ref={searchRef} className="flex-1 flex items-center h-12 md:h-14 px-3 sm:px-4 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all min-w-0">
            <span className="material-symbols-outlined text-slate-400 flex-shrink-0">search</span>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value.trim().length > 0) {
                  setShowDropdown(true);
                }
              }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              placeholder="Search for cars, phones..."
              className="w-full h-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 ml-2 text-sm sm:text-base min-w-0"
            />
            {showDropdown && (
              <div 
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl z-50 max-h-60 sm:max-h-80 overflow-y-auto"
              >
                {/* Show trending items when input is empty and focused */}
                {search.trim().length === 0 && isFocused && trendingItems.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2 text-sm text-gray-600">
                      <FiTrendingUp className="w-4 h-4" />
                      <span>Trending</span>
                    </div>
                    {trendingItems.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(item)}
                        className={`w-full text-left px-6 py-3 transition-colors border-b border-gray-100 last:border-b-0 flex items-center gap-3 ${
                          selectedIndex === index 
                            ? 'bg-primary-50 border-primary-200' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {item.type === 'category' ? (
                          <>
                            {item.icon ? (
                              <span className="text-2xl">{item.icon}</span>
                            ) : (
                              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                <FiSearch className="w-4 h-4 text-primary-600" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{item.title}</div>
                              {item.count !== undefined && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {item.count} ads
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <FiSearch className="w-4 h-4 text-gray-400" />
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{item.title}</div>
                              {item.category && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {item.category}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Show suggestions when user is typing */}
                {search.trim().length > 0 && (
                  <>
                    {isLoading ? (
                      <div className="px-6 py-4 text-center text-gray-500">
                        Searching...
                      </div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`w-full text-left px-6 py-3 transition-colors border-b border-gray-100 last:border-b-0 flex items-center gap-3 ${
                            selectedIndex === index 
                              ? 'bg-primary-50 border-primary-200' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {suggestion.type === 'category' ? (
                            <>
                              {suggestion.icon ? (
                                <span className="text-2xl">{suggestion.icon}</span>
                              ) : (
                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                  <FiSearch className="w-4 h-4 text-primary-600" />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">{suggestion.title}</div>
                                {suggestion.count !== undefined && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {suggestion.count} ads
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <FiSearch className="w-4 h-4 text-gray-400" />
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">{suggestion.title}</div>
                                <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                  {suggestion.category && (
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                      {suggestion.category}
                                    </span>
                                  )}
                                  {suggestion.location && (
                                    <span className="flex items-center gap-1">
                                      📍 {suggestion.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-6 py-4 text-center text-gray-500">
                        No suggestions found
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Location Selector */}
          <div className="flex-1 md:flex-[0.5] flex items-center h-12 md:h-14 px-3 sm:px-4 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all min-w-0">
            <span className="material-symbols-outlined text-slate-400 flex-shrink-0">location_on</span>
            <input
              type="text"
              value={currentLocation.name}
              readOnly
              className="w-full h-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 ml-2 text-sm sm:text-base truncate min-w-0"
            />
            <span className="material-symbols-outlined text-slate-400 cursor-pointer flex-shrink-0">expand_more</span>
          </div>
          
          {/* Search Button */}
          <button
            type="submit"
            className="h-12 md:h-14 px-6 sm:px-8 bg-primary hover:bg-blue-600 text-white font-bold rounded shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <span className="material-symbols-outlined hidden sm:block">search</span>
            <span className="text-sm sm:text-base">Search</span>
          </button>
        </form>
      </div>
    </div>
  );
}

