'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

interface AreaPlaceAutocompleteProps {
  value: string;
  onChange: (area: string) => void;
  placeholder?: string;
  disabled?: boolean;
  city?: string;
  state?: string;
  className?: string;
}

/**
 * Area/District input with Google Places Autocomplete.
 * Suggests neighbourhoods, sublociaties, and admin areas in India.
 */
export default function AreaPlaceAutocomplete({
  value,
  onChange,
  placeholder = 'Type area or locality...',
  disabled = false,
  city = '',
  state: stateName = '',
  className = '',
}: AreaPlaceAutocompleteProps) {
  const { googlePlacesLoaded } = useGooglePlaces();
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2) return;
      if (typeof window === 'undefined' || !window.google?.maps?.importLibrary) return;

      try {
        setIsLoading(true);
        const { AutocompleteSuggestion, AutocompleteSessionToken } = await window.google.maps.importLibrary('places');
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        // Prefer places with city/state in query for better relevance
        const locationQuery = [query.trim(), city, stateName].filter(Boolean).join(', ');
        const request: any = {
          input: locationQuery,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['in'],
          includedPrimaryTypes: [
            'sublocality',
            'neighborhood',
            'locality',
            'administrative_area_level_2',
            'administrative_area_level_3',
          ],
        };
        const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        setSuggestions(results || []);
        setShowDropdown(true);
      } catch (err) {
        console.warn('Area autocomplete fetch:', err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [city, stateName]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length >= 2) {
      debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelect = useCallback(
    async (suggestion: any) => {
      const placePrediction = suggestion?.placePrediction;
      if (!placePrediction) return;

      try {
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'addressComponents'],
        });

        const components = place.addressComponents || [];
        let areaName = place.displayName || place.formattedAddress || '';
        for (const comp of components) {
          const types = comp.types || [];
          if (
            types.includes('sublocality') ||
            types.includes('sublocality_level_1') ||
            types.includes('neighborhood') ||
            types.includes('administrative_area_level_2') ||
            types.includes('administrative_area_level_3')
          ) {
            areaName = comp.longText || comp.shortText || areaName;
            break;
          }
        }
        onChange(areaName);
        setInputValue(areaName);
        setSuggestions([]);
        setShowDropdown(false);
        sessionTokenRef.current = null;
      } catch (err) {
        console.error('Error fetching place details:', err);
      }
    },
    [onChange]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  if (!googlePlacesLoaded) {
    return (
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`px-3 py-1.5 border rounded text-sm min-w-[180px] ${className}`}
      />
    );
  }

  return (
    <div ref={containerRef} className={`relative min-w-[180px] ${className}`}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => inputValue.length >= 2 && suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
      {showDropdown && (suggestions.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-56 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
          ) : (
            <ul className="py-1">
              {suggestions.map((s, idx) => {
                const pred = s?.placePrediction;
                const text = pred?.text?.text || pred?.mainText?.text || '';
                const secondary = pred?.secondaryText?.text || '';
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => handleSelect(s)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex flex-col gap-0.5"
                    >
                      <span className="font-medium text-gray-900">{text}</span>
                      {secondary && <span className="text-xs text-gray-500">{secondary}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
