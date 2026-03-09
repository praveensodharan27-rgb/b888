'use client';

import React, { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

export interface AddressPlaceResult {
  lat: number;
  lng: number;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  formattedAddress: string;
}

interface AddressPlaceInputProps {
  onSelect: (result: AddressPlaceResult) => void;
  placeholder?: string;
  visible?: boolean;
  className?: string;
}

/**
 * Address autocomplete using Google PlaceAutocompleteElement (street_address / premise).
 * Fills street, city, state, postalCode and lat/lng for business location.
 */
export default function AddressPlaceInput({
  onSelect,
  placeholder = 'Search address or place…',
  visible = true,
  className = '',
}: AddressPlaceInputProps) {
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
            fields: ['formattedAddress', 'location', 'addressComponents'],
          });

          const location = place.location;
          if (!location) return;

          const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
          const lng = typeof location.lng === 'function' ? location.lng() : location.lng;

          let street = '';
          let city = '';
          let state = '';
          let postalCode = '';

          const components = place.addressComponents || [];
          for (const comp of components) {
            const types = comp.types || [];
            const val = comp.longText || comp.shortText || '';
            if (types.includes('street_number') || types.includes('route')) {
              street = street ? `${street} ${val}` : val;
            }
            if (types.includes('locality')) {
              city = val;
            }
            if (types.includes('administrative_area_level_1')) {
              state = val;
            }
            if (types.includes('postal_code')) {
              postalCode = val;
            }
          }
          if (!street && place.formattedAddress) {
            street = place.formattedAddress;
          }

          onSelect({
            lat,
            lng,
            street,
            city,
            state,
            postalCode,
            formattedAddress: place.formattedAddress || '',
          });
        } catch (err) {
          console.error('Error fetching place details:', err);
        }
      };

      if (elementRef.current && containerRef.current?.contains(elementRef.current)) {
        elementRef.current.remove();
        elementRef.current = null;
      }

      const element = new PlaceAutocompleteElement({
        placeholder,
        includedRegionCodes: ['in'],
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
      });

      element.addEventListener('gmp-select', handleSelect as EventListener);
      if (!containerRef.current) return;
      elementRef.current = element;
      containerRef.current.appendChild(element);
    } catch (err) {
      console.error('Error initializing AddressPlaceInput:', err);
    }
  }, [visible, placeholder, onSelect]);

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

  if (!visible) return null;

  return (
    <div ref={containerRef} className={className} style={{ width: '100%' }} />
  );
}
