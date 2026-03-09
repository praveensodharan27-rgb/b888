'use client';

import Link from 'next/link';
import ImageWithFallback from './ImageWithFallback';
import { PLACEHOLDER_IMAGE } from '@/lib/imageConstants';
import { getAdUrl } from '@/lib/adUrl';
import { FiEdit, FiStar, FiCheck, FiTrash2, FiMoreVertical, FiEye, FiHeart, FiMessageCircle } from 'react-icons/fi';
import PremiumFeatureButton from './PremiumFeatureButton';
import { formatAdTitle } from '@/lib/formatText';
import { useState } from 'react';

interface MyAdsAdCardProps {
  ad: {
    id: string;
    title: string;
    price: number;
    images: string[];
    status: string;
    views?: number;
    _count?: { favorites?: number };
    category?: { name?: string; slug?: string } | null;
    subcategory?: { name?: string; slug?: string } | null;
    premiumType?: string | null;
  };
  premiumPrices?: any;
  onDelete?: (ad: any) => void;
  onMarkSold?: (ad: any) => void;
}

export default function MyAdsAdCard({ ad, premiumPrices, onDelete, onMarkSold }: MyAdsAdCardProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const imageUrl = ad.images?.[0] || PLACEHOLDER_IMAGE;
  const categoryPath = [ad.category?.name, ad.subcategory?.name].filter(Boolean).join(' > ') || 'Uncategorized';
  const views = ad.views ?? 0;
  const likes = ad._count?.favorites ?? 0;
  const chats = 0; // Placeholder - add when chat count API available

  const formatViews = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  const statusStyles: Record<string, string> = {
    APPROVED: 'bg-green-100 text-green-800',
    ACTIVE: 'bg-green-100 text-green-800',
    PENDING: 'bg-amber-100 text-amber-800',
    SOLD: 'bg-blue-100 text-blue-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
    REJECTED: 'bg-red-100 text-red-800',
  };
  const statusLabel: Record<string, string> = {
    APPROVED: 'ACTIVE',
    ACTIVE: 'ACTIVE',
    PENDING: 'PENDING REVIEW',
    SOLD: 'SOLD',
    EXPIRED: 'EXPIRED',
    REJECTED: 'REJECTED',
  };
  const statusClass = statusStyles[ad.status] || 'bg-gray-100 text-gray-800';
  const statusText = statusLabel[ad.status] || ad.status;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <Link href={getAdUrl(ad)} className="block sm:w-48 flex-shrink-0">
          <div className="relative w-full sm:w-48 aspect-square sm:aspect-auto sm:h-48 bg-gray-100">
            <ImageWithFallback
              src={imageUrl}
              alt={formatAdTitle(ad.title)}
              fill
              className="object-cover"
              sizes="192px"
            />
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${statusClass}`}>
                {statusText}
              </span>
              <p className="text-sm text-gray-500 mb-1">{categoryPath}</p>
              <Link href={getAdUrl(ad)} className="block">
                <h3 className="text-lg font-semibold text-gray-900 hover:text-green-600 transition-colors line-clamp-2">
                  {formatAdTitle(ad.title)}
                </h3>
              </Link>
              <p className="text-xl font-bold text-gray-900 mt-1">
                ₹{ad.price.toLocaleString('en-IN')}
              </p>
              {ad.status === 'PENDING' && (
                <p className="text-sm text-gray-500 mt-2">
                  Our team is reviewing your ad. Usually live within 3 minutes.
                </p>
              )}
            </div>
            {/* More options */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                aria-label="More options"
              >
                <FiMoreVertical className="w-5 h-5" />
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 py-1 bg-white rounded-lg shadow-lg border border-gray-200 z-20 min-w-[140px]">
                    <Link
                      href={getAdUrl(ad)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowMoreMenu(false)}
                    >
                      View Ad
                    </Link>
                    {onDelete && (
                      <button
                        onClick={() => { onDelete(ad); setShowMoreMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete Ad
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <FiEye className="w-4 h-4" />
              {formatViews(views)} Views
            </span>
            <span className="flex items-center gap-1">
              <FiHeart className="w-4 h-4" />
              {likes} Likes
            </span>
            <span className="flex items-center gap-1">
              <FiMessageCircle className="w-4 h-4" />
              {chats} Chats
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <Link
              href={`/edit-ad/${ad.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              <FiEdit className="w-4 h-4" />
              Edit
            </Link>
            {ad.status === 'APPROVED' && (
              <>
                <div className="[&>div]:!mt-0">
                  <PremiumFeatureButton
                    adId={ad.id}
                    adStatus={ad.status}
                    currentPremiumType={ad.premiumType}
                    premiumPrices={premiumPrices?.prices}
                  />
                </div>
                {onMarkSold && (
                  <button
                    onClick={() => onMarkSold(ad)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-sm font-medium"
                  >
                    <FiCheck className="w-4 h-4" />
                    Mark as Sold
                  </button>
                )}
              </>
            )}
            {ad.status === 'PENDING' && onDelete && (
              <button
                onClick={() => onDelete(ad)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium"
              >
                <FiTrash2 className="w-4 h-4" />
                Cancel Ad
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
