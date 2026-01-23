'use client';

import { useEffect, useRef, useCallback, useState, RefObject } from 'react';
import { useGooglePlaces } from './useGooglePlaces';

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
 * Shared hook for initializing Google Places Autocomplete
 * Prevents multiple initializations
 * Mandatory input DOM ready check
 */
export function usePlacesAutocomplete(
  inputRef: RefObject<HTMLInputElement | null>,
  options: AutocompleteOptions = {}
) {
  const { googlePlacesLoaded } = useGooglePlaces();
  const autocompleteInstanceRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationAttemptedRef = useRef(false);

  const {
    country = 'in',
    bounds,
    types = ['geocode', 'establishment'],
    fields = [
      'place_id',
      'geometry',
      'formatted_address',
      'address_components',
      'name',
      'types'
    ],
    onPlaceSelect
  } = options;

  // Initialize autocomplete - MANDATORY input DOM ready check
  const initializeAutocomplete = useCallback(() => {
    // CRITICAL: Input element MUST exist in DOM
    if (!inputRef.current) {
      console.log('⚠️ Autocomplete init skipped: Input not in DOM');
      return;
    }

    // CRITICAL: Google Places must be available
    if (typeof window === 'undefined' || !window.google?.maps?.places) {
      console.log('⚠️ Autocomplete init skipped: Google Places not available');
      return;
    }

    // CRITICAL: Prevent multiple initializations
    if (autocompleteInstanceRef.current) {
      console.log('⚠️ Autocomplete init skipped: Already initialized');
      return;
    }

    // CRITICAL: Check if already initialized on this input element
    if ((inputRef.current as any).__autocompleteInitialized) {
      console.log('⚠️ Autocomplete init skipped: Input already has autocomplete');
      return;
    }

    // CRITICAL: Check if input is actually in the DOM (not just ref exists)
    if (!document.body.contains(inputRef.current)) {
      console.log('⚠️ Autocomplete init skipped: Input not attached to DOM');
      return;
    }

    try {
      console.log('🔧 Initializing autocomplete - all conditions met');

      // Create autocomplete options
      const autocompleteOptions: any = {
        componentRestrictions: country ? { country } : undefined,
        fields: fields,
        types: types,
        strictBounds: false,
      };

      // Add bounds if provided
      if (bounds && window.google.maps.LatLngBounds && window.google.maps.LatLng) {
        try {
          autocompleteOptions.bounds = new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(bounds.southwest.lat, bounds.southwest.lng),
            new window.google.maps.LatLng(bounds.northeast.lat, bounds.northeast.lng)
          );
        } catch (boundsError) {
          console.warn('⚠️ Could not set bounds for autocomplete:', boundsError);
        }
      }

      // Create autocomplete instance
      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current,
        autocompleteOptions
      );

      autocompleteInstanceRef.current = autocomplete;

      // Mark input as initialized
      (inputRef.current as any).__autocompleteInitialized = true;
      setIsInitialized(true);

      console.log('✅ Google Places Autocomplete initialized successfully');

      // Handle place selection
      autocomplete.addListener('place_changed', () => {
        try {
          const place = autocomplete.getPlace();

          if (onPlaceSelect && typeof onPlaceSelect === 'function') {
            onPlaceSelect(place);
          }
        } catch (error) {
          console.error('Error in place_changed listener:', error);
        }
      });

      // Minimum character requirement (3 characters) before showing suggestions
      const MIN_CHARS_FOR_AUTOCOMPLETE = 3;

      // Function to hide/show autocomplete dropdown based on character count
      const toggleAutocompleteDropdown = () => {
        const pacContainer = document.querySelector('.pac-container') as HTMLElement;
        if (pacContainer && inputRef.current) {
          const inputValue = inputRef.current.value.trim();
          if (inputValue.length < MIN_CHARS_FOR_AUTOCOMPLETE) {
            pacContainer.style.display = 'none';
          } else {
            pacContainer.style.display = 'block';
          }
        }
      };

      // Listen to input changes to control dropdown visibility
      if (inputRef.current) {
        inputRef.current.addEventListener('input', toggleAutocompleteDropdown);
      }

      // Function to ensure dropdown z-index is set
      const ensureDropdownZIndex = () => {
        const pacContainer = document.querySelector('.pac-container') as HTMLElement;
        if (pacContainer) {
          pacContainer.style.zIndex = '9999';
          pacContainer.style.position = 'absolute';
          toggleAutocompleteDropdown();
        }
      };

      // Set z-index immediately
      ensureDropdownZIndex();

      // Watch for dropdown appearance using MutationObserver
      const observer = new MutationObserver(() => {
        ensureDropdownZIndex();
      });

      // Observe the document body for changes
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Also set z-index on input focus
      const handleFocus = () => {
        ensureDropdownZIndex();
        setTimeout(ensureDropdownZIndex, 100);
      };

      if (inputRef.current) {
        inputRef.current.addEventListener('focus', handleFocus);
      }

    } catch (error) {
      console.error('❌ Error initializing Google Places Autocomplete:', error);
    }
  }, [inputRef, country, bounds, types, fields, onPlaceSelect]);

  // Initialize autocomplete when conditions are met
  useEffect(() => {
    // Don't attempt if already tried
    if (initializationAttemptedRef.current && isInitialized) {
      return;
    }

    // Wait for Google Places to be loaded
    if (!googlePlacesLoaded) {
      return;
    }

    // CRITICAL: Input must exist in DOM
    if (!inputRef.current) {
      return;
    }

    // CRITICAL: Input must be attached to DOM
    if (!document.body.contains(inputRef.current)) {
      return;
    }

    // CRITICAL: Prevent multiple initialization attempts
    if (autocompleteInstanceRef.current || (inputRef.current as any).__autocompleteInitialized) {
      return;
    }

    // Small delay to ensure DOM is fully ready
    const timer = setTimeout(() => {
      // Re-check all conditions before initializing
      if (!inputRef.current) return;
      if (!document.body.contains(inputRef.current)) return;
      if (!window.google?.maps?.places) return;
      if (autocompleteInstanceRef.current) return;
      if ((inputRef.current as any).__autocompleteInitialized) return;

      initializationAttemptedRef.current = true;
      initializeAutocomplete();
    }, 100);

    return () => clearTimeout(timer);
  }, [googlePlacesLoaded, inputRef, initializeAutocomplete, isInitialized]);

  return {
    autocompleteInstance: autocompleteInstanceRef.current,
    isInitialized,
    googlePlacesLoaded
  };
}

// Default export for better module resolution
export default usePlacesAutocomplete;

