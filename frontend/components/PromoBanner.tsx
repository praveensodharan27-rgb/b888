'use client';

import Link from 'next/link';

const RED = '#E10600';
const BLACK = '#000000';

function MegaphoneIcon() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Megaphone horn - white */}
      <path
        d="M25 45 L25 75 Q25 85 35 85 L55 85 Q75 85 95 65 L95 55 Q75 75 55 75 L35 75 Q25 75 25 65 Z"
        fill="white"
        opacity={0.95}
      />
      {/* Inner red sphere */}
      <circle cx="35" cy="65" r="12" fill={RED} />
      {/* Handle */}
      <rect x="20" y="70" width="8" height="25" rx="2" fill="#1a1a1a" />
      <rect x="18" y="92" width="12" height="6" rx="2" fill="#1a1a1a" />
      {/* Red accent on barrel */}
      <path d="M45 78 L55 78 L55 82 L45 82 Z" fill={RED} opacity={0.8} />
    </svg>
  );
}

interface PromoBannerProps {
  title?: string;
  discount?: string;
  ctaText?: string;
  ctaHref?: string;
}

export default function PromoBanner({
  title = 'Offer Limited Sale!!',
  discount = '35% OFF',
  ctaText = 'OFFER NOW',
  ctaHref = '/business-package',
}: PromoBannerProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl min-h-[140px] md:min-h-[160px] flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6 px-4 md:px-8 py-6"
      style={{
        background: `linear-gradient(135deg, ${BLACK} 0%, #1a1a1a 50%, ${BLACK} 100%)`,
        boxShadow: '0 0 60px rgba(225, 6, 0, 0.15)',
      }}
    >
      {/* Red accent shapes */}
      <div
        className="absolute top-0 left-0 w-1/2 h-24 -translate-x-8 -translate-y-4 rotate-12 opacity-90"
        style={{ background: RED }}
      />
      <div
        className="absolute bottom-0 right-0 w-32 h-16 translate-x-8 translate-y-4 -rotate-6 opacity-80"
        style={{
          background: RED,
          clipPath: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)',
        }}
      />
      <div className="absolute top-4 right-20 w-2 h-2 border-2 border-white/40 rotate-45" />
      <div className="absolute bottom-8 left-24 w-2 h-2 border-2 border-red-500/60 rotate-45" />

      {/* Left - Megaphone */}
      <div className="relative z-10 w-20 h-20 md:w-28 md:h-28 flex-shrink-0 animate-[slideInLeft_0.6s_ease-out_both]">
        <MegaphoneIcon />
      </div>

      {/* Center - Main text */}
      <div className="relative z-10 flex-1 flex flex-col items-center md:items-start gap-2 animate-[slideInLeft_0.7s_ease-out_0.1s_both]">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-full text-white text-xs font-bold uppercase"
          style={{ background: RED }}
        >
          Offer
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <h2
            className="text-xl md:text-2xl lg:text-3xl font-bold text-white text-center md:text-left"
            style={{ fontFamily: 'var(--font-display), Poppins, Montserrat, Inter, sans-serif' }}
          >
            {title}
          </h2>
          <span className="hidden md:block w-12 h-px bg-white/60 rounded" />
          <span className="hidden md:block w-3 h-3 rounded-full border-2 border-white/60" />
        </div>
      </div>

      {/* Right - Badge + CTA */}
      <div className="relative z-10 flex flex-row sm:flex-col items-center sm:items-end justify-center sm:justify-start gap-3 flex-shrink-0">
        <Link
          href={ctaHref}
          className="animate-[pulse_2s_ease-in-out_infinite] hover:scale-105 transition-transform duration-200 inline-block px-4 py-2 md:px-6 md:py-3 text-white text-xs md:text-sm font-bold uppercase tracking-wider rounded"
          style={{
            background: `linear-gradient(180deg, ${RED} 0%, #b80500 100%)`,
            boxShadow: '0 4px 14px rgba(225, 6, 0, 0.4)',
          }}
        >
          {ctaText}
        </Link>
        <div
          className="animate-[bounce_1.5s_ease-in-out_infinite] flex flex-col items-center py-2 px-3 rounded-lg"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <span
            className="text-2xl md:text-3xl font-bold leading-tight"
            style={{ color: RED }}
          >
            {discount.split(' ')[0]}
          </span>
          <span className="text-white text-xs font-bold uppercase">
            {discount.split(' ').slice(1).join(' ')}
          </span>
        </div>
      </div>

    </div>
  );
}
