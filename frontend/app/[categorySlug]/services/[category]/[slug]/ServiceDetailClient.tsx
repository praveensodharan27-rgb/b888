'use client';

import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';
import { FiPhone, FiMapPin } from 'react-icons/fi';
import { getServiceCategoryUrl, getServicesBaseUrl } from '@/lib/servicesUrl';
import { PLACEHOLDER_IMAGE } from '@/lib/imageConstants';

interface AdShape {
  id: string;
  title: string;
  description?: string | null;
  price?: number;
  images?: string[];
  location?: { name?: string; city?: string; state?: string } | null;
  city?: string | null;
  state?: string | null;
  user?: { id: string; name?: string; phone?: string } | null;
}

interface ServiceDetailClientProps {
  ad: AdShape;
  citySlug: string;
  categorySlug: string;
  locationName: string;
  categoryLabel: string;
}

export default function ServiceDetailClient({
  ad,
  citySlug,
  categorySlug,
  locationName,
  categoryLabel,
}: ServiceDetailClientProps) {
  const imageUrl = ad.images?.[0] && String(ad.images[0]).trim()
    ? String(ad.images[0]).trim()
    : PLACEHOLDER_IMAGE;
  const locationDisplay = [
    ad.location?.name,
    ad.location?.city || ad.city,
    ad.location?.state || ad.state,
  ].filter(Boolean).join(', ') || 'Location not specified';

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
            <div className="relative aspect-[4/3] w-full">
              <ImageWithFallback
                src={imageUrl}
                alt={ad.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">{ad.title}</h1>
            {ad.price != null && (
              <p className="mt-2 text-xl font-semibold text-gray-900">
                ₹{Number(ad.price).toLocaleString('en-IN')}
              </p>
            )}
            {ad.description && (
              <div className="mt-4 text-gray-600 whitespace-pre-wrap">{ad.description}</div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900">Contact</h2>
            {ad.user?.name && (
              <p className="mt-1 text-gray-700">{ad.user.name}</p>
            )}
            {ad.user?.phone && (
              <a
                href={`tel:${ad.user.phone}`}
                className="mt-2 flex items-center gap-2 text-blue-600 hover:underline"
              >
                <FiPhone className="w-4 h-4" />
                {ad.user.phone}
              </a>
            )}
            <div className="mt-3 flex items-start gap-2 text-gray-600">
              <FiMapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{locationDisplay}</span>
            </div>
          </div>
          <Link
            href={`/ads/${ad.id}`}
            className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700"
          >
            View full listing
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
        <Link href={getServiceCategoryUrl(citySlug, categorySlug)} className="text-blue-600 hover:underline">
          ← More {categoryLabel} in {locationName}
        </Link>
        <span className="mx-2">|</span>
        <Link href={getServicesBaseUrl(citySlug)} className="text-blue-600 hover:underline">
          All services in {locationName}
        </Link>
      </div>
    </div>
  );
}
