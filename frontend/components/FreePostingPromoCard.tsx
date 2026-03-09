'use client';

import { useState } from 'react';

export interface FreePostingPromoCardProps {
  id: string;
  image: string | null;
  title?: string | null;
  description?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
}

/**
 * Image-only banner. w-full inside navbar container, image w-full h-auto block.
 * No text, title, description, or CTA.
 */
export default function FreePostingPromoCard({
  image,
  title = '',
}: FreePostingPromoCardProps) {
  const [hasError, setHasError] = useState(false);

  if (!image || hasError) return null;

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)] transition-shadow duration-300">
      <img
        src={image}
        alt={title || 'Promo'}
        className="w-full h-auto block max-h-[200px] object-contain"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
