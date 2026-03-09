'use client';

import React, { useEffect, useRef, useCallback } from 'react';

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

interface PlaceAutocompleteInputProps {
  /** Called when user selects a place */
  onPlaceSelect: (result: PlaceResult) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Initial value */
  value?: string;
  /** Restrict to region codes (e.g. ['in'] for India) */
  includedRegionCodes?: string[];
  /** Restrict to place types (e.g. ['locality'] for cities) */
  includedPrimaryTypes?: string[];
  /** Whether the input is visible (for lazy init) */
  visible?: boolean;
  /** Container class name */
  className?: string;
}

/**
 * PlaceAutocompleteInput - Uses new PlaceAutocompleteElement (gmp-place-autocomplete)
 * with gmp-select event. Migrated from deprecated google.maps.places.Autocomplete.
 * Requires loading=async in Maps API script for importLibrary() support.
 */
export default function PlaceAutocompleteInput({
  onPlaceSelect,
  placeholder = 'Search city or area...',
  value = '',
  includedRegionCodes = ['in'],
  includedPrimaryTypes = ['locality', 'administrative_area_level_3'],
  visible = true,
  className = '',
}: PlaceAutocompleteInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<any>(null);

  const initElement = useCallback(async () => {
    if (!containerRef.current || !visible || typeof window === 'undefined') return;
    if (!window.google?.maps?.importLibrary) return;

    try {
      const { PlaceAutocompleteElement } = await window.google.maps.importLibrary('places');
      if (!PlaceAutocompleteElement) return;

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

          let city = '';
          let state = '';

          const components = place.addressComponents || [];
          for (const comp of components) {
            const types = comp.types || [];
            if (types.includes('locality')) {
              city = comp.longText || comp.shortText || '';
            }
            if (types.includes('administrative_area_level_1')) {
              state = comp.longText || comp.shortText || '';
            }
          }

          onPlaceSelect({
            latitude: lat,
            longitude: lng,
            address,
            city,
            state,
            displayName: place.displayName,
          });
        } catch (err) {
          console.error('Error fetching place details:', err);
        }
      };

      // Clear existing element
      if (elementRef.current && containerRef.current?.contains(elementRef.current)) {
        elementRef.current.remove();
        elementRef.current = null;
      }

      const element = new PlaceAutocompleteElement({
        placeholder,
        value,
        includedRegionCodes,
        includedPrimaryTypes,
      });

      element.addEventListener('gmp-select', handleSelect as EventListener);
      // Re-check container after async - may have unmounted (e.g. dropdown closed)
      if (!containerRef.current) return;
      elementRef.current = element;
      containerRef.current.appendChild(element);
    } catch (err) {
      console.error('Error initializing PlaceAutocompleteElement:', err);
    }
  }, [visible, placeholder, value, includedRegionCodes, includedPrimaryTypes, onPlaceSelect]);

  useEffect(() => {
    if (!visible) return;
    initElement();
    return () => {
      if (elementRef.current && containerRef.current?.contains(elementRef.current)) {
        elementRef.current.remove();
        elementRef.current = null;
      }
    };
  }, [visible, initElement]);

  // Update value when prop changes
  useEffect(() => {
    if (elementRef.current && elementRef.current.value !== value) {
      elementRef.current.value = value;
    }
  }, [value]);

  if (!visible) return null;

  return (
    <div ref={containerRef} className={className} style={{ width: '100%' }} />
  );
}
