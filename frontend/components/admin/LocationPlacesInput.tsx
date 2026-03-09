'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import PlaceAutocompleteInputFirefox from '../PlaceAutocompleteInputFirefox';
import { FiMapPin, FiX, FiPlus } from 'react-icons/fi';

const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);

/**
 * Convert place name to slug (matches backend sponsored-ads toLocationSlug)
 * e.g. "New Delhi" -> "new-delhi", "Mumbai" -> "mumbai"
 */
function toLocationSlug(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Extract city/locality from place address_components (legacy format)
 * Priority: locality > administrative_area_level_2 > sublocality_level_1
 */
function extractCityFromPlace(place: { address_components?: Array<{ long_name: string; types: string[] }> }): string | null {
  if (!place.address_components || !Array.isArray(place.address_components)) return null;
  let city = '';
  for (const component of place.address_components) {
    const types = component.types || [];
    if (types.includes('locality')) {
      city = component.long_name;
      break;
    }
    if (!city && (types.includes('administrative_area_level_2') || types.includes('sublocality_level_1'))) {
      city = component.long_name;
    }
  }
  return city || null;
}

interface LocationPlacesInputProps {
  value: string[];
  onChange: (locations: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Admin location input with Google Places Autocomplete.
 * Selects cities/areas and converts them to slugs for sponsored ad targeting.
 */
export default function LocationPlacesInput({
  value = [],
  onChange,
  placeholder = 'Search and add target locations (cities)...',
  disabled = false,
}: LocationPlacesInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const handlePlaceSelect = useCallback((place: any) => {
    const currentValue = valueRef.current;
    const currentOnChange = onChangeRef.current;
    let slug = '';
    if (place.city) {
      slug = toLocationSlug(place.city);
    } else {
      const city = extractCityFromPlace(place);
      if (city) {
        slug = toLocationSlug(city);
      } else {
        const fallback = place.name || place.formatted_address?.split(',')[0]?.trim() || place.address?.split(',')[0]?.trim() || '';
        if (!fallback) return;
        slug = toLocationSlug(fallback);
      }
    }
    if (slug && !currentValue.includes(slug)) {
      currentOnChange([...currentValue, slug]);
    }
  }, []);

  const { googlePlacesLoaded, getValue } = usePlacesAutocomplete(containerRef, {
    country: 'in',
    types: ['locality', 'administrative_area_level_3'],
    onPlaceSelect: handlePlaceSelect,
  });

  const handleFirefoxPlaceSelect = useCallback((result: { city?: string; address?: string }) => {
    handlePlaceSelect(result);
  }, [handlePlaceSelect]);

  const firefoxInputRef = useRef<{ getValue: () => string } | null>(null);

  const [manualInput, setManualInput] = useState('');
  const [showManualFallback, setShowManualFallback] = useState(false);

  // Show manual mode after 2s if Google Places not loaded - Add button always visible
  useEffect(() => {
    if (googlePlacesLoaded) setShowManualFallback(false);
    else {
      const t = setTimeout(() => setShowManualFallback(true), 2000);
      return () => clearTimeout(t);
    }
  }, [googlePlacesLoaded]);

  const addManualLocation = () => {
    const raw = showManualFallback ? manualInput : (isFirefox ? firefoxInputRef.current?.getValue?.() : getValue?.()) || '';
    const slug = toLocationSlug(raw);
    if (slug && !value.includes(slug)) {
      onChange([...value, slug]);
      setManualInput('');
    }
  };

  const removeLocation = (slug: string) => {
    onChange(value.filter((s) => s !== slug));
  };

  const addAllIndia = () => {
    if (!value.includes('all-india')) {
      onChange([...value, 'all-india']);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((slug) => (
          <span
            key={slug}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
          >
            <FiMapPin className="w-3.5 h-3.5" />
            {slug}
            <button
              type="button"
              onClick={() => removeLocation(slug)}
              className="hover:bg-blue-200 rounded p-0.5"
              aria-label={`Remove ${slug}`}
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {googlePlacesLoaded ? (
          isFirefox ? (
            <div
              className="flex-1 min-w-[180px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addManualLocation();
                }
              }}
            >
              <PlaceAutocompleteInputFirefox
                ref={firefoxInputRef}
                visible
                placeholder={placeholder}
                onPlaceSelect={handleFirefoxPlaceSelect}
                includedRegionCodes={['in']}
                includedPrimaryTypes={['locality', 'administrative_area_level_3']}
                className="w-full"
              />
            </div>
          ) : (
            <div
              ref={containerRef}
              className="flex-1 min-w-[180px] [&>gmp-place-autocomplete]:w-full [&>gmp-place-autocomplete]:rounded [&>gmp-place-autocomplete]:border [&>gmp-place-autocomplete]:border-gray-300 [&>gmp-place-autocomplete]:px-3 [&>gmp-place-autocomplete]:py-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addManualLocation();
                }
              }}
            />
          )
        ) : showManualFallback ? (
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            disabled={disabled}
            placeholder="Type city (e.g. Mumbai, Delhi) and click Add"
            className="flex-1 min-w-[180px] border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addManualLocation();
              }
            }}
          />
        ) : (
          <input
            type="text"
            disabled
            placeholder="Type city and click Add (Google Places loading...)"
            className="flex-1 min-w-[180px] border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50 disabled:text-gray-500"
          />
        )}
        <button
          type="button"
          onClick={addManualLocation}
          disabled={disabled}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1"
          title="Add the city you typed above"
        >
          <FiPlus className="w-4 h-4" /> Add
        </button>
        <button
          type="button"
          onClick={addAllIndia}
          disabled={disabled || value.includes('all-india')}
          className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          Add All India
        </button>
      </div>
      {showManualFallback && (
        <p className="text-xs text-amber-600">
          Google Places not loading. Type city names above and click Add. Ensure <code className="bg-amber-50 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> is set and add your domain (e.g. localhost:3000/admin/*) to API key referrer restrictions.
        </p>
      )}
      <p className="text-xs text-gray-500">
        Leave empty for all locations. Use search to add cities (e.g. Mumbai, Delhi). Slugs are auto-generated.
      </p>
    </div>
  );
}
