'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiMessageCircle, FiPhone } from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { CONTENT_CONTAINER_CLASS } from '@/lib/layoutConstants';

type Props = {
  adId: string;
  userId?: string | null;
  price?: number | null;
  phone?: string | null;
};

export default function AdDetailStickyMobileClient({
  adId,
  userId,
  price,
  phone,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { openLoginModal } = useAuthModal();
  const isOwner = user?.id === userId;
  if (isOwner) return null;

  const priceDisplay = price != null ? `₹${Number(price).toLocaleString('en-IN')}` : null;
  const showPhone = revealed || (phone && isAuthenticated);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-6 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] lg:hidden">
      <div className={`${CONTENT_CONTAINER_CLASS} flex items-center gap-3`}>
        {priceDisplay && (
          <span className="text-xl font-bold text-gray-900 shrink-0 min-w-[90px]">{priceDisplay}</span>
        )}
        {phone ? (
          showPhone ? (
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 h-12 bg-[#2563eb] text-white rounded-xl font-semibold hover:bg-[#1d4ed8] active:scale-[0.98] transition-all"
            >
              <FiPhone className="w-5 h-5" />
              Call
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  openLoginModal(() => setRevealed(true));
                  return;
                }
                setRevealed(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 h-12 bg-[#2563eb] text-white rounded-xl font-semibold hover:bg-[#1d4ed8] active:scale-[0.98] transition-all"
            >
              <FiPhone className="w-5 h-5" />
              Show Phone
            </button>
          )
        ) : (
          <div className="flex-1" />
        )}
        <Link
          href={`/chat?adId=${adId}&userId=${userId}`}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 h-12 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold bg-white hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          <FiMessageCircle className="w-5 h-5" />
          Chat
        </Link>
      </div>
    </div>
  );
}
