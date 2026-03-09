'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useLocationPersistence } from './useLocationPersistence';
import { getCurrentPosition } from '@/utils/geolocation';

export interface PromoLocation {
  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
}

export interface FreePostingPromoCard {
  id: string;
  image: string | null;
  title: string;
  description: string | null;
  ctaText: string;
  ctaLink: string;
}

const CACHE_KEY = 'free-posting-promo-card';
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function clearPromoCardCache() {
  if (typeof window === 'undefined') return;
  try {
    Object.keys(sessionStorage).filter((k) => k.startsWith(CACHE_KEY)).forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

function getCachedCard(locationKey: string): { card: FreePostingPromoCard; ts: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY}:${locationKey}`);
    if (!raw) return null;
    const { card, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return { card, ts };
  } catch {
    return null;
  }
}

function setCachedCard(locationKey: string, card: FreePostingPromoCard | null) {
  if (typeof window === 'undefined') return;
  try {
    if (card) {
      sessionStorage.setItem(`${CACHE_KEY}:${locationKey}`, JSON.stringify({ card, ts: Date.now() }));
    } else {
      sessionStorage.removeItem(`${CACHE_KEY}:${locationKey}`);
    }
  } catch {}
}

/**
 * Resolve user location with priority: profile > GPS > IP
 */
async function resolveLocation(
  profileLocation: { state?: string; city?: string; neighbourhood?: string } | null
): Promise<PromoLocation> {
  const base: PromoLocation = { country: 'India', state: null, district: null, city: null };

  if (profileLocation) {
    base.state = profileLocation.state || null;
    base.city = profileLocation.city || null;
    base.district = profileLocation.neighbourhood || null;
    if (base.state || base.city || base.district) return base;
  }

  if (typeof window !== 'undefined' && 'geolocation' in navigator) {
    try {
      const { latitude, longitude } = await getCurrentPosition();
      const res = await api.post('/geocoding/detect-location', { latitude, longitude });
      const det = res.data?.detectedLocation;
      if (det) {
        base.state = det.state || null;
        base.city = det.city || null;
        base.district = det.neighbourhood || null;
        return base;
      }
    } catch {
      // fall through to IP
    }
  }

  try {
    const res = await api.get('/geocoding/ip-location');
    const loc = res.data?.location;
    if (loc) {
      base.country = loc.country || base.country;
      base.state = loc.state || base.state;
      base.district = loc.district || base.district;
      base.city = loc.city || base.city;
    }
  } catch {}

  return base;
}

function locationKey(loc: PromoLocation): string {
  return [loc.country, loc.state, loc.district, loc.city].filter(Boolean).join('|') || 'unknown';
}

/**
 * Ad location fallback - use when user location is unknown
 */
export interface AdLocationFallback {
  state?: string | null;
  city?: string | null;
  neighbourhood?: string | null;
}

/**
 * Hook to fetch and resolve the Free Posting Promo card for ad detail page.
 * Uses location: profile > GPS > IP > ad's location (fallback).
 * Caches API response. Re-evaluates when location changes.
 */
export function useAdDetailPromoCard(adLocation?: AdLocationFallback | null) {
  const { location: profileLocation } = useLocationPersistence();
  const [resolvedLocation, setResolvedLocation] = useState<PromoLocation | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveLocation(profileLocation || null).then((loc) => {
      if (!cancelled) setResolvedLocation(loc);
    });
    return () => { cancelled = true; };
  }, [profileLocation?.state, profileLocation?.city, profileLocation?.neighbourhood]);

  const fallbackFromAd: PromoLocation = {
    country: 'India',
    state: adLocation?.state || null,
    city: adLocation?.city || null,
    district: adLocation?.neighbourhood || null,
  };
  const hasUserLoc = resolvedLocation && (resolvedLocation.state || resolvedLocation.city || resolvedLocation.district);
  const hasAdLoc = adLocation?.state || adLocation?.city || adLocation?.neighbourhood;
  // Prefer USER location (profile/GPS/IP) so promo updates when user changes location in navbar
  const loc = hasUserLoc ? resolvedLocation! : (hasAdLoc ? fallbackFromAd : (resolvedLocation ?? fallbackFromAd));
  const locKey = locationKey(loc);
  const queryParams = new URLSearchParams({
    ...(loc.country && { country: loc.country }),
    ...(loc.state && { state: loc.state }),
    ...(loc.district && { district: loc.district }),
    ...(loc.city && { city: loc.city }),
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ['free-posting-promos', locKey],
    queryFn: async () => {
      const cached = getCachedCard(locKey);
      if (cached) return cached.card;
      const res = await api.get(`/free-posting-promos?${queryParams || 'country=India'}`);
      const card = res.data?.card ?? null;
      setCachedCard(locKey, card);
      return card;
    },
    enabled: true,
    staleTime: CACHE_TTL_MS,
  });

  const invalidate = useCallback(() => {
    if (locKey) setCachedCard(locKey, null as any);
  }, [locKey]);

  return { card: data ?? null, isLoading, location: resolvedLocation };
}
