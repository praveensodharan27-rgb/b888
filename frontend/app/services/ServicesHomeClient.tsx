'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiCheck, FiStar, FiMapPin, FiSearch, FiUser } from 'react-icons/fi';
import api from '@/lib/api';
import { SERVICE_CATEGORIES } from '@/lib/serviceCategories';
import { getAdUrl } from '@/lib/adUrl';
import ImageWithFallback from '@/components/ImageWithFallback';
import { CONTENT_CONTAINER_CLASS } from '@/lib/layoutConstants';

const SERVICE_ICONS: Record<string, string> = {
  all: 'build_circle',
  plumbers: 'plumbing',
  electricians: 'electrical_services',
  cleaning: 'cleaning_services',
  'pest-control': 'bug_report',
  painters: 'format_paint',
  'ac-repair': 'ac_unit',
  carpenters: 'carpenter',
  'appliance-repair': 'build',
  salon: 'spa',
  photography: 'photo_camera',
};

const POPULAR_SEARCHES = [
  'Plumber near me',
  'AC repair',
  'Electrician',
  'Cleaning service',
  'Pest control',
  'Painter',
  'Carpenter',
  'Salon & beauty',
  'Appliance repair',
  'Photography',
];

// Extra featured cards for Spa and Car service (href built with location in component)
const FEATURED_STATIC_CARDS = [
  {
    id: 'spa',
    title: 'Spa & wellness',
    categoryTag: 'SALON & BEAUTY',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=240&fit=crop',
    categorySlug: 'salon-beauty',
  },
  {
    id: 'car-service',
    title: 'Car service & repair',
    categoryTag: 'AUTO',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=240&fit=crop',
    categorySlug: 'all',
  },
];

// Fallback stock images (Unsplash) for horizontal scroll cards when ad has no image
const SCROLL_CARD_IMAGES = [
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=560&h=400&fit=crop',
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=560&h=400&fit=crop',
  'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=560&h=400&fit=crop',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=560&h=400&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=560&h=400&fit=crop',
  'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=560&h=400&fit=crop',
  'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=560&h=400&fit=crop',
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=560&h=400&fit=crop',
];

function getCategoryIcon(id: string): string {
  return SERVICE_ICONS[id] || 'handyman';
}

/** Location-based services URL: when locationSlug is set, use /:location/services or /:location/services/:category */
function getServicesCategoryHref(locationSlug: string | null, categorySlug: string): string {
  if (locationSlug?.trim()) {
    const base = `/${locationSlug.trim()}/services`;
    return categorySlug === 'all' ? base : `${base}/${categorySlug}`;
  }
  return categorySlug === 'all' ? '/services/all' : `/services/${categorySlug}`;
}

export type ServicesHomeClientProps = {
  /** When services page is opened via /:locationSlug/services (SEO-friendly URL), pass location from URL */
  locationSlugFromUrl?: string | null;
  locationNameFromUrl?: string;
};

