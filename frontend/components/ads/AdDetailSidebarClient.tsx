'use client';

import { useState } from 'react';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';
import ReportAdModal from '@/components/ReportAdModal';
import { FiHeart, FiShare2, FiMessageCircle, FiPhone, FiShield, FiCheck, FiChevronRight, FiMapPin, FiStar, FiEye, FiAlertTriangle } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useToggleFavorite, useIsFavorite } from '@/hooks/useAds';
import toast from '@/lib/toast';
import { formatAdTitle } from '@/lib/formatText';

type Props = {
  ad: {
    id: string;
    title?: string | null;
    price?: number | null;
    negotiable?: boolean | null;
    location?: { name?: string; latitude?: number; longitude?: number } | null;
    user?: {
      id?: string;
      name?: string | null;
      avatar?: string | null;
      phone?: string | null;
      showPhone?: boolean;
      createdAt?: string | null;
      updatedAt?: string | null;
      isVerified?: boolean;
      rating?: number | null;
      ratingCount?: number | null;
      lastActiveAt?: string | null;
      adsCount?: number | null;
    } | null;
    createdAt?: string | null;
  };
  locationDisplay: string;
  postedAgo: string | null;
  postedAgoUpper?: string | null;
  views?: number | null;
  /** e.g. "2023 • Diesel • 58,555 km • Automatic" under title */
  specHighlight?: string | null;
};


