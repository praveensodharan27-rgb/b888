'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import ImageWithFallback from '@/components/ImageWithFallback';
import { useLocationPersistence } from '@/hooks/useLocationPersistence';

/**
 * Sponsored Ads - inject ONLY when ALL conditions match:
 * 1. UI has white space (measured free space >= MIN_RENDER)
 * 2. Ad size matches the space (backend returns size-appropriate ad)
 * 3. Sponsored ad matches user location + category
 * If any condition fails → don't show (return null)
 *
 * White space: width-based measurement, ad-native aspect ratio.
 * Visual hierarchy: matches FilterSection (rounded-xl, border, shadow).
 */

const MIN_RENDER = 80;
const BOTTOM_PADDING = 80;
/** Proportional bounds - preserve visual hierarchy, no tower ads */
const MIN_HEIGHT = 180;
const MAX_HEIGHT = 400;
/** Card chrome: label + padding (used to reserve space) */
const CARD_CHROME = 48;

/** Backend ad sizes: small 1:1, medium/large 16:9, auto 3:2 */
function getAspectRatio(adSize?: string | null): number {
  const s = (adSize || 'auto').toLowerCase();
  if (s === 'small') return 1;      // 1:1
  if (s === 'medium' || s === 'large') return 16 / 9;  // 16:9
  return 3 / 2;  // auto: 3:2
}

/** Slot dimensions: width, height (proportional to container) */
type SlotDimensions = { width: number; height: number } | null;

interface SponsoredAdData {
  id: string;
  title: string;
  bannerImage?: string | null;
  bannerVideo?: string | null;
  description?: string | null;
  ctaType?: string;
  ctaLabel?: string | null;
  redirectUrl?: string | null;
  adSize?: string;
  width?: number;
  height?: number;
}

interface InjectedAdSlotProps {
  descriptionContainerRef?: React.RefObject<HTMLDivElement | null>;
  /** Location slug (Filter > Profile > GPS) */
  locationSlug?: string | null;
  /** Ad's city/state (when viewing ad from Mumbai, use for sponsored ad matching) */
  locationCity?: string | null;
  locationState?: string | null;
  /** District (when available from location picker - State→District→City) */
  locationDistrict?: string | null;
  /** Category slug for context (optional) */
  categorySlug?: string | null;
  /** Subcategory slug - more specific, preferred for matching (e.g. cars under vehicles) */
  subcategorySlug?: string | null;
  className?: string;
}

const API_BASE = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000') : '';

function getAdUrl(ad: SponsoredAdData | null): string {
  if (!ad?.redirectUrl) return '/business-package';
  if (ad.ctaType === 'whatsapp' && ad.redirectUrl) {
    const num = ad.redirectUrl.replace(/\D/g, '');
    return `https://wa.me/${num}`;
  }
  if (ad.ctaType === 'call' && ad.redirectUrl) {
    return `tel:${ad.redirectUrl}`;
  }
  return ad.redirectUrl;
}

function AdWrapper({ ad, children, onTrackClick }: { ad: SponsoredAdData | null; children: React.ReactNode; onTrackClick?: () => void }) {
  const href = getAdUrl(ad);
  const isExternal = href.startsWith('http') || href.startsWith('tel') || href.startsWith('https://wa.me');
  const handleClick = () => onTrackClick?.();
  const wrapperClass = 'block w-full h-full';
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={wrapperClass} onClick={handleClick}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} onClick={handleClick} className={wrapperClass}>
      {children}
    </Link>
  );
}

/** Fixed-dimension ad: backend-controlled width/height, fills available space */
const DEFAULT_AD_HEIGHT = 300;
const DEFAULT_AD_WIDTH = 320;

