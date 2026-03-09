'use client';

import Link from 'next/link';
import { FiMessageCircle, FiPhone, FiShare2, FiHeart } from 'react-icons/fi';

interface TrustBadge {
  label: string;
  icon?: 'verified' | 'fast' | 'member';
}

interface PriceActionCardProps {
  price: number | null;
  title: string;
  /** SEO H1: {Product Name} for Sale in {City} */
  seoH1?: string | null;
  location: string;
  postedTime: string;
  adId: string;
  userId?: string | null;
  isOwner?: boolean;
  showPhone: boolean;
  phone?: string | null;
  onRevealPhone?: () => void;
  onWishlist?: () => void;
  isFavorite?: boolean;
  onShare?: () => void;
  trustBadges?: TrustBadge[];
  isAuthenticated?: boolean;
}

export function PriceActionCard({
  price,
  title,
  seoH1,
  location,
  postedTime,
  adId,
  userId,
  isOwner,
  showPhone,
  phone,
  onRevealPhone,
  onWishlist,
  isFavorite = false,
  onShare,
  trustBadges = [],
  isAuthenticated,
}: PriceActionCardProps) {
  return (
    <aside className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:sticky lg:top-20">
      {/* Price - very large & bold */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-[32px] sm:text-4xl font-bold text-gray-900 tracking-tight">
          {price != null
            ? `₹${Number(price).toLocaleString('en-IN')}`
            : '—'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onShare}
            className="p-2.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Share"
          >
            <FiShare2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onWishlist}
            className="p-2.5 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <FiHeart
              className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Product title - single H1 for SEO: {Product Name} for Sale in {City} */}
      <h1 className="text-lg font-semibold text-gray-900 leading-snug mb-3">
        {seoH1 || title}
      </h1>

      {/* Location + posted time */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-5">
        <span>{location || '—'}</span>
        <span>{postedTime || '—'}</span>
      </div>

      {/* Trust badges */}
      {trustBadges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {trustBadges.map((b, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              {b.label}
            </span>
          ))}
        </div>
      )}

      {/* Primary CTA: Chat with seller */}
      {!isOwner && userId && (
        <Link
          href={`/chat?adId=${adId}&userId=${userId}`}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 h-14 bg-primary-600 text-white rounded-[14px] font-semibold text-base hover:bg-primary-700 transition-colors shadow-sm"
          onClick={(e) => {
            if (!isAuthenticated) {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('openLoginModal', {
                detail: { onSuccess: () => window.location.href = `/chat?adId=${adId}&userId=${userId}` },
              }));
            }
          }}
        >
          <FiMessageCircle className="w-5 h-5 shrink-0" />
          Chat with Seller
        </Link>
      )}

      {/* Secondary: Reveal phone */}
      {!isOwner && (
        <div className="mt-3">
          {phone ? (
            showPhone ? (
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="w-full inline-flex items-center justify-center gap-2 px-5 h-14 border-2 border-primary-600 text-primary-600 rounded-[14px] font-semibold hover:bg-primary-50 transition-colors"
              >
                <FiPhone className="w-5 h-5 shrink-0" />
                {String(phone)}
              </a>
            ) : (
              <button
                type="button"
                onClick={onRevealPhone}
                className="w-full inline-flex items-center justify-center gap-2 px-5 h-14 border-2 border-primary-600 text-primary-600 rounded-[14px] font-semibold hover:bg-primary-50 transition-colors"
              >
                <FiPhone className="w-5 h-5 shrink-0" />
                Reveal Phone Number
              </button>
            )
          ) : (
            <p className="text-sm text-gray-500 text-center py-2">
              Phone not available
            </p>
          )}
        </div>
      )}

      {isOwner && (
        <Link
          href={`/edit-ad/${adId}`}
          className="w-full inline-flex items-center justify-center gap-2 px-5 h-14 bg-primary-600 text-white rounded-[14px] font-semibold hover:bg-primary-700 transition-colors"
        >
          Edit Your Ad
        </Link>
      )}
    </aside>
  );
}
