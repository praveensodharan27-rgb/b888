/**
 * useSearch Hook - OLX-style smart search
 * 
 * Features:
 * - Debounced search (300ms)
 * - Loading states
 * - Error handling
 * - Autocomplete suggestions
 * - Recent searches (localStorage)
 * - Trending searches
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';

export interface SearchSuggestion {
  id: string;
  title: string;
  category?: string;
  categoryName?: string;
  city?: string;
  price?: number;
  images?: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  price: number;
  images: string[];
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  location?: {
    id: string;
    name: string;
    slug: string;
  };
  city?: string;
  state?: string;
  planType?: string;
  planPriority?: number;
  isTopAdActive?: boolean;
  isFeaturedActive?: boolean;
  isBumpActive?: boolean;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface SearchResponse {
  success: boolean;
  query: string;
  hits: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  processingTime: number;
  fallback?: boolean;
}

export interface UseSearchOptions {
  debounceMs?: number;
  autoSearch?: boolean;
  initialQuery?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  sort?: string;
  limit?: number;
}

export interface UseSearchReturn {
  // Search state
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  processingTime: number;
  
  // Loading states
  isSearching: boolean;
  isLoadingSuggestions: boolean;
  
  // Error states
  error: string | null;
  
  // Suggestions
  suggestions: SearchSuggestion[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  
  // Actions
  search: (q?: string, p?: number) => Promise<void>;
  clearSearch: () => void;
  loadMore: () => Promise<void>;
  
  // Recent searches
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  
  // Trending
  trending: Array<{ query: string; count: number }>;
}

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 10;

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    debounceMs = 300,
    autoSearch = false,
    initialQuery = '',
    category,
    location,
    minPrice,
    maxPrice,
    condition,
    sort = 'newest',
    limit = 20,
  } = options;

  // State
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trending, setTrending] = useState<Array<{ query: string; count: number }>>([]);

  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to load recent searches:', err);
      }
    }
  }, []);

  // Load trending searches
  useEffect(() => {
    loadTrending();
  }, []);

  // Auto-search on query change (with debounce)
  useEffect(() => {
    if (!autoSearch) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        search(query, 1);
      }, debounceMs);
    } else if (query.trim().length === 0) {
      setResults([]);
      setTotal(0);
      setTotalPages(0);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, autoSearch, debounceMs]);

  // Load suggestions on query change (with debounce)
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      loadSuggestions(query);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs]);

  // Search function
  const search = useCallback(async (q?: string, p: number = 1) => {
    const searchQuery = q !== undefined ? q : query;
    
    if (!searchQuery.trim()) {
      setResults([]);
      setTotal(0);
      setTotalPages(0);
      return;
    }

    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsSearching(true);
      setError(null);

      const params: any = {
        q: searchQuery,
        page: p,
        limit,
        sort,
      };

      if (category) params.category = category;
      if (location) params.location = location;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (condition) params.condition = condition;

      const response = await api.get<SearchResponse>('/search', {
        params,
        signal: abortControllerRef.current.signal,
      });

      if (response.data.success) {
        setResults(response.data.hits);
        setTotal(response.data.total);
        setPage(response.data.page);
        setTotalPages(response.data.totalPages);
        setProcessingTime(response.data.processingTime);
        
        // Add to recent searches
        addRecentSearch(searchQuery);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        console.error('Search error:', err);
        setError(err.response?.data?.message || 'Search failed');
      }
    } finally {
      setIsSearching(false);
    }
  }, [query, category, location, minPrice, maxPrice, condition, sort, limit]);

  // Load suggestions
  const loadSuggestions = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoadingSuggestions(true);

      const response = await api.get('/search/suggestions', {
        params: { q, limit: 8 },
      });

      if (response.data.success) {
        setSuggestions(response.data.suggestions || []);
      }
    } catch (err) {
      console.error('Suggestions error:', err);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Load trending searches
  const loadTrending = useCallback(async () => {
    try {
      const response = await api.get('/search/trending', {
        params: { limit: 10 },
      });

      if (response.data.success) {
        setTrending(response.data.trending || []);
      }
    } catch (err) {
      console.error('Trending error:', err);
    }
  }, []);

  // Load more results (pagination)
  const loadMore = useCallback(async () => {
    if (page >= totalPages) return;
    await search(query, page + 1);
  }, [page, totalPages, query, search]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setTotal(0);
    setPage(1);
    setTotalPages(0);
    setProcessingTime(0);
    setError(null);
    setSuggestions([]);
  }, []);

  // Add recent search
  const addRecentSearch = useCallback((q: string) => {
    if (!q || q.trim().length < 2) return;

    const trimmed = q.trim();
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save recent search:', err);
        }
      }
      
      return updated;
    });
  }, []);

  // Remove recent search
  const removeRecentSearch = useCallback((q: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== q);
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to remove recent search:', err);
        }
      }
      
      return updated;
    });
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(RECENT_SEARCHES_KEY);
      } catch (err) {
        console.error('Failed to clear recent searches:', err);
      }
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    total,
    page,
    totalPages,
    processingTime,
    isSearching,
    isLoadingSuggestions,
    error,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    search,
    clearSearch,
    loadMore,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    trending,
  };
}