function FlexibleAd({ ad, width, height, onTrackClick }: { ad: SponsoredAdData | null; width?: number; height?: number; onTrackClick?: () => void }) {
  // Build full image URL: relative paths need API base
  const rawBanner = ad?.bannerImage;
  const imgUrl = rawBanner
    ? rawBanner.startsWith('http')
      ? rawBanner
      : `${API_BASE}${rawBanner.startsWith('/') ? '' : '/'}${rawBanner}`
    : null;
  const w = width ?? ad?.width ?? DEFAULT_AD_WIDTH;
  const h = height ?? ad?.height ?? DEFAULT_AD_HEIGHT;
  const isCompact = h < 200;
  const isMedium = h >= 200 && h < 320;
  return (
    <AdWrapper ad={ad} onTrackClick={onTrackClick}>
      <div
        className="block rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 w-full h-full relative"
        style={{ width: '100%', height: '100%' }}
      >
        {imgUrl ? (
          <>
            {/* Full-bleed image - ImageWithFallback handles load errors */}
            <div className="absolute inset-0 z-0">
              <ImageWithFallback
                src={imgUrl}
                alt={ad?.title || 'Ad'}
                fill
                className="object-cover"
              />
            </div>
            {/* Gradient overlay for text readability - stronger at bottom so title/description always visible */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
            {/* Text and CTA overlay - explicit z-index ensures visibility */}
            <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 sm:p-5">
              <h3
                className={`text-white font-bold ${isCompact ? 'text-sm' : isMedium ? 'text-base' : 'text-xl'}`}
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 2px 6px rgba(0,0,0,0.6)' }}
              >
                {((ad?.title?.trim()?.length ?? 0) >= 2 ? ad?.title?.trim() : null) ?? 'Sponsored'}
              </h3>
              {!isCompact && (ad?.description?.trim()?.length ?? 0) >= 2 && (
                <p
                  className="text-white/95 text-sm mt-1 max-w-full overflow-hidden"
                  style={{
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {ad?.description?.trim() ?? ''}
                </p>
              )}
              <span
                className={`inline-block self-start rounded-lg font-semibold mt-2 ${
                  isCompact ? 'px-3 py-1 text-xs' : isMedium ? 'px-4 py-2 text-sm' : 'px-6 py-2.5 text-sm'
                } bg-yellow-400 text-blue-900 hover:bg-yellow-300 transition-colors`}
              >
                {ad?.ctaLabel || 'Learn More'}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-6 bg-gradient-to-br from-blue-900 to-blue-800">
            <span className="text-yellow-400 font-bold text-xs">Sponsored</span>
            <h3 className={`text-white font-bold leading-tight ${isCompact ? 'text-sm' : isMedium ? 'text-base' : 'text-xl'}`}>
              {(ad?.title?.trim()?.length ?? 0) >= 2 ? (ad?.title?.trim() ?? '') : 'Grand Opening Promo!'}
            </h3>
            {!isCompact && (
              <p className="text-white/90 text-sm mt-2 max-w-xs">
                {(ad?.description?.trim()?.length ?? 0) >= 2 ? (ad?.description?.trim() ?? '') : 'Discover unique gifts!'}
              </p>
            )}
            <span className="inline-block mt-2 px-4 py-2 bg-yellow-400 text-blue-900 font-semibold text-sm rounded-lg">
              {ad?.ctaLabel || 'Purchase Now!'}
            </span>
          </div>
        )}
      </div>
    </AdWrapper>
  );
}

/** Normalize city/state to slug for API matching - matches backend normalizeLocationSlug (e.g. "New Delhi" -> "new-delhi") */
function toLocationSlug(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return String(name).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function InjectedAdSlot({ descriptionContainerRef, locationSlug, locationCity, locationState, locationDistrict, categorySlug, subcategorySlug, className = '' }: InjectedAdSlotProps) {
  const [slotDims, setSlotDims] = useState<SlotDimensions>(null);
  const [apiAds, setApiAds] = useState<SponsoredAdData[]>([]);
  const slotRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { location: persistedLocation } = useLocationPersistence();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Resolve location: Navbar (State→District→City) / persisted only - NO Google Maps on user side
  const [resolvedLocation, setResolvedLocation] = useState<{ slug?: string; city?: string; state?: string; district?: string } | null>(null);
  useEffect(() => {
    // Priority 1: Persisted location (navbar filter - OSM/static list)
    if (persistedLocation) {
      const slug = persistedLocation.slug?.trim()?.toLowerCase();
      if (slug === 'india' || slug === 'all-india') {
        setResolvedLocation(null);
        return;
      }
      const citySlug = persistedLocation.city ? toLocationSlug(persistedLocation.city) : '';
      const stateSlug = persistedLocation.state ? toLocationSlug(persistedLocation.state) : '';
      const districtSlug = (persistedLocation as { district?: string })?.district ? toLocationSlug((persistedLocation as { district?: string }).district!) : undefined;
      const locSlug = citySlug || stateSlug || slug || undefined;
      setResolvedLocation({
        slug: locSlug,
        city: persistedLocation.city || undefined,
        state: persistedLocation.state || undefined,
        district: districtSlug || undefined,
      });
      return;
    }
    // Fallback: localStorage selected_location
    try {
      const stored = localStorage.getItem('selected_location');
      if (stored) {
        const parsed = JSON.parse(stored);
        const slug = parsed?.slug?.trim()?.toLowerCase();
        if (slug === 'india' || slug === 'all-india') {
          setResolvedLocation(null);
          return;
        }
        const citySlug = parsed?.city ? toLocationSlug(parsed.city) : '';
        const stateSlug = parsed?.state ? toLocationSlug(parsed.state) : '';
        const districtSlug = parsed?.district ? toLocationSlug(parsed.district) : undefined;
        const locSlug = citySlug || stateSlug || slug || undefined;
        if (locSlug) {
          setResolvedLocation({
            slug: locSlug,
            city: parsed?.city || undefined,
            state: parsed?.state || undefined,
            district: districtSlug || undefined,
          });
          return;
        }
      }
    } catch {}
    // Priority 2: Ad's location (viewing Mumbai ad → show Mumbai sponsored ads)
    if (locationSlug || locationCity || locationState || locationDistrict) {
      const citySlug = locationCity ? toLocationSlug(locationCity) : '';
      const stateSlug = locationState ? toLocationSlug(locationState) : '';
      const districtSlug = locationDistrict ? toLocationSlug(locationDistrict) : undefined;
      const slug = citySlug || stateSlug || (locationSlug || '');
      setResolvedLocation({
        slug: slug || undefined,
        city: locationCity || undefined,
        state: locationState || undefined,
        district: districtSlug || undefined,
      });
      return;
    }
    setResolvedLocation(null);
  }, [locationSlug, locationCity, locationState, locationDistrict, persistedLocation]);

  // Fetch sponsored ads - location + category (subcategory preferred for more specific matching)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    params.set('size', 'auto');
    const locSlug = resolvedLocation?.slug?.trim();
    const cityNorm = resolvedLocation?.city ? toLocationSlug(resolvedLocation.city) : '';
    const stateNorm = resolvedLocation?.state ? toLocationSlug(resolvedLocation.state) : '';
    const districtNorm = resolvedLocation?.district ? toLocationSlug(resolvedLocation.district) : '';
    const catNorm = (subcategorySlug || categorySlug)
      ? String(subcategorySlug || categorySlug).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : '';
    if (locSlug) params.set('location', locSlug);
    if (cityNorm) params.set('city', cityNorm);
    if (stateNorm) params.set('state', stateNorm);
    if (districtNorm) params.set('district', districtNorm);
    if (catNorm) params.set('category', catNorm);
    const url = `/sponsored-ads?${params.toString()}`;
    api.get(url)
      .then((res) => {
        const ads = Array.isArray(res.data?.ads) ? res.data.ads : (res.data?.ad ? [res.data.ad] : []);
        setApiAds(ads);
      })
      .catch(() => setApiAds([]));
  }, [resolvedLocation, categorySlug, subcategorySlug]);

  // Track impression for each ad when displayed
  const impressionTrackedIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    apiAds.forEach((ad) => {
      if (ad?.id && !impressionTrackedIds.current.has(ad.id)) {
        impressionTrackedIds.current.add(ad.id);
        api.post(`/sponsored-ads/${ad.id}/impression`).catch(() => {});
      }
    });
  }, [apiAds]);

  const handleAdClick = (adId: string) => {
    if (adId) api.post(`/sponsored-ads/${adId}/click`).catch(() => {});
  };

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const el = slotRef.current;
    const descEl = descriptionContainerRef?.current;
    const firstAd = apiAds[0];
    const aspectRatio = getAspectRatio(firstAd?.adSize);

    const measureSlot = (): SlotDimensions | null => {
      if (!el) return null;
      const slotRect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const parentWidth = el.parentElement?.getBoundingClientRect().width ?? 0;
      const width = Math.max(slotRect.width || parentWidth, 260);
      let freeVertical = viewportHeight - slotRect.top - BOTTOM_PADDING;
      if (descEl) {
        const descRect = descEl.getBoundingClientRect();
        const descBased = descRect.bottom - slotRect.top - 24;
        freeVertical = Math.max(freeVertical, descBased);
      }
      freeVertical = Math.max(0, freeVertical);
      const proportionalHeight = width / aspectRatio;
      const availableForAd = Math.max(0, freeVertical - CARD_CHROME);
      const height = Math.min(
        Math.max(MIN_HEIGHT, Math.min(availableForAd, proportionalHeight)),
        MAX_HEIGHT
      );
      if (height < MIN_RENDER) return null;
      return { width, height };
    };

    const updateDims = () => {
      const dims = measureSlot();
      setSlotDims(dims);
    };

    const runUpdate = () => requestAnimationFrame(updateDims);
    updateDims();
    const observer = new ResizeObserver(runUpdate);
    if (el) observer.observe(el);
    if (descEl) observer.observe(descEl);

    window.addEventListener('resize', runUpdate);
    const t1 = setTimeout(updateDims, 150);
    const t2 = setTimeout(updateDims, 500);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', runUpdate);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mounted, descriptionContainerRef, apiAds]);

  const hasWhiteSpace = slotDims && slotDims.height >= MIN_RENDER;
  const hasMatchingSponsoredAd = apiAds.length > 0;
  const hasDefaultSpace = !slotDims && apiAds.length > 0;
  const shouldShow = (hasWhiteSpace && hasMatchingSponsoredAd) || hasDefaultSpace;

  const displayAd = shouldShow ? apiAds[0] : null;
  const slotHeight = Math.max(slotDims?.height ?? 280, MIN_HEIGHT);

  return (
    <div
      ref={slotRef}
      className={`${className} transition-all duration-300 ease-out ${!shouldShow ? 'h-0 min-h-0 overflow-hidden' : ''}`}
      style={shouldShow ? { minHeight: slotHeight + CARD_CHROME } : undefined}
    >
      {shouldShow && displayAd ? (
        <div className="filter-card-content bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Sponsored</div>
          <div
            className="overflow-hidden w-full rounded-lg relative"
            style={{
              height: slotHeight,
              minHeight: MIN_HEIGHT,
              maxHeight: MAX_HEIGHT,
            }}
          >
            <FlexibleAd
              ad={displayAd}
              width={slotDims?.width}
              height={slotHeight}
              onTrackClick={() => handleAdClick(displayAd.id)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
