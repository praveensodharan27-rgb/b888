'use client';

import { useEffect, useRef } from 'react';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

declare global {
  interface Window {
    google: any;
  }
}

interface BusinessLocationMapProps {
  lat: number | undefined;
  lng: number | undefined;
  /** Optional: when user clicks on map, set location (e.g. for pick-on-map) */
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

export default function BusinessLocationMap({ lat, lng, onMapClick, className = '' }: BusinessLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const { googlePlacesLoaded } = useGooglePlaces();

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || !window.google?.maps) return;

    const hasCoords = typeof lat === 'number' && typeof lng === 'number';
    const center = hasCoords ? { lat: lat as number, lng: lng as number } : { lat: 19.076, lng: 72.8777 }; // default Mumbai

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: hasCoords ? 15 : 10,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      if (onMapClick) {
        mapInstanceRef.current.addListener('click', (e: any) => {
          const latLng = e.latLng;
          if (latLng) {
            const latVal = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
            const lngVal = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
            onMapClick(latVal, lngVal);
          }
        });
      }
    }

    const map = mapInstanceRef.current;

    if (hasCoords) {
      map.setCenter(center);
      map.setZoom(15);
      if (markerRef.current) {
        markerRef.current.setPosition(center);
      } else {
        markerRef.current = new window.google.maps.Marker({
          position: center,
          map,
          title: 'Business location',
        });
      }
    } else {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    }
  }, [googlePlacesLoaded, lat, lng, onMapClick]);

  const hasCoords = typeof lat === 'number' && typeof lng === 'number';

  if (!googlePlacesLoaded) {
    return (
      <div className={`flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 text-gray-500 ${className}`}>
        <div className="text-center">
          <p className="text-sm">Loading map…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-lg ${className}`}>
      <div
        ref={mapRef}
        className="h-full min-h-[280px] w-full"
        style={{ minHeight: 280 }}
      />
      {!hasCoords && (
        <p className="bg-gray-100 px-3 py-2 text-center text-xs text-gray-500">
          Search address above or click on map to set location
        </p>
      )}
    </div>
  );
}
