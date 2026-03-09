'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FiBriefcase, FiDollarSign, FiHeadphones } from 'react-icons/fi';

const TRAVEL_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
];

export default function TravelPromoPoster() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-sky-500 to-sky-600 p-4 sm:p-6 md:p-8">
      {/* Decorative dots */}
      <div className="absolute top-4 left-4 grid grid-cols-3 gap-1 opacity-80">
        {[...Array(9)].map((_, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
        ))}
      </div>
      <div className="absolute top-4 right-4 grid grid-cols-3 gap-1 opacity-80">
        {[...Array(9)].map((_, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 text-center mb-4 sm:mb-6">
        <div className="inline-block bg-white/95 rounded-lg px-4 py-2 mb-2">
          <span className="text-black font-bold text-sm sm:text-base">BORCELLE</span>
        </div>
        <p className="text-white text-lg sm:text-xl font-bold tracking-wider">TIME TO</p>
        <p
          className="text-yellow-400 text-3xl sm:text-4xl md:text-5xl font-bold italic"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Adventure
        </p>
      </div>

      {/* Three photos */}
      <div className="relative z-10 flex gap-3 sm:gap-4 justify-center items-center mb-4 sm:mb-6 overflow-x-auto pb-2 sm:overflow-visible sm:pb-0">
        {TRAVEL_IMAGES.map((src, i) => (
          <div
            key={i}
            className="relative flex-shrink-0 w-28 sm:w-1/3 max-w-[180px] sm:max-w-[200px] aspect-[3/4] rounded-lg overflow-hidden border-4 border-white shadow-xl"
            style={{ transform: `rotate(${i === 0 ? -3 : i === 2 ? 3 : 0}deg)` }}
          >
            <Image
              src={src}
              alt={`Travel ${i + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 200px"
            />
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-yellow-400 border-2 border-white" />
          </div>
        ))}
      </div>

      {/* Plane graphic (simple SVG) */}
      <div className="relative z-10 flex justify-center mb-4 -mt-2">
        <svg width="60" height="24" viewBox="0 0 60 24" fill="none" className="opacity-90">
          <path
            d="M2 12 L20 12 L25 8 L35 12 L45 8 L55 12 L58 12"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M25 8 L30 12 L35 8" stroke="white" strokeWidth="1.5" fill="white" opacity="0.8" />
        </svg>
      </div>

      {/* Description */}
      <p className="relative z-10 text-white text-center text-sm sm:text-base mb-4 sm:mb-6 max-w-xl mx-auto">
        Discover your dream destination with us and enjoy a smooth travel experience from start to finish
      </p>

      {/* Features */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <div className="flex flex-col items-center text-center">
          <FiBriefcase className="w-8 h-8 text-white mb-2" />
          <p className="text-white text-xs sm:text-sm font-medium">Personalized travel packages</p>
        </div>
        <div className="flex flex-col items-center text-center border-y sm:border-y-0 sm:border-x border-white/40 py-4 sm:py-0">
          <FiDollarSign className="w-8 h-8 text-white mb-2" />
          <p className="text-white text-xs sm:text-sm font-medium">Affordable and transparent pricing</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <FiHeadphones className="w-8 h-8 text-white mb-2" />
          <p className="text-white text-xs sm:text-sm font-medium">Expert travel planning assistance</p>
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
        <Link
          href="/business-package"
          className="inline-block px-6 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/20 transition-colors text-sm sm:text-base"
        >
          BOOK NOW!
        </Link>
        <a
          href="https://www.reallygreatsite.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 bg-transparent border-2 border-white text-white font-medium rounded-lg hover:bg-white/20 transition-colors text-sm"
        >
          www.reallygreatsite.com
        </a>
      </div>
    </div>
  );
}
