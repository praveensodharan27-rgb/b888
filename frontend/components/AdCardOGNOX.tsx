'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMapPin, FiHeart, FiCheckCircle, FiCamera } from 'react-icons/fi';
import { useMemo, useCallback, memo, type MouseEvent } from 'react';
import AdImage from './AdImage';
import { PLACEHOLDER_IMAGE } from '@/lib/imageConstants';
import PromotionBadge from './PromotionBadge';
import { useIsFavorite, useToggleFavorite } from '@/hooks/useAds';
import { useAuth } from '@/hooks/useAuth';
import { getAdUrl, getFindInPlaceUrl } from '@/lib/adUrl';
import { formatPriceFull } from '@/lib/formatPrice';
import { formatAdTitle } from '@/lib/formatText';
import AdSpecs from '@/components/AdSpecs';

interface AdCardOGNOXProps {
  ad: {
    id: string;
    title: string;
    description?: string | null;
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
    distance?: number | null;
    attributes?: Record<string, string | number | null | undefined>;
    specifications?: Record<string, string | number | null | undefined>;
  };
  priority?: boolean;
}

/** Condition badge: Like New / Excellent (green), Good (orange), Used (red) */
function getConditionStyle(condition: string): { bg: string; text: string; icon: string } {
  const c = condition.toLowerCase().replace(/[_\s]+/g, ' ').trim();
  if (c === 'like new' || c === 'likenew' || c === 'excellent') return { bg: '#E8FFF1', text: '#1BA672', icon: '#1BA672' };
  if (c === 'good') return { bg: '#FFF4E5', text: '#F59E0B', icon: '#F59E0B' };
  return { bg: '#FFECEC', text: '#EF4444', icon: '#EF4444' };
}

