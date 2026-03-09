'use client';

import { useEffect, useRef, useCallback, useState, RefObject } from 'react';
import { useGooglePlaces } from './useGooglePlaces';

declare global {
  interface Window {
    google: any;
  }
}

interface AutocompleteOptions {
  country?: string;
  bounds?: {
    southwest: { lat: number; lng: number };
    northeast: { lat: number; lng: number };
  };
  types?: string[];
  fields?: string[];
  onPlaceSelect?: (place: any) => void;
}

/**
 * Build legacy PlaceResult-compatible object from new Place API result.
 * Allows existing onPlaceSelect handlers (post-ad, admin) to work unchanged.
 */
function toLegacyPlaceResult(
  lat: number,
  lng: number,
  address: string,
  displayName: string | undefined,
  addressComponents: Array<{ longText?: string; shortText?: string; types: string[] }> | undefined
): any {
  const components = (addressComponents || []).map((c) => ({
    long_name: c.longText || c.shortText || '',
    short_name: c.shortText || c.longText || '',
    types: c.types || [],
  }));
  return {
    geometry: {
      location: {
        lat: () => lat,
        lng: () => lng,
      },
    },
    formatted_address: address,
    name: displayName || address,
    address_components: components,
  };
}

/**
 * Shared hook for Google Places Autocomplete using new PlaceAutocompleteElement.
 * Uses gmp-place-autocomplete with gmp-select event (migrated from deprecated Autocomplete).
 * Requires containerRef - PlaceAutocompleteElement provides its own input.
 */
export function usePlacesAutocomplete(
  containerRef: RefObject<HTMLDivElement | null>,
  options: AutocompleteOptions = {}
) {
  const { googlePlacesLoaded } = useGooglePlaces();
  const elementRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const onPlaceSelectRef = useRef(options.onPlaceSelect);
  onPlaceSelectRef.current = options.onPlaceSelect;

  const {
    country = 'in',
    bounds,
    types = ['geocode', 'establishment'],
    onPlaceSelect,
  } = options;

  const initElement = useCallback(async () => {
    if (!containerRef.current || typeof window === 'undefined') return;
    if (!window.google?.maps?.importLibrary) return;

    try {
      const { PlaceAutocompleteElement } = await window.google.maps.importLibrary('places');
      if (!PlaceAutocompleteElement) return;

      if (elementRef.current && containerRef.current.contains(elementRef.current)) {
        elementRef.current.remove();
        elementRef.current = null;
      }

      const opts: any = {
        placeholder: 'Search location...',
        includedRegionCodes: country ? [country] : undefined,
      };

      if (types?.length) {
        opts.includedPrimaryTypes = types;
      }

      if (bounds && window.google.maps.LatLngBounds) {
        try {
          opts.locationBias = new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(bounds.southwest.lat, bounds.southwest.lng),
            new window.google.maps.LatLng(bounds.northeast.lat, bounds.northeast.lng)
          );
        } catch (e) {
          console.warn('Could not set bounds:', e);
        }
      }

      const element = new PlaceAutocompleteElement(opts);

      const handleSelect = async (event: any) => {
        const placePrediction = event?.placePrediction;
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
          const components = place.addressComponents || [];

          const legacyPlace = toLegacyPlaceResult(
            lat,
            lng,
            address,
            place.displayName,
            components
          );

          if (onPlaceSelectRef.current) {
            onPlaceSelectRef.current(legacyPlace);
          }
        } catch (err) {
          console.error('Error fetching place details:', err);
        }
      };

      element.addEventListener('gmp-select', handleSelect as EventListener);
      // Re-check container after async - may have unmounted
      if (!containerRef.current) return;
      elementRef.current = element;
      containerRef.current.appendChild(element);
      setIsInitialized(true);
    } catch (err) {
      console.error('Error initializing PlaceAutocompleteElement:', err);
    }
  }, [containerRef, country, bounds, types]);

  useEffect(() => {
    if (!googlePlacesLoaded) return;
    if (!containerRef.current) return;
    if (!document.body.contains(containerRef.current)) return;
    if (elementRef.current) return;

    const timer = setTimeout(initElement, 100);
    return () => {
      clearTimeout(timer);
      if (elementRef.current && containerRef.current?.contains(elementRef.current)) {
        elementRef.current.remove();
        elementRef.current = null;
      }
    };
  }, [googlePlacesLoaded, containerRef, initElement]);

  const setValue = useCallback((v: string) => {
    if (elementRef.current) elementRef.current.value = v;
  }, []);

  return {
    autocompleteInstance: elementRef.current,
    isInitialized,
    googlePlacesLoaded,
    getValue: () => elementRef.current?.value ?? '',
    setValue,
  };
}

export default usePlacesAutocomplete;
