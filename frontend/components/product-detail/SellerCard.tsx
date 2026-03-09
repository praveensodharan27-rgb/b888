'use client';

import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';
import { FiChevronRight, FiUser } from 'react-icons/fi';

interface SellerCardProps {
  userId?: string | null;
  name?: string | null;
  avatar?: string | null;
  memberSince?: string | null;
  totalAdsCount?: number | null;
  isVerified?: boolean;
}

export function SellerCard({
  userId,
  name,
  avatar,
  memberSince,
  totalAdsCount,
  isVerified,
}: SellerCardProps) {
  const displayName = name || 'Seller';

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Seller Information
      </h2>
      {userId ? (
        <div>
          <Link
            href={`/user/${userId}`}
            className="flex items-center gap-4 group mb-4"
          >
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-gray-100">
            {avatar ? (
              <ImageWithFallback
                src={avatar}
                alt={displayName}
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FiUser className="w-7 h-7 text-gray-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 truncate">
                {displayName}
              </span>
              {isVerified && (
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-primary-600"
                  title="Verified"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </div>
            {memberSince && (
              <p className="text-sm text-gray-500 mt-0.5">{memberSince}</p>
            )}
            {typeof totalAdsCount === 'number' && totalAdsCount >= 0 && (
              <p className="text-sm text-gray-500 mt-0.5">
                {totalAdsCount} {totalAdsCount === 1 ? 'ad' : 'ads'}
              </p>
            )}
          </div>
          <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 shrink-0" />
          </Link>
          <Link
            href={`/user/${userId}`}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 h-12 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            View profile
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <FiUser className="w-7 h-7 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900">Seller info unavailable</p>
        </div>
      )}
    </section>
  );
}
