'use client';

import { useState } from 'react';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';
import { FiArrowLeft, FiHeart, FiShare2, FiPhone, FiMessageCircle, FiMapPin } from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { useToggleFavorite, useIsFavorite } from '@/hooks/useAds';
import toast from '@/lib/toast';
import { dirPath, getFindInPlaceUrl } from '@/lib/directory';
import { PLACEHOLDER_IMAGE } from '@/lib/imageConstants';
import { formatAdTitle } from '@/lib/formatText';

const API_ORIGIN = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
  ? String(process.env.NEXT_PUBLIC_API_URL).replace(/\/api\/?$/, '')
  : 'http://localhost:5000';

type Ad = {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  condition?: string | null;
  images: string[];
  state?: string | null;
  city?: string | null;
  location?: { name?: string; slug?: string } | null;
  category?: { id: string; name: string; slug: string };
  subcategory?: { id: string; name: string; slug: string } | null;
  user?: { id: string; name: string; avatar?: string | null; phone?: string | null };
  createdAt?: string;
};

type Props = {
  ad: Ad;
  stateSlug: string;
  citySlug: string;
  categorySlug: string;
};

function buildImageUrl(img: string): string {
  const s = (img || '').trim();
  if (!s) return '';
  if (s.startsWith('http')) return s;
  return s.startsWith('/') ? `${API_ORIGIN}${s}` : `${API_ORIGIN}/${s}`;
}

export function AdDetailByPath({ ad, stateSlug, citySlug, categorySlug }: Props) {
  const [mainIndex, setMainIndex] = useState(0);
  const [showPhone, setShowPhone] = useState(false);
  const { isAuthenticated } = useAuth();
  const toggleFavorite = useToggleFavorite();
  const { data: isFavorite } = useIsFavorite(ad.id, isAuthenticated);

  const images = (ad.images || [])
    .filter((img: unknown) => img && String(img).trim())
    .map((img: unknown) => buildImageUrl(String(img)));
  const displayImages = images.length > 0 ? images : [PLACEHOLDER_IMAGE];

  const locationDisplay = [
    ad.location?.name,
    ad.city,
    ad.state,
  ].filter(Boolean).join(', ') || 'Location not specified';

  const breadcrumbPath = [
    { name: 'Home', href: '/' },
    { name: ad.state || stateSlug, href: dirPath(stateSlug) },
    { name: ad.city || citySlug, href: dirPath(stateSlug, citySlug) },
    { name: ad.category?.name || categorySlug, href: dirPath(stateSlug, citySlug, categorySlug) },
    { name: ad.title, href: '' },
  ];

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to add to favorites');
      return;
    }
    toggleFavorite.mutate(ad.id);
  };

  const handleShowPhone = () => {
    if (!isAuthenticated) {
      toast.error('Please login to view phone number');
      return;
    }
    setShowPhone(true);
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: ad.title, text: `${ad.title} - ₹${Number(ad.price).toLocaleString('en-IN')}`, url });
        toast.success('Shared successfully!');
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied!');
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Link copied!');
        } catch {
          toast.error('Failed to share');
        }
      }
    }
  };

  const conditionLabel = ad.condition
    ? { NEW: 'New', USED: 'Used', LIKE_NEW: 'Like New', REFURBISHED: 'Refurbished' }[ad.condition] || ad.condition
    : null;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={dirPath(stateSlug, citySlug, categorySlug)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>

        <nav className="mb-6 text-sm text-gray-600">
          {breadcrumbPath.map((item, index) => (
            <span key={index}>
              {index > 0 && <span className="mx-2 text-gray-400">/</span>}
              {item.href ? (
                <Link href={item.href} className="hover:text-blue-600">{item.name}</Link>
              ) : (
                <span className="font-bold text-gray-900">{item.name}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 shadow-sm">
              <div className="flex gap-4">
                {displayImages.length > 1 && (
                  <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
                    {displayImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setMainIndex(i)}
                        className={`w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                          mainIndex === i ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200'
                        }`}
                      >
                        <ImageWithFallback src={img} alt={`${ad.title} image ${i + 1}`} width={80} height={80} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                  <ImageWithFallback
                    src={displayImages[mainIndex]}
                    alt={ad.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{formatAdTitle(ad.title)}</h1>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-gray-900">₹{Number(ad.price).toLocaleString('en-IN')}</span>
                {conditionLabel && (
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-sm">{conditionLabel}</span>
                )}
              </div>
              {ad.description && (
                <div className="prose prose-gray max-w-none">
                  <p className="whitespace-pre-wrap text-gray-600">{ad.description}</p>
                </div>
              )}
              <p className="mt-4 flex items-center gap-2 text-gray-500 text-sm">
                <FiMapPin className="flex-shrink-0" />
                {locationDisplay}
              </p>
              {ad.location?.slug && (
                <p className="mt-2">
                  <Link
                    href={getFindInPlaceUrl(ad.location.slug, ad.category?.slug)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Find more in {ad.location.name || ad.location.slug}
                  </Link>
                </p>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm sticky top-24">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleFavorite}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    isFavorite ? 'bg-red-50 border-red-200 text-red-600' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FiHeart className={isFavorite ? 'fill-current' : ''} />
                  {isFavorite ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <FiShare2 /> Share
                </button>
              </div>
              {ad.user && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Seller</p>
                  <Link
                    href={`/user/${ad.user.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                  >
                    {ad.user.avatar ? (
                      <ImageWithFallback
                        src={buildImageUrl(ad.user.avatar)}
                        alt={`${ad.user?.name || 'Seller'} avatar`}
                        width={48}
                        height={48}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                        {(ad.user.name || 'U')[0]}
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{ad.user.name}</span>
                  </Link>
                </div>
              )}
              <div className="mt-4 flex flex-col gap-2">
                {showPhone && ad.user?.phone ? (
                  <a
                    href={`tel:${ad.user.phone.replace(/\s/g, '')}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
                  >
                    <FiPhone /> {ad.user.phone}
                  </a>
                ) : (
                  <button
                    onClick={handleShowPhone}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
                  >
                    <FiPhone />
                    {isAuthenticated ? 'Show phone number' : 'Login to view number'}
                  </button>
                )}
                <Link
                  href={`/chat?adId=${ad.id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-gray-300 font-medium hover:bg-gray-50"
                >
                  <FiMessageCircle /> Chat
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
