import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { parseSearchQuery, buildSearchUrl, saveRecentSearch } from '@/utils/searchParser';

interface SearchSuggestion {
  title: string;
  category?: string;
  subcategory?: string;
  location?: string;
}

interface UseSmartSearchOptions {
  autoSuggest?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
}

export function useSmartSearch(options: UseSmartSearchOptions = {}) {
  const {
    autoSuggest = true,
    debounceMs = 200,
    minQueryLength = 2,
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load query from URL
  useEffect(() => {
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      setQuery(searchQuery);
    }
  }, [searchParams]);

  // Fetch suggestions
  useEffect(() => {
    if (!autoSuggest || !query || query.trim().length < minQueryLength) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const response = await api.get('/ads/autocomplete', {
          params: { q: query.trim(), limit: 8 },
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

    const debounce = setTimeout(fetchSuggestions, debounceMs);
    return () => clearTimeout(debounce);
  }, [query, autoSuggest, debounceMs, minQueryLength]);

  // Execute search
  const executeSearch = useCallback((searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    // Parse query
    const parsed = parseSearchQuery(q);
    
    // Save to recent searches
    saveRecentSearch(q);

    // Build URL and navigate
    const searchUrl = buildSearchUrl(parsed);
    router.push(searchUrl);
    
    // Close suggestions
    setShowSuggestions(false);
  }, [query, router]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    loading,
    showSuggestions,
    setShowSuggestions,
    executeSearch,
    clearSearch,
  };
}
