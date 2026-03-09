'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMapPin, FiHeart, FiPhone, FiMessageCircle } from 'react-icons/fi';
import { useMemo, useCallback, memo, type MouseEvent } from 'react';
import ImageWithFallback from './ImageWithFallback';
import { useIsFavorite, useToggleFavorite } from '@/hooks/useAds';
import { useAuth } from '@/hooks/useAuth';
import { getAdUrl } from '@/lib/adUrl';

interface ServiceCardProps {
  ad: {
    id: string;
    title: string;
    price: number;
    images: string[];
    location?: { name?: string; city?: string; state?: string; slug?: string; pincode?: string } | null;
    locationSlug?: string | null;
    locationName?: string | null;
    city?: string | null;
    state?: string | null;
    user?: { id?: string; name?: string; isVerified?: boolean } | null;
    slug?: string;
    categorySlug?: string;
    subcategorySlug?: string;
    category?: { slug?: string };
    subcategory?: { slug?: string };
    rating?: number;
    ratingCount?: number;
  };
  priority?: boolean;
}

function ServiceCard({ ad, priority = false }: ServiceCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: isFavorite } = useIsFavorite(ad.id, true);
  const toggleFavorite = useToggleFavorite();

  const handleWishlist = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!toggleFavorite.isPending) {
      toggleFavorite.mutate(ad.id);
    }
  }, [isAuthenticated, router, toggleFavorite, ad.id]);

  const imageUrl = useMemo(() => {
    if (ad.images?.length && typeof ad.images[0] === 'string' && ad.images[0].trim()) {
      return ad.images[0].trim();
    }
    return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop';
  }, [ad.images]);

  const displayLocation = useMemo(() => {
    const parts: string[] = [];
    if (ad.location?.name) parts.push(ad.location.name);
    const cityState = [ad.location?.city || ad.city, ad.location?.state || ad.state].filter(Boolean).join(', ');
    if (cityState) parts.push(cityState);
    if (ad.location?.pincode) parts.push(`- ${ad.location.pincode}`);
    return parts.length > 0 ? parts.join(', ') : 'Location not specified';
  }, [ad.location, ad.city, ad.state]);

  const adUrl = getAdUrl(ad);
  const chatUrl = ad.user?.id ? `/chat?adId=${ad.id}&userId=${ad.user.id}` : adUrl;
  const rating = ad.rating ?? 4.5;
  const ratingCount = ad.ratingCount ?? 0;
  const isVerified = ad.user?.isVerified ?? false;

  const handleCardClick = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('listing_page_url', window.location.href);
    }
  }, []);

  const iconStyle = { fontVariationSettings: "'FILL' 1" as const };
  const iconStyleOutline = { fontVariationSettings: "'FILL' 0" as const };

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-200 group">
      <div className="flex flex-col sm:flex-row">
        <Link
          href={adUrl}
          onClick={handleCardClick}
          className="relative block w-full sm:w-[40%] aspect-[4/3] sm:min-h-[200px] overflow-hidden bg-gray-100"
        >
          <ImageWithFallback
            src={imageUrl}
            alt={ad.title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, 40vw"
            priority={priority}
          />
        </Link>

        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <Link href={adUrl} onClick={handleCardClick} className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-1">
                  {ad.title}
                </h3>
              </Link>
              <button
                onClick={handleWishlist}
                className="flex-shrink-0 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Add to favorites"
              >
                <FiHeart
                  className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-gray-400 group-hover:text-gray-600'}`}
                />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 text-green-800 text-xs font-semibold">
                <span className="material-symbols-outlined text-sm" style={iconStyle}>star</span>
                {rating.toFixed(1)}
                {ratingCount > 0 && <span className="font-normal text-green-700">{ratingCount} Ratings</span>}
              </span>
              {isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                  <span className="material-symbols-outlined text-sm" style={iconStyle}>verified</span>
                  Verified Professional
                </span>
              )}
            </div>

            <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
              <FiMapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500" />
              <span className="line-clamp-2">{displayLocation}</span>
            </div>

            <div className="flex items-center gap-2 text-sm mb-4">
              <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
                <span className="material-symbols-outlined text-base" style={iconStyle}>schedule</span>
                Open Now
              </span>
              <span className="text-gray-400">•</span>
              <span className="inline-flex items-center gap-1.5 text-gray-700">
                <span className="material-symbols-outlined text-base" style={iconStyleOutline}>sell</span>
                Starts from ₹{ad.price.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="flex gap-3 mt-auto">
            <Link
              href={adUrl}
              onClick={handleCardClick}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <FiPhone className="w-4 h-4" />
              Call Now
            </Link>
            <Link
              href={chatUrl}
              onClick={handleCardClick}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg font-medium text-sm transition-colors"
            >
              <FiMessageCircle className="w-4 h-4" />
              Enquire
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ServiceCard);
