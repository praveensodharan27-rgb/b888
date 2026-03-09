'use client';

/**
 * Enhanced Navbar Search Component
 * Drop-in replacement for the navbar search section
 * Includes smart parsing and autosuggest
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';
import AutosuggestDropdown from './AutosuggestDropdown';
import { parseSearchQuery, buildSearchUrl, saveRecentSearch } from '@/utils/searchParser';

interface NavbarSearchEnhancedProps {
  className?: string;
}

export default function NavbarSearchEnhanced({ className = '' }: NavbarSearchEnhancedProps) {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchPlaceholder, setSearchPlaceholder] = useState('');
  const [showSearchCursor, setShowSearchCursor] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const SEARCH_EXAMPLES = [
    'Find Cars, Mobile Phones and more...',
    'Buy smartphones near you',
    'Sell your bike quickly',
    'Discover local deals',
    'Post your ad in minutes'
  ];

  // Typewriter animation for placeholder
  useEffect(() => {
    let currentIndex = 0;
    let currentText = '';
    let isDeleting = false;
    let timeout: NodeJS.Timeout;

    const type = () => {
      const fullText = SEARCH_EXAMPLES[currentIndex];

      if (isDeleting) {
        currentText = fullText.substring(0, currentText.length - 1);
      } else {
        currentText = fullText.substring(0, currentText.length + 1);
      }

      setSearchPlaceholder(currentText);

      let delay = isDeleting ? 30 : 60;

      if (!isDeleting && currentText === fullText) {
        delay = 2000;
        isDeleting = true;
      } else if (isDeleting && currentText === '') {
        isDeleting = false;
        currentIndex = (currentIndex + 1) % SEARCH_EXAMPLES.length;
        delay = 500;
      }

      timeout = setTimeout(type, delay);
    };

    timeout = setTimeout(type, 1000);

    return () => clearTimeout(timeout);
  }, []);

  // Cursor blink animation
  useEffect(() => {
    const interval = setInterval(() => {
      setShowSearchCursor(prev => !prev);
    }, 530);

    return () => clearInterval(interval);
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (!searchText.trim()) {
      router.push('/ads');
      return;
    }

    // Parse query with smart parser
    const parsed = parseSearchQuery(searchText.trim());
    saveRecentSearch(searchText.trim());
    const searchUrl = buildSearchUrl(parsed);
    
    setShowSuggestions(false);
    router.push(searchUrl);
  };

  const handleSuggestionSelect = (suggestion: any) => {
    setSearchText(suggestion.title);
    setShowSuggestions(false);
    
    const parsed = parseSearchQuery(suggestion.title);
    saveRecentSearch(suggestion.title);
    const searchUrl = buildSearchUrl(parsed);
    router.push(searchUrl);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="w-full min-w-0 bg-white border border-gray-200 rounded-lg flex items-center overflow-hidden hover:border-blue-400 transition-colors h-9">
        <FiSearch className="w-4 h-4 text-gray-500 ml-2 sm:ml-3 flex-shrink-0" />
        <div className="flex-1 relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && searchText.trim()) {
                handleSearch();
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder=""
            className="flex-1 min-w-0 px-2 sm:px-3 py-1 text-sm text-gray-700 border-none outline-none bg-transparent w-full h-full"
          />
          {!searchText && (
            <div className="absolute inset-0 flex items-center pointer-events-none px-2 sm:px-3">
              <span className="text-sm text-gray-500">
                {searchPlaceholder}
                <span className={`inline-block w-0.5 h-3 bg-blue-500 ml-0.5 align-middle ${showSearchCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}>
                  {' '}
                </span>
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 flex items-center justify-center gap-1.5 transition-colors flex-shrink-0 h-full rounded-r-lg min-w-[44px]"
        >
          <FiSearch className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Search</span>
        </button>
      </div>

      {/* Autosuggest Dropdown */}
      <AutosuggestDropdown
        query={searchText}
        isOpen={showSuggestions}
        onSelect={handleSuggestionSelect}
        onClose={() => setShowSuggestions(false)}
      />
    </div>
  );
}
