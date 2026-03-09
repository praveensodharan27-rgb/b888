'use client';

import { useAds } from '@/hooks/useAds';
import LazyAdCard from '@/components/LazyAdCard';

type Props = {
  categorySlug?: string | null;
  subcategorySlug?: string | null;
  excludeId: string;
};

export default function RelatedAdsClient({
  categorySlug,
  subcategorySlug,
  excludeId,
}: Props) {
  const { data } = useAds(
    { category: categorySlug || undefined, subcategory: subcategorySlug || undefined, limit: 8 },
    { enabled: !!categorySlug || !!subcategorySlug }
  );
  const ads = (data?.ads || []).filter((ad: { id: string }) => ad.id !== excludeId).slice(0, 6);

  if (ads.length === 0) return null;

  const params = new URLSearchParams();
  if (categorySlug) params.set('category', categorySlug);
  if (subcategorySlug) params.set('subcategory', subcategorySlug);
  const viewAllHref = params.toString() ? `/ads?${params.toString()}` : '/ads';

  return (
    <section className="mt-12 pt-8 border-t border-gray-200" aria-labelledby="similar-listings-heading">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 id="similar-listings-heading" className="text-xl font-bold text-gray-900">Similar Listings</h2>
          <p className="text-sm text-gray-500 mt-0.5">More ads in this category</p>
        </div>
        <a
          href={viewAllHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 shrink-0 transition-colors group"
        >
          See all
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </a>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 scrollbar-thin md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
        {ads.map((ad: { id: string }, index: number) => (
          <div key={ad.id} className="min-w-[280px] md:min-w-0 shrink-0 md:shrink">
          <LazyAdCard
            key={ad.id}
            ad={ad}
            variant="ognox"
            priority={index < 2}
            eager={index < 4}
          />
          </div>
        ))}
      </div>
    </section>
  );
}
