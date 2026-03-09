'use client';

import { useState, useEffect } from 'react';
import { getCurrentPosition } from '@/utils/geolocation';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }));
      return;
    }

    getCurrentPosition()
      .then(({ latitude, longitude, accuracy }) => {
        setState({
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          error: null,
          loading: false,
        });
      })
      .catch((err: { code?: number; message?: string }) => {
        let errorMessage = 'Unable to retrieve your location';
        const code = err?.code ?? 2;
        if (code === 1) errorMessage = 'Location access denied by user';
        else if (code === 2) errorMessage = 'Location information unavailable';
        else if (code === 3) errorMessage = 'Location request timed out';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      });
  }, []);

  return state;
};