export default function AdDetailSidebarClient({
  ad,
  locationDisplay,
  postedAgo,
  postedAgoUpper = null,
  views,
  specHighlight = null,
}: Props) {
  void postedAgoUpper;
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { openLoginModal } = useAuthModal();
  const { data: isFavorite } = useIsFavorite(ad.id, isAuthenticated);
  const toggleFavorite = useToggleFavorite();
  const isOwner = user?.id === ad.user?.id;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = ad.title ?? 'Check out this listing';
  const shareText = `${shareTitle}${ad.price != null ? ` - ₹${Number(ad.price).toLocaleString('en-IN')}` : ''}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const shareWhatsApp = () => {
    const u = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    window.open(u, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp');
  };

  const shareFacebook = () => {
    const u = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(u, '_blank', 'noopener,noreferrer');
    toast.success('Opening Facebook');
  };

  const isNegotiable = ad.negotiable !== false && ad.price != null && Number(ad.price) > 0;
  const viewCount = views != null && Number(views) >= 0 ? Number(views) : null;
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
    <div className="space-y-5">
      {/* Card 1: Product Info & CTA – sticky so contact stays visible on scroll */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-20 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[24px] sm:text-[28px] font-bold text-gray-900 tracking-tight" style={{ fontWeight: 700 }}>
              ₹{ad.price != null ? Number(ad.price).toLocaleString('en-IN') : '—'}
            </span>
            {ad.price != null && Number(ad.price) > 0 && (
              <p className="text-sm text-gray-600 mt-1 font-medium">
                {isNegotiable ? 'Negotiable' : 'Fixed Price'}
              </p>
            )}
            {viewCount !== null && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                <FiEye className="w-4 h-4 shrink-0" aria-hidden />
                <span>{viewCount.toLocaleString('en-IN')} views</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && navigator?.share) {
                  navigator.share({ title: shareTitle, text: shareText, url: shareUrl }).then(() => toast.success('Shared!')).catch(() => copyLink());
                } else {
                  copyLink();
                }
              }}
              className="p-2.5 rounded-full text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
              aria-label="Share"
            >
              <FiShare2 className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                if (isAuthenticated) toggleFavorite.mutate(ad.id);
                else openLoginModal(() => toggleFavorite.mutate(ad.id));
              }}
              disabled={toggleFavorite.isPending}
              className="p-2.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
              aria-label={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <FiHeart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Share: WhatsApp, Facebook, Copy link */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            type="button"
            onClick={shareWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <span aria-hidden>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={shareFacebook}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <span aria-hidden>Facebook</span>
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Copy link
          </button>
        </div>

        <h1 className="text-base font-medium text-gray-900 leading-snug mt-4 line-clamp-3">{formatAdTitle(ad.title)}</h1>
        {specHighlight && (
          <p className="text-sm text-gray-600 font-medium mt-1.5" style={{ fontSize: '13px' }}>
            {specHighlight}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 text-sm text-gray-500 mt-3">
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <FiMapPin className="w-4 h-4 shrink-0 text-gray-400" />
            <span className="truncate" title={locationDisplay || undefined}>{locationDisplay || '—'}</span>
          </span>
          <span className="shrink-0 text-gray-400">{postedAgo ? `Posted ${postedAgo}` : '—'}</span>
        </div>

        {/* Contact: Show Phone (primary), Chat (secondary), full width with icons */}
        {ad.user && !isOwner && (
          <div className="mt-5 space-y-3 flex flex-col">
            {ad.user.phone && ad.user.showPhone !== false ? (
              phoneRevealed ? (
                <a
                  href={`tel:${String(ad.user.phone).replace(/\s/g, '')}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-[#2563eb] text-white rounded-xl font-semibold hover:bg-[#1d4ed8] active:scale-[0.98] transition-all"
                >
                  <FiPhone className="w-5 h-5 shrink-0" aria-hidden />
                  <span className="text-base font-semibold">{String(ad.user.phone)}</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      openLoginModal(() => setPhoneRevealed(true));
                      return;
                    }
                    setPhoneRevealed(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-[#2563eb] text-white rounded-xl font-semibold hover:bg-[#1d4ed8] active:scale-[0.98] transition-all"
                >
                  <FiPhone className="w-5 h-5 shrink-0" aria-hidden />
                  <span className="text-base font-semibold">Show Phone Number</span>
                </button>
              )
            ) : ad.user.showPhone === false ? (
              <p className="text-sm text-gray-500 py-2">Phone hidden by seller</p>
            ) : (
              <p className="text-sm text-gray-500 py-2">Phone not available</p>
            )}
            <Link
              href={`/chat?adId=${ad.id}&userId=${ad.user.id}`}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98] transition-all"
            >
              <FiMessageCircle className="w-5 h-5 shrink-0" aria-hidden />
              Chat with Seller
            </Link>
          </div>
        )}

        {isOwner && (
        <Link
          href={`/edit-ad/${ad.id}`}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#2563eb] text-white rounded-xl font-semibold hover:bg-[#1d4ed8] mt-5"
        >
          Edit Your Ad
        </Link>
        )}
      </div>

      {/* Card 2: Seller Information – profile photo, name, member since, total ads, rating */}
      {ad.user ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <h3 className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-4">
            SELLER INFORMATION
          </h3>
          <Link
            href={`/user/${ad.user.id}`}
            className="flex items-center gap-4 hover:opacity-90 transition-opacity group"
          >
            <div className="relative shrink-0">
              {ad.user.avatar ? (
                <ImageWithFallback
                  src={ad.user.avatar}
                  alt={ad.user.name || 'Seller'}
                  width={56}
                  height={56}
                  className="rounded-full ring-2 ring-primary-200 object-cover"
                />
              ) : (
                <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center shrink-0 ring-2 ring-primary-200">
                  <span className="text-lg font-semibold text-primary-700">
                    {(ad.user.name || 'S')[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-row items-center gap-2">
                <span className="font-bold text-gray-900">{ad.user.name || 'Unknown Seller'}</span>
                {ad.user.isVerified && (
                  <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 shadow-sm" title="Verified">
                    <FiCheck className="w-3 h-3 text-white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-gray-600">
                {ad.user.rating != null && ad.user.rating > 0 && (
                  <span className="flex items-center gap-1">
                    <FiStar className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" aria-hidden />
                    <span className="font-medium">{Number(ad.user.rating).toFixed(1)} rating</span>
                    {ad.user.ratingCount != null && ad.user.ratingCount > 0 && (
                      <span className="text-gray-500">({ad.user.ratingCount})</span>
                    )}
                  </span>
                )}
                {ad.user.adsCount != null && ad.user.adsCount >= 0 && (
                  <span>{ad.user.adsCount} ads posted</span>
                )}
                {ad.user.createdAt && (
                  <span>Member since {new Date(ad.user.createdAt).getFullYear()}</span>
                )}
              </div>
            </div>
            <FiChevronRight className="w-5 h-5 text-gray-400 shrink-0 group-hover:text-primary-600 transition-colors" />
          </Link>
          <Link
            href={`/user/${ad.user.id}`}
            className="mt-4 w-full inline-flex items-center justify-center py-2.5 px-4 border border-gray-200 rounded-xl font-medium text-gray-900 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm"
          >
            View Profile
          </Link>
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Report this ad"
          >
            <FiAlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
            Report this ad
          </button>
          {showReportModal && (
            <ReportAdModal adId={ad.id} onClose={() => setShowReportModal(false)} />
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shrink-0">?</div>
          <div>
            <p className="font-semibold text-gray-900">Seller info unavailable</p>
            <p className="text-xs text-gray-500">Seller</p>
          </div>
        </div>
      )}

      {/* Card 3: Item Location */}
      {locationDisplay && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            ITEM LOCATION
          </h3>
          {ad.location?.latitude != null && ad.location?.longitude != null ? (
            <>
              <a
                href={`https://www.google.com/maps?q=${ad.location.latitude},${ad.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-gray-200 aspect-video w-full bg-gray-50 mb-3 hover:border-primary-200 transition-colors"
              >
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <span className="flex flex-col items-center gap-2">
                    <FiMapPin className="w-10 h-10 text-primary-600" />
                    <span className="text-sm font-medium text-primary-600">View on Map</span>
                  </span>
                </div>
              </a>
              <p className="text-gray-700 text-sm mb-2">{locationDisplay}</p>
              <a
                href={`https://www.google.com/maps?q=${ad.location.latitude},${ad.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline"
              >
                View on full map
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </>
          ) : (
            <p className="text-gray-700 text-sm">{locationDisplay}</p>
          )}
        </div>
      )}

      {/* Card 4: Stay Safe */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100/80 rounded-xl shadow-sm border border-primary-100 p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
          <span className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
            <FiShield className="w-4 h-4 text-primary-600 shrink-0" />
          </span>
          Stay Safe
        </h3>
        <ul className="space-y-2.5 text-sm text-primary-800 leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
            <span>Meet in a safe public place</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
            <span>Check the item before paying</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
            <span>Avoid sharing financial info</span>
          </li>
        </ul>
      </div>
    </div>
    </>
  );
}
