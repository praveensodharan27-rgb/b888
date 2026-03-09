'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMapPin, FiHeart } from 'react-icons/fi';
import { useMemo, useCallback, memo, type MouseEvent } from 'react';
import ImageWithFallback from './ImageWithFallback';
import { PLACEHOLDER_IMAGE } from '@/lib/imageConstants';
import PromotionBadge from './PromotionBadge';
import { useIsFavorite, useToggleFavorite } from '@/hooks/useAds';
import { useAuth } from '@/hooks/useAuth';
import { getAdUrl, getFindInPlaceUrl } from '@/lib/adUrl';
import { formatPriceShort } from '@/lib/formatPrice';
import { formatAdTitle } from '@/lib/formatText';
import SpecPills from './SpecPills';

interface AdCardOLXProps {
  ad: {
    id: string;
    title: string;
    price: number;
    images: string[];
    location?: { name?: string; city?: string; state?: string; slug?: string } | null;
    locationSlug?: string | null;
    locationName?: string | null;
    city?: string | null;
    state?: string | null;
    isPremium?: boolean;
    premiumType?: 'TOP' | 'FEATURED' | 'BUMP_UP' | 'RENT' | 'ECO' | null;
    premiumExpiresAt?: string | Date | null;
    isUrgent?: boolean;
    postedAt?: string | Date;
    createdAt?: string | Date;
    slug?: string;
    categorySlug?: string;
    subcategorySlug?: string;
    category?: { slug?: string };
    subcategory?: { slug?: string };
    distance?: number;
    attributes?: Record<string, string | number | null | undefined>;
  };
  priority?: boolean;
}