function AdCardOGNOX({ ad, priority = false }: AdCardOGNOXProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: isFavorite } = useIsFavorite(ad.id, true);
  const toggleFavorite = useToggleFavorite();

  const handleWishlist = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { onSuccess: () => { if (!toggleFavorite.isPending) toggleFavorite.mutate(ad.id); } } }));
      return;
    }
    if (!toggleFavorite.isPending) toggleFavorite.mutate(ad.id);
  }, [isAuthenticated, toggleFavorite, ad.id]);

  const imageUrl = useMemo(() => {
    if (ad.images?.length && typeof ad.images[0] === 'string' && ad.images[0].trim() !== '') {
      return ad.images[0].trim();
    }
    return PLACEHOLDER_IMAGE;
  }, [ad.images]);

  const displayLocation = useMemo(() => {
    if (ad.location?.name) {
      const cityState = [ad.location.city || ad.city, ad.location.state || ad.state].filter(Boolean).join(', ');
      return cityState ? `${ad.location.name}, ${cityState}` : ad.location.name;
    }
    const cityState = [ad.location?.city || ad.city, ad.location?.state || ad.state].filter(Boolean);
    return cityState.length > 0 ? cityState.join(', ') : 'Location not specified';
  }, [ad.location, ad.city, ad.state]);

  const timeAgo = useMemo(() => {
    const timestamp = ad.postedAt ?? ad.createdAt;
    if (!timestamp) return '';
    const posted = new Date(timestamp);
    const diffInSeconds = Math.floor((new Date().getTime() - posted.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(diffInSeconds / 3600);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(diffInSeconds / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return '1w ago';
  }, [ad.postedAt]);

  const adUrl = getAdUrl(ad);
  const promotionType = ad.premiumType ?? (ad.isPremium ? 'FEATURED' : null);
  const isUrgent = ad.isUrgent;

  const handleAdClick = useCallback(() => {
    if (typeof window !== 'undefined') sessionStorage.setItem('listing_page_url', window.location.href);
  }, []);

  const handleMouseEnter = useCallback(() => router.prefetch(adUrl), [router, adUrl]);

  const findInPlaceUrl = (ad.locationSlug ?? ad.location?.slug)
    ? getFindInPlaceUrl(ad.locationSlug ?? ad.location?.slug ?? null, ad.categorySlug ?? ad.category?.slug)
    : null;

  const priceDisplay = formatPriceFull(ad.price);
  const imageCount = ad.images?.length ?? 0;

  const toTitleCase = (v: string) => v.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
  const attrs = ad.attributes ?? ad.specifications ?? undefined;
  const conditionRaw = attrs?.condition;
  const conditionLabel = conditionRaw ? toTitleCase(String(conditionRaw)) : null;
  const conditionStyle = conditionLabel ? getConditionStyle(String(conditionRaw)) : null;

  const categorySlug = ad.categorySlug ?? ad.category?.slug ?? null;
  const subcategorySlug = ad.subcategorySlug ?? ad.subcategory?.slug ?? null;

  return (
    <article className="h-full min-h-[300px] flex flex-col rounded-xl overflow-hidden bg-white shadow-md hover:shadow-[0_12px_25px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out relative border border-gray-100 hover:border-gray-200 hover:-translate-y-1">
      <Link
        href={adUrl}
        className="block group flex-1 flex flex-col min-h-0"
        onClick={handleAdClick}
        onMouseEnter={handleMouseEnter}
        prefetch={true}
      >
        {/* Image: fixed height 200px, object-cover */}
        <div className="relative w-full h-[200px] min-h-[200px] flex-shrink-0 overflow-hidden rounded-t-xl bg-gray-100">
          <AdImage
            src={imageUrl}
            alt={formatAdTitle(ad.title)}
            className="absolute inset-0 w-full h-full"
            imageClassName="object-cover w-full h-full group-hover:scale-[1.03] transition-transform duration-300 ease-out"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

          {/* Badges: top-left — Featured / Urgent / Condition (prominent) */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5">
            {(promotionType || isUrgent) && (
              <div className="flex flex-wrap gap-1.5">
                {promotionType && (
                  <PromotionBadge premiumType={promotionType} expiresAt={ad.premiumExpiresAt ?? undefined} showCountdown={false} />
                )}
                {isUrgent && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide bg-rose-500 text-white shadow-md">
                    Urgent
                  </span>
                )}
              </div>
            )}
            {conditionLabel && conditionStyle && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold shadow-md"
                style={{ backgroundColor: conditionStyle.bg, color: conditionStyle.text }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: conditionStyle.icon }} aria-hidden />
                {conditionLabel}
              </span>
            )}
          </div>

          {/* Wishlist: top-right, semi-transparent white */}
          <button
            type="button"
            onClick={handleWishlist}
            className="absolute top-2 right-2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <FiHeart
              className="w-5 h-5 transition-colors duration-200"
              style={isFavorite ? { color: '#EF4444', fill: '#EF4444' } : { color: '#6B7280' }}
            />
          </button>

          {/* Photo count badge: bottom-right */}
          {imageCount > 1 && (
            <div className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 text-white text-xs font-semibold shadow-md">
              <FiCamera className="w-3.5 h-3.5 opacity-95" aria-hidden />
              <span>{imageCount}</span>
            </div>
          )}

          {/* Watermark: subtle */}
          <div className="absolute z-[5] flex items-center justify-center pointer-events-none" style={{ right: 6, bottom: 6, width: 28, opacity: 0.45 }} aria-hidden>
            <img src="/logo.png?v=7" alt="" width={28} height={28} className="object-contain" />
          </div>
        </div>

        {/* Content: padding 12px */}
        <div className="p-3 flex-1 flex flex-col min-h-0">
          <div className="mb-1">
            <span className="text-xl font-bold tracking-tight truncate block" style={{ color: '#111827', fontSize: '20px' }}>
              {priceDisplay}
            </span>
          </div>
          <h3 className="text-sm font-semibold truncate group-hover:text-primary-600 transition-colors mb-1 min-w-0" style={{ color: '#111827' }}>
            {formatAdTitle(ad.title)}
          </h3>
          <AdSpecs
            category={categorySlug ?? undefined}
            subcategory={subcategorySlug ?? undefined}
            specs={attrs}
            maxCount={3}
            variant="bullet"
            className="mb-2 min-h-[1.25rem]"
          />
          {/* Location left, posting time right — 12px, #6B7280 */}
          <div className="flex items-center justify-between gap-2 mt-auto min-w-0" style={{ fontSize: 12, color: '#6B7280' }}>
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <FiMapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-80" aria-hidden style={{ color: '#6B7280' }} />
              <span className="truncate">{displayLocation}</span>
            </div>
            {timeAgo && <span className="flex-shrink-0 text-right">{timeAgo}</span>}
          </div>
        </div>
      </Link>

      {findInPlaceUrl && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100">
          <Link
            href={findInPlaceUrl}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors py-0"
          >
            <FiMapPin className="w-4 h-4 flex-shrink-0 text-primary-500" aria-hidden />
            Find in {ad.locationName ?? ad.location?.name ?? (ad.locationSlug ?? ad.location?.slug)}
          </Link>
        </div>
      )}
    </article>
  );
}

export default memo(AdCardOGNOX);
