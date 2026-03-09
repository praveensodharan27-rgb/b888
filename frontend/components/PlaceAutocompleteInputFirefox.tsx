'use client';

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

export interface PlaceResult {
  latitude: number;
  longitude: number;
  address: string;
  city?: string;
  state?: string;
  displayName?: string;
}

interface PlaceAutocompleteInputFirefoxProps {
  onPlaceSelect: (result: PlaceResult) => void;
  placeholder?: string;
  value?: string;
  includedRegionCodes?: string[];
  includedPrimaryTypes?: string[];
  visible?: boolean;
  className?: string;
}

export interface PlaceAutocompleteInputFirefoxRef {
  getValue: () => string;
}

/**
 * Firefox fallback: programmatic AutocompleteSuggestion.fetchAutocompleteSuggestions
 * with custom input + dropdown. PlaceAutocompleteElement has known issues in Firefox.
 */
const PlaceAutocompleteInputFirefox = forwardRef<PlaceAutocompleteInputFirefoxRef, PlaceAutocompleteInputFirefoxProps>(function PlaceAutocompleteInputFirefox({
  onPlaceSelect,
  placeholder = 'Search city or area...',
  value = '',
  includedRegionCodes = ['in'],
  includedPrimaryTypes = ['locality', 'administrative_area_level_3'],
  visible = true,
  className = '',
}, ref) {
  const [inputValue, setInputValue] = useState(value);

  useImperativeHandle(ref, () => ({
    getValue: () => inputValue,
  }), [inputValue]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }
    if (typeof window === 'undefined' || !window.google?.maps?.importLibrary) return;

    try {
      setIsLoading(true);
      const { AutocompleteSuggestion, AutocompleteSessionToken } = await window.google.maps.importLibrary('places');
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new AutocompleteSessionToken();
      }
      const request: any = {
        input: query.trim(),
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: includedRegionCodes,
        includedPrimaryTypes: includedPrimaryTypes,
      };
      const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      setSuggestions(results || []);
      setShowDropdown(true);
    } catch (err) {
      console.warn('Firefox autocomplete fetch:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [includedRegionCodes, includedPrimaryTypes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length >= 2) {
      debounceRef.current = setTimeout(() => fetchSuggestions(v), 250);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleFocus = () => {
    if (inputValue.length >= 2 && suggestions.length > 0) setShowDropdown(true);
  };

  const handleSelect = useCallback(async (suggestion: any) => {
    const placePrediction = suggestion?.placePrediction;
    if (!placePrediction) return;

    try {
      const place = placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'],
      });

      const location = place.location;
      if (!location) return;

      const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
      const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
      const address = place.formattedAddress || place.displayName || '';

      let city = '';
      let state = '';
      const components = place.addressComponents || [];
      for (const comp of components) {
        const types = comp.types || [];
        if (types.includes('locality')) city = comp.longText || comp.shortText || '';
        if (types.includes('administrative_area_level_1')) state = comp.longText || comp.shortText || '';
      }

      onPlaceSelect({ latitude: lat, longitude: lng, address, city, state, displayName: place.displayName });
      setInputValue(address);
      setSuggestions([]);
      setShowDropdown(false);
      sessionTokenRef.current = null;
    } catch (err) {
      console.error('Error fetching place details:', err);
    }
  }, [onPlaceSelect]);

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

  if (!visible) return null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
        autoComplete="off"
      />
      {showDropdown && (suggestions.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-1.5 min-w-full bg-white border border-gray-200 rounded-xl shadow-lg ring-1 ring-black/5 z-[99999] max-h-64 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="px-4 py-3.5 text-sm text-gray-700 flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Searching...
            </div>
          ) : (
            <ul className="py-1.5">
              {suggestions.map((s, idx) => {
                const pred = s?.placePrediction;
                const text = pred?.text?.text || pred?.mainText?.text || '';
                const secondary = pred?.secondaryText?.text || '';
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => handleSelect(s)}
                      className="w-full px-4 py-3 text-left text-sm flex flex-col gap-0.5 transition-colors first:rounded-t-lg last:rounded-b-lg min-w-0 hover:bg-gray-50 active:bg-gray-100 focus:bg-gray-50"
                    >
                      <span className="font-semibold text-gray-900 break-words">{text}</span>
                      {secondary && <span className="text-gray-600 text-xs break-words">{secondary}</span>}
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
});

export default PlaceAutocompleteInputFirefox;
