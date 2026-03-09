'use client';

import Link from 'next/link';
import { FiMessageCircle, FiPhone } from 'react-icons/fi';

interface StickyMobileCTAProps {
  adId: string;
  userId?: string | null;
  price?: number | null;
  isOwner?: boolean;
  showPhone: boolean;
  phone?: string | null;
  onRevealPhone?: () => void;
  isAuthenticated?: boolean;
}

export function StickyMobileCTA({
  adId,
  userId,
  price,
  isOwner,
  showPhone,
  phone,
  onRevealPhone,
  isAuthenticated,
}: StickyMobileCTAProps) {
  if (isOwner) return null;

  const priceDisplay =
    price != null ? `₹${Number(price).toLocaleString('en-IN')}` : null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        {priceDisplay && (
          <span className="text-lg font-bold text-gray-900 shrink-0 min-w-[80px]">
            {priceDisplay}
          </span>
        )}
        <Link
          href={`/chat?adId=${adId}&userId=${userId}`}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 h-12 bg-primary-600 text-white rounded-[14px] font-semibold"
          onClick={(e) => {
            if (!isAuthenticated) {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('openLoginModal', {
                detail: { onSuccess: () => window.location.href = `/chat?adId=${adId}&userId=${userId}` },
              }));
            }
          }}
        >
          <FiMessageCircle className="w-5 h-5" />
          Chat
        </Link>
        {phone ? (
          showPhone ? (
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 h-12 border-2 border-primary-600 text-primary-600 rounded-[14px] font-semibold"
            >
              <FiPhone className="w-5 h-5" />
              Call
            </a>
          ) : (
            <button
              type="button"
              onClick={onRevealPhone}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 h-12 border-2 border-primary-600 text-primary-600 rounded-[14px] font-semibold"
            >
              <FiPhone className="w-5 h-5" />
              Call
            </button>
          )
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
