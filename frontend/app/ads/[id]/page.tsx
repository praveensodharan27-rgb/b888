/**
 * SSR Ad Detail Page – Server Component
 * View Source contains full HTML: h1, price, description, image, seller
 * Root layout provides AppWithShell; no PageWithShell needed.
 *
 * Supports two usages:
 * 1. Route: /ads/[id] — params.id
 * 2. Embedded: from 4-segment page — adId + initialAd
 */

import { notFound } from 'next/navigation';
import { getAd } from '@/lib/adsApi';
import AdDetailSSR from '@/components/ads/AdDetailSSR';

export const revalidate = 60;

type RouteProps = {
  params?: Promise<{ id: string }> | null;
  adId?: string;
  initialAd?: Record<string, unknown>;
  stateSlug?: string | null;
  citySlug?: string | null;
  categorySlug?: string | null;
};

export default async function AdDetailPage({
  params,
  adId,
  initialAd,
  stateSlug = null,
  citySlug = null,
  categorySlug = null,
}: RouteProps) {
  // Embedded usage: 4-segment page passes adId + initialAd
  if (initialAd?.id) {
    return (
      <AdDetailSSR
        ad={initialAd as any}
        stateSlug={stateSlug}
        citySlug={citySlug}
        categorySlug={categorySlug}
      />
    );
  }
  if (adId) {
    const ad = await getAd(adId);
    if (ad) return <AdDetailSSR ad={ad as any} />;
    notFound();
  }

  // Route usage: /ads/[id]
  const resolved = params ? await params : null;
  const id = resolved?.id;
  if (!id) notFound();
  const ad = await getAd(id);
  if (!ad) notFound();

  return <AdDetailSSR ad={ad as any} />;
}