export default function ServicesHomeClient({ locationSlugFromUrl, locationNameFromUrl }: ServicesHomeClientProps = {}) {
  const router = useRouter();
  const [locationLabel, setLocationLabel] = useState(locationNameFromUrl ?? 'All India');
  const [locationSlug, setLocationSlug] = useState<string | null>(locationSlugFromUrl ?? null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (locationSlugFromUrl && locationNameFromUrl) {
      setLocationSlug(locationSlugFromUrl);
      setLocationLabel(locationNameFromUrl);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('selected_location', JSON.stringify({ slug: locationSlugFromUrl, name: locationNameFromUrl }));
        }
      } catch {
        // ignore
      }
      return;
    }
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('selected_location') : null;
      if (raw) {
        const loc = JSON.parse(raw);
        if (loc?.name) setLocationLabel(loc.name);
        if (loc?.slug) setLocationSlug(loc.slug);
      }
    } catch {
      // ignore
    }
  }, [locationSlugFromUrl, locationNameFromUrl]);

  const handleSearch = (q: string) => {
    const params = new URLSearchParams({ category: 'services', search: q });
    if (locationSlug) params.set('location', locationSlug);
    router.push(`/ads?${params.toString()}`);
  };

  const { data: adsData } = useQuery({
    queryKey: ['ads', 'services', 'featured', locationSlug],
    queryFn: async () => {
      const params = new URLSearchParams({ category: 'services', limit: '12', sort: 'featured' });
      if (locationSlug) params.set('location', locationSlug);
      const res = await api.get(`/ads?${params.toString()}`);
      return res.data;
    },
    staleTime: 60 * 1000,
  });
  const { data: recentData } = useQuery({
    queryKey: ['ads', 'services', 'recent', locationSlug],
    queryFn: async () => {
      const params = new URLSearchParams({ category: 'services', limit: '7', sort: 'newest' });
      if (locationSlug) params.set('location', locationSlug);
      const res = await api.get(`/ads?${params.toString()}`);
      return res.data;
    },
    staleTime: 60 * 1000,
  });
  const featuredAds = adsData?.ads ?? [];
  const recentAds = recentData?.ads ?? [];
  const featuredIds = new Set(featuredAds.map((a: any) => a.id));
  const recentOnly = recentAds.filter((a: any) => !featuredIds.has(a.id)).slice(0, 5);
  const exploreScrollAds = [...featuredAds, ...recentOnly].slice(0, 5);
  const scrollCardsRef = useRef<HTMLDivElement>(null);
  const recentScrollRef = useRef<HTMLDivElement>(null);
  const scrollCards = (dir: 'left' | 'right') => {
    const el = scrollCardsRef.current;
    if (el) el.scrollBy({ left: dir === 'right' ? 300 : -300, behavior: 'smooth' });
  };
  const scrollRecent = (dir: 'left' | 'right') => {
    const el = recentScrollRef.current;
    if (el) el.scrollBy({ left: dir === 'right' ? 340 : -340, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero - Modern gradient with animated elements */}
      <header className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-300 rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        {/* Decorative grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" aria-hidden />
        
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative py-8 sm:py-10 lg:py-12">
          <div className="max-w-4xl mx-auto text-center">
            {/* Trust badge with animation */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-4 sm:mb-5 animate-fade-in-scale">
              <div className="w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0">
                <FiCheck className="w-2.5 h-2.5 text-white" aria-hidden />
              </div>
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide">100% VERIFIED PROFESSIONALS</span>
            </div>
            
            {/* Main headline with gradient text - Reduced size */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight mb-3 sm:mb-4 leading-tight">
              Expert Services
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-purple-300 bg-clip-text text-transparent">
                at Your Doorstep
              </span>
            </h1>
            
            <p className="text-blue-100 text-sm sm:text-base lg:text-lg mb-6 sm:mb-7 max-w-2xl mx-auto leading-relaxed">
              Book verified professionals for cleaning, repairs, and maintenance in minutes. 
              <span className="font-semibold text-white"> Transparent pricing, guaranteed quality.</span>
            </p>
            
            {/* Category pills - More compact */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {SERVICE_CATEGORIES.map((c) => {
                const categorySlug = c.id === 'all' || !c.slug ? 'all' : c.slug!;
                const href = getServicesCategoryHref(locationSlug, categorySlug);
                const label = c.id === 'all' ? 'All Services' : c.label;
                const icon = getCategoryIcon(c.id);
                return (
                  <Link
                    key={c.id}
                    href={href}
                    className="group inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white/95 backdrop-blur-sm border border-white/20 text-gray-900 font-semibold text-[11px] sm:text-xs hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <span className="material-symbols-outlined text-sm sm:text-base text-blue-600 group-hover:scale-110 transition-transform" style={{ fontSize: 16 }} aria-hidden>
                      {icon}
                    </span>
                    <span className="whitespace-nowrap">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="w-full h-8 sm:h-12 text-gray-50" preserveAspectRatio="none" viewBox="0 0 1440 54" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 22L60 16.7C120 11 240 1 360 0.700012C480 1 600 11 720 16.7C840 22 960 22 1080 20.3C1200 19 1320 16 1380 14.7L1440 13V54H1380C1320 54 1200 54 1080 54C960 54 840 54 720 54C600 54 480 54 360 54C240 54 120 54 60 54H0V22Z" fill="currentColor"/>
          </svg>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Featured service listings - 4 per line grid */}
        <section className="mb-12 sm:mb-16">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Featured Services</h2>
            <p className="text-gray-600 text-sm sm:text-base">Handpicked professionals with verified reviews</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {featuredAds.slice(0, 8).map((ad: any, idx: number) => {
              const imageUrl = ad.images?.[0]?.trim() || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop';
              const categoryTag = (ad.subcategory?.name || ad.category?.name || 'SERVICES').toUpperCase();
              const adUrl = getAdUrl(ad);
              const offerText = ad.description?.slice(0, 80) || (ad.price != null ? `Starting from ₹${Number(ad.price).toLocaleString()}` : 'Professional service');
              const rating = ad.rating ?? 4.5;
              return (
                <Link
                  key={ad.id}
                  href={adUrl}
                  className="group flex flex-col rounded-2xl bg-white shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-300 hover:-translate-y-1 overflow-hidden"
                >
                  <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    <ImageWithFallback
                      src={imageUrl}
                      alt={ad.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-sm text-xs font-bold text-blue-700 shadow-md">
                        {categoryTag}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-sm shadow-md">
                        <FiStar className="w-3.5 h-3.5 text-amber-500 fill-amber-500" aria-hidden />
                        <span className="text-xs font-bold text-amber-700">{Number(rating).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 p-4">
                    <h3 className="text-base font-bold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
                      {ad.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">
                      {offerText}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                      <span className="text-xs font-medium text-gray-500 truncate">
                        {ad.location?.name || locationLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold group-hover:bg-blue-700 transition-colors whitespace-nowrap">
                        View
                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
            {FEATURED_STATIC_CARDS.map((card) => (
              <Link
                key={card.id}
                href={getServicesCategoryHref(locationSlug, card.categorySlug)}
                className="group flex flex-col rounded-2xl bg-white shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-purple-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden">
                  <ImageWithFallback
                    src={card.image}
                    alt={card.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-sm text-xs font-bold text-purple-700 shadow-md">
                      {card.categoryTag}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-sm text-emerald-700 text-xs font-bold shadow-md">
                      <FiCheck className="w-3 h-3" />
                      Popular
                    </span>
                  </div>
                </div>
                <div className="flex flex-col flex-1 p-4">
                  <h3 className="text-base font-bold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-purple-700 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">
                    Explore top-rated {card.title.toLowerCase()} in your area
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-500">
                      {locationLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold group-hover:bg-purple-700 transition-colors whitespace-nowrap">
                      Browse
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular Services - 4 Category Cards */}
        <section className="mb-12 sm:mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Popular Services</h2>
            <Link 
              href={getServicesCategoryHref(locationSlug, 'all')}
              className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              View All Services
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {/* House Cleaning */}
            <Link
              href={getServicesCategoryHref(locationSlug, 'cleaning')}
              className="group p-6 rounded-2xl bg-white border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                <span className="material-symbols-outlined text-2xl text-orange-600">cleaning_services</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">House Cleaning</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Professional deep cleaning for every corner of your home.</p>
            </Link>

            {/* AC Repair */}
            <Link
              href={getServicesCategoryHref(locationSlug, 'ac-repair')}
              className="group p-6 rounded-2xl bg-white border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                <span className="material-symbols-outlined text-2xl text-orange-600">ac_unit</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">AC Repair</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Expert cooling solutions and preventative maintenance.</p>
            </Link>

            {/* Electrical */}
            <Link
              href={getServicesCategoryHref(locationSlug, 'electrical')}
              className="group p-6 rounded-2xl bg-white border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                <span className="material-symbols-outlined text-2xl text-orange-600">electrical_services</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">Electrical</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Certified electrical work for repairs and installations.</p>
            </Link>

            {/* Pest Control */}
            <Link
              href={getServicesCategoryHref(locationSlug, 'pest-control')}
              className="group p-6 rounded-2xl bg-white border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                <span className="material-symbols-outlined text-2xl text-orange-600">bug_report</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">Pest Control</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Safe and effective treatments to keep your home pest-free.</p>
            </Link>
          </div>
        </section>

        {/* Experience Hassle-Free Home Maintenance */}
        <section className="mb-12 sm:mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 mb-4 leading-tight">
                Experience Hassle-Free Home Maintenance
              </h2>
              <p className="text-gray-600 text-base sm:text-lg mb-6 leading-relaxed">
                We've built the most reliable platform for your home. From emergency repairs to routine cleaning, we connect you with background-checked professionals you can trust.
              </p>
              
              {/* Benefits List */}
              <div className="space-y-4">
                {/* Trusted Professionals */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <FiCheck className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Trusted Professionals</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Every service provider undergoes rigorous background checks and quality ratings.</p>
                  </div>
                </div>

                {/* Expert Staff */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <FiUser className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Expert Staff</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Our team consists of certified experts with years of hands-on experience.</p>
                  </div>
                </div>

                {/* Transparent Pricing */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">💰</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Transparent Pricing</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Clear, upfront pricing with no hidden fees or surprise charges.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-square">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=600&fit=crop"
                  alt="Happy customer and professional handshake"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                {/* Happy Customers Badge */}
                <div className="absolute bottom-6 left-6 bg-white rounded-xl shadow-lg p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <FiCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900">10k+</div>
                    <div className="text-xs font-medium text-gray-600">Happy Customers</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Explore featured – Enhanced horizontal cards */}
        {exploreScrollAds.length > 0 && (
          <section className="mb-12 sm:mb-16">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Explore More Services</h2>
                <p className="text-gray-600 text-sm sm:text-base">Discover trending services in your area</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => scrollCards('left')}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white flex items-center justify-center transition-all shadow-md hover:shadow-lg"
                  aria-label="Scroll left"
                >
                  <span className="text-xl font-bold">&larr;</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollCards('right')}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white flex items-center justify-center transition-all shadow-md hover:shadow-lg"
                  aria-label="Scroll right"
                >
                  <span className="text-xl font-bold">&rarr;</span>
                </button>
              </div>
            </div>
            <div
              ref={scrollCardsRef}
              className="flex gap-4 sm:gap-5 overflow-x-auto overflow-y-hidden pb-4 scroll-smooth scrollbar-hide"
            >
              {exploreScrollAds.map((ad: any, i: number) => {
                const img = ad.images?.[0]?.trim();
                const imageUrl = img || SCROLL_CARD_IMAGES[i % SCROLL_CARD_IMAGES.length];
                const adUrl = getAdUrl(ad);
                const title = ad.title || 'Service listing';
                const categoryName = (ad.subcategory?.name || ad.category?.name || '').toUpperCase();
                return (
                  <Link
                    key={`scroll-${ad.id}`}
                    href={adUrl}
                    className="group flex-shrink-0 w-[300px] sm:w-[320px] h-[240px] sm:h-[260px] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 relative block transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                  >
                    <div className="absolute inset-0">
                      <ImageWithFallback
                        src={imageUrl}
                        alt={ad.title || 'Service listing'}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="320px"
                      />
                    </div>
                    <div
                      className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-black/30 to-transparent"
                    />
                    <div className="absolute inset-0 p-5 flex flex-col justify-between">
                      {categoryName && (
                        <span className="self-start px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/30">
                          {categoryName}
                        </span>
                      )}
                      <div>
                        <h3 className="text-white font-bold text-lg leading-snug line-clamp-2 drop-shadow-lg mb-2">
                          {title}
                        </h3>
                        <span className="inline-flex items-center gap-1.5 text-white text-sm font-semibold group-hover:gap-2.5 transition-all">
                          View Service
                          <span className="text-lg">→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