function AdCardOLX({ ad, priority = false }: AdCardOLXProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: isFavorite } = useIsFavorite(ad.id, true);
  const toggleFavorite = useToggleFavorite();

  const handleWishlist = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { onSuccess: () => toggleFavorite.mutate(ad.id) } }));
      return;
    }

    if (!toggleFavorite.isPending) {
      toggleFavorite.mutate(ad.id);
    }
  }, [isAuthenticated, toggleFavorite, ad.id]);

  const imageUrl = useMemo(() => {
    if (
      ad.images &&
      Array.isArray(ad.images) &&
      ad.images.length > 0 &&
      typeof ad.images[0] === 'string' &&
      ad.images[0].trim() !== ''
    ) {
      return ad.images[0].trim();
    }
    return PLACEHOLDER_IMAGE;
  }, [ad.images]);

  const displayLocation = useMemo(() => {
    // Priority: location.name > city > state
    // Show best available location info
    if (ad.location?.name) {
      // If we have city/state, append them for better context
      const cityState = [
        ad.location.city || ad.city,
        ad.location.state || ad.state
      ].filter(Boolean).join(', ');
      
      return cityState 
        ? `${ad.location.name}${cityState ? `, ${cityState}` : ''}`
        : ad.location.name;
    }
    
    // Fallback to city/state if location name not available
    const cityState = [
      ad.location?.city || ad.city,
      ad.location?.state || ad.state
    ].filter(Boolean);
    
    return cityState.length > 0 
      ? cityState.join(', ')
      : 'Location not specified';
  }, [ad.location, ad.city, ad.state]);

  const timeAgo = useMemo(() => {
    const timestamp = ad.postedAt ?? ad.createdAt;
    if (!timestamp) return 'JUST NOW';
    const posted = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - posted.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'JUST NOW';
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'MIN' : 'MINS'} AGO`;
    const hours = Math.floor(diffInSeconds / 3600);
    if (hours < 24) return `${hours} ${hours === 1 ? 'HOUR' : 'HOURS'} AGO`;
    const days = Math.floor(diffInSeconds / 86400);
    if (days === 0) return 'TODAY';
    if (days === 1) return 'YESTERDAY';
    if (days < 7) return `${days} ${days === 1 ? 'DAY' : 'DAYS'} AGO`;
    const weeks = Math.floor(diffInSeconds / 604800);
    if (weeks < 4) return `${weeks} ${weeks === 1 ? 'WEEK' : 'WEEKS'} AGO`;
    return '1 MONTH AGO';
  }, [ad.postedAt]);

  // Spec pills from attributes
  const attrs = ad.attributes || {};
  const specPills: string[] = [];
  const kmDriven = attrs.km_driven ?? attrs.kms_driven;
  if (kmDriven != null) {
    const km = Number(kmDriven);
    specPills.push(km >= 1000 ? `${Math.round(km).toLocaleString('en-IN')} km` : `${km} km`);
  }
  const fuelType = attrs.fuel_type ?? attrs.fuel;
  if (fuelType) specPills.push(String(fuelType));
  const transmission = attrs.transmission;
  if (transmission) specPills.push(String(transmission));
  const year = attrs.year || attrs.release_year || attrs.year_of_manufacture;
  if (year) specPills.push(String(year));
  const brand = attrs.brand;
  if (brand) specPills.push(String(brand));
  const condition = attrs.condition;
  if (condition) specPills.push(String(condition));

  // SEO path when ad has state/city/category/slug, else /ads/:id
  const adUrl = getAdUrl(ad);

  // Prefetch ad detail on hover for faster navigation
  const handleMouseEnter = useCallback(() => {
    router.prefetch(adUrl);
  }, [router, adUrl]);

  // Use payment/premium data: premiumType from DB (user paid) or isPremium
  const promotionType = ad.premiumType ?? (ad.isPremium ? 'FEATURED' : null);
  const isUrgent = ad.isUrgent;

  // Store current page URL when clicking ad (for back button)
  const handleAdClick = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Store current page URL in sessionStorage for back navigation
      const currentUrl = window.location.href;
      sessionStorage.setItem('listing_page_url', currentUrl);
    }
  }, []);

  const imageCount = ad.images?.length ?? 0;

  return (
    <Link
      href={adUrl}
      className="block group h-full"
      onClick={handleAdClick}
      onMouseEnter={handleMouseEnter}
      prefetch={true}
    >
      <div className="h-full flex flex-col rounded-xl overflow-hidden border border-gray-100/90 bg-white shadow-sm hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 relative">
        {/* Image - fixed 4:3 */}
        <div className="relative w-full aspect-[4/3] flex-shrink-0 overflow-hidden bg-gray-50">
          <ImageWithFallback
            src={imageUrl}
            alt={ad.title}
            fill
            className="object-cover group-hover:scale-[1.04] transition-transform duration-300 ease-out"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {/* Badges - TOP / Featured / Bump + Urgent */}
          {(promotionType || isUrgent) && (
            <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
              {promotionType && (
                <PromotionBadge
                  premiumType={promotionType}
                  expiresAt={ad.premiumExpiresAt}
                  showCountdown={false}
                />
              )}
              {isUrgent && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide bg-rose-500 text-white shadow-sm">
                  Urgent
                </span>
              )}
            </div>
          )}

          {/* Image count badge */}
          {imageCount > 1 && (
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 text-white text-[11px] font-medium">
              <span>{imageCount} photos</span>
            </div>
          )}

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className="absolute top-2 right-2 z-10 p-2 bg-white/95 hover:bg-white rounded-full shadow-sm ring-1 ring-black/5 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Add to favorites"
          >
            <FiHeart
              className={`w-4 h-4 transition-colors ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-gray-500 hover:text-rose-500'}`}
            />
          </button>

          {/* Watermark: Sell Box logo */}
          <div className="absolute z-[5] flex items-center justify-center pointer-events-none" style={{ right: 8, bottom: 8, width: 40, opacity: 0.7 }} aria-hidden>
            <img src="/logo.png?v=7" alt="Sell Box" width={40} height={40} className="object-contain" style={{ width: 40, height: 40 }} />
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col min-h-0">
          <h3 className="text-base md:text-lg font-bold text-gray-900 leading-snug line-clamp-2 min-h-[2.75rem] group-hover:text-blue-600 transition-colors mb-2">
            {formatAdTitle(ad.title)}
          </h3>
          <div className="min-h-[2rem] mb-2">
            <SpecPills items={specPills} max={4} />
          </div>
          <div className="min-h-[1.25rem] flex items-center justify-between gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <FiMapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
              <span className="text-[11px] md:text-xs text-gray-600 truncate uppercase tracking-wide">
                {displayLocation}
              </span>
              {ad.distance !== null && ad.distance !== undefined && (
                <span className="text-blue-500 text-[10px] font-medium flex-shrink-0">
                  • {ad.distance < 1 ? `${Math.round(ad.distance * 1000)}m` : `${ad.distance.toFixed(1)}km`}
                </span>
              )}
            </div>
            <span className="text-[10px] md:text-[11px] text-gray-500 flex-shrink-0 uppercase tracking-wide">
              {timeAgo}
            </span>
          </div>
          {(ad.locationSlug ?? ad.location?.slug) && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(getFindInPlaceUrl(ad.locationSlug ?? ad.location?.slug ?? null, ad.categorySlug ?? ad.category?.slug));
              }}
              className="text-[10px] md:text-[11px] text-blue-600 hover:text-blue-700 font-medium truncate text-left cursor-pointer mt-0.5"
            >
              Find more in {ad.locationName ?? ad.location?.name ?? (ad.locationSlug ?? ad.location?.slug)}
            </button>
          )}
          <div className="mt-auto pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
                {formatPriceShort(ad.price)}
              </span>
              <span className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm group-hover:bg-blue-700 transition-colors whitespace-nowrap">
                View Details
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default memo(AdCardOLX);
