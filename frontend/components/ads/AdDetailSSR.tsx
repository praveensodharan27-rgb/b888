/**
 * Server-rendered ad detail. OLX-style layout.
 * LEFT: image gallery (carousel + thumbnails) | RIGHT: price, title, location, CTA, seller, safety tips
 * Below: Details, Description, Location, Related Items
 * Mobile: image full width, sticky call/chat button
 */

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { buildImageAlt } from '@/lib/seoProduct';
import { dirPath } from '@/lib/directory';
import { formatAdTitle } from '@/lib/formatText';
import { CONTENT_CONTAINER_CLASS } from '@/lib/layoutConstants';
import AdDetailGalleryClient from './AdDetailGalleryClient';
import AdDetailSidebarClient from './AdDetailSidebarClient';
import AdDetailStickyMobileClient from './AdDetailStickyMobileClient';
import RelatedAdsClient from './RelatedAdsClient';

type Ad = {
  id: string;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  negotiable?: boolean | null;
  condition?: string | null;
  images?: string[] | null;
  attributes?: Record<string, unknown> | null;
  user?: {
    id?: string;
    name?: string | null;
    avatar?: string | null;
    phone?: string | null;
    showPhone?: boolean;
    createdAt?: string | null;
    isVerified?: boolean;
    rating?: number | null;
    ratingCount?: number | null;
    adsCount?: number | null;
  } | null;
  city?: string | null;
  state?: string | null;
  location?: { name?: string; slug?: string; latitude?: number; longitude?: number } | null;
  category?: { slug?: string; name?: string } | null;
  subcategory?: { slug?: string; name?: string } | null;
  createdAt?: string | null;
  views?: number | null;
};

type Props = {
  ad: Ad;
  /** For breadcrumb when from 4-segment path /{state}/{city}/{category}/{slug} */
  stateSlug?: string | null;
  citySlug?: string | null;
  categorySlug?: string | null;
};

export default function AdDetailSSR({
  ad,
  stateSlug = null,
  citySlug = null,
  categorySlug = null,
}: Props) {
  const imageAlt = buildImageAlt({ productName: ad.title || 'Product', city: ad.city });
  const locationDisplay = [ad.location?.name, ad.city, ad.state]
    .filter(Boolean)
    .join(', ') || '—';
  const postedAgo = ad.createdAt
    ? formatDistanceToNow(new Date(ad.createdAt), { addSuffix: true })
    : null;

  const attrs = (ad.attributes && typeof ad.attributes === 'object'
    ? ad.attributes as Record<string, unknown>
    : {}) || {};
  const excludeKeys = ['features', 'highlights'];
  const entries = Object.entries(attrs).filter(
    ([k]) => !excludeKeys.includes(k.toLowerCase())
  );
  if (ad.condition && !entries.some(([k]) => k === 'condition')) entries.unshift(['condition', ad.condition]);
  const brand = ((ad as { brand?: string }).brand ?? attrs.brand) as string | undefined;
  if (brand && !entries.some(([k]) => k === 'brand')) entries.unshift(['brand', brand]);
  const hasDetails = entries.length > 0;
  const hasDescription = ad.description && String(ad.description).trim();
  const formatLabel = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const getValue = (v: unknown) =>
    Array.isArray(v) ? v.join(', ') : String(v ?? '');

  /** Highlight line under title: e.g. "2023 • Diesel • 58,555 km • Automatic" */
  const getSpecHighlight = (): string | null => {
    const parts: string[] = [];
    const year = attrs.year ?? attrs.Year;
    if (year != null && String(year).trim()) parts.push(String(year).trim());
    const fuel = attrs.fuel ?? attrs.fuel_type ?? attrs.fuelType ?? attrs['Fuel Type'];
    if (fuel != null && String(fuel).trim()) parts.push(String(fuel).trim());
    const km = attrs.km_driven ?? attrs.kms_driven ?? attrs.kilometers_driven ?? attrs['KM Driven'];
    if (km != null && String(km).trim()) {
      const num = Number(String(km).replace(/\D/g, ''));
      parts.push(Number.isNaN(num) ? String(km).trim() : `${num.toLocaleString('en-IN')} km`);
    }
    const trans = attrs.transmission ?? attrs.Transmission;
    if (trans != null && String(trans).trim()) parts.push(String(trans).trim());
    return parts.length > 0 ? parts.join(' • ') : null;
  };
  const specHighlight = getSpecHighlight();

  const hasBreadcrumbPath = stateSlug && citySlug && categorySlug;

  const postedAgoUpper = postedAgo ? postedAgo.toUpperCase().replace(/\s+/g, ' ') : null;

  return (
    <div className={`min-h-screen bg-gray-50 ${ad.user?.id ? 'pb-24 lg:pb-8' : ''}`}>
      <div className={`${CONTENT_CONTAINER_CLASS} py-6 sm:py-8`}>
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm flex items-center flex-wrap gap-x-1 gap-y-1" aria-label="Breadcrumb">
        <Link href="/" className="text-gray-500 hover:text-primary-600 transition-colors">Home</Link>
        <span className="text-gray-300">/</span>
        {hasBreadcrumbPath ? (
          <>
            <Link href={dirPath(stateSlug)} className="text-gray-500 hover:text-primary-600 transition-colors truncate max-w-[120px] sm:max-w-none">{ad.state || stateSlug}</Link>
            <span className="text-gray-300">/</span>
            <Link href={dirPath(stateSlug, citySlug)} className="text-gray-500 hover:text-primary-600 transition-colors truncate max-w-[120px] sm:max-w-none">{ad.city || citySlug}</Link>
            <span className="text-gray-300">/</span>
            <Link href={dirPath(stateSlug, citySlug, categorySlug)} className="text-gray-500 hover:text-primary-600 transition-colors truncate max-w-[120px] sm:max-w-none">{ad.category?.name || categorySlug}</Link>
            <span className="text-gray-300">/</span>
          </>
        ) : ad.category ? (
          <>
            <Link href={`/${ad.category.slug}`} className="text-gray-500 hover:text-primary-600 transition-colors">{ad.category.name}</Link>
            <span className="text-gray-300">/</span>
          </>
        ) : (
          <>
            <Link href="/ads" className="text-gray-500 hover:text-primary-600 transition-colors">Ads</Link>
            <span className="text-gray-300">/</span>
          </>
        )}
        <span className="text-gray-900 font-semibold truncate max-w-[200px] sm:max-w-none" title={ad.title || ''}>
          {formatAdTitle(ad.title)}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* LEFT: Image gallery + Description + Specifications (same width as image) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="p-4 sm:p-5">
              <AdDetailGalleryClient ad={ad} imageAlt={imageAlt} />
            </div>
          </div>

          {/* Specifications – card grid, 3 cols desktop, icon + label + value */}
          {hasDetails && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </span>
              Specifications
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 spec-grid">
              {entries.map(([key, value]) => {
                if (value === null || value === undefined || value === '') return null;
                const displayValue = getValue(value);
                if (!displayValue.trim()) return null;
                const k = key.toLowerCase();
                const iconClass = 'w-5 h-5 text-primary-500 shrink-0';
                const IconSvg = () => {
                  if (k.includes('brand')) return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
                  if (k.includes('condition')) return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
                  if (k.includes('model')) return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
                  if (k.includes('year')) return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
                  if (k.includes('color')) return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>;
                  if (k.includes('km') || k.includes('kms') || k.includes('kilometer')) return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
                  if (k.includes('owner')) return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
                  if (k.includes('fuel')) return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2h-2m-4-1V9" /></svg>;
                  if (k.includes('transmission')) return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
                  if (k.includes('storage')) return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
                  if (k.includes('health') || k.includes('battery')) return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
                  return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>;
                };
                const condLower = (displayValue || '').toLowerCase();
                const condBadge = k === 'condition' && (condLower.includes('excellent') || condLower.includes('mint') || condLower.includes('new') ? 'bg-green-100 text-green-800' : condLower.includes('good') ? 'bg-amber-50 text-amber-800' : condLower.includes('fair') || condLower.includes('used') ? 'bg-orange-50 text-orange-800' : null);
                return (
                  <div key={key} className="group spec-card bg-[#f9fafb] rounded-lg p-3 border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 hover:shadow-md transition-all duration-300 ease-out">
                    <div className="flex items-start gap-2.5">
                      <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-primary-50/80 spec-icon-round group-hover:scale-110 transition-transform duration-300">
                        <IconSvg />
                      </span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{formatLabel(key)}</span>
                        <span className={`text-[13px] font-semibold mt-0.5 break-words text-gray-900 ${condBadge ? `inline-flex px-1.5 py-0.5 rounded text-xs font-bold w-fit mt-1 ${condBadge}` : ''}`}>{displayValue}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* Description – seller-written content only (no specs; those stay in Specifications grid) */}
          {hasDescription && (() => {
            const desc = String(ad.description).trim();
            const highlightsMatch = desc.match(/\b[Hh]ighlights?:\s*([\s\S]*?)(?=\b[Rr]eason\s+for\s+selling:\b|$)/);
            const reasonMatch = desc.match(/\b[Rr]eason\s+for\s+selling:\s*([\s\S]*?)$/);
            const mainBefore = desc.split(/\b[Hh]ighlights?:\b/)[0].trim();
            const mainParagraph = mainBefore || (highlightsMatch ? '' : desc);
            const highlightsText = highlightsMatch?.[1]?.trim() || '';
            const bulletPattern = /^[-*•]\s*/;
            const highlightItems = highlightsText
              ? highlightsText
                  .split(/\r?\n/)
                  .map((l) => l.replace(bulletPattern, '').trim())
                  .filter(Boolean)
              : [];
            const reasonText = reasonMatch?.[1]?.trim() || '';
            const featuresFromAttr = (ad.attributes as Record<string, unknown>)?.features;
            const bullets =
              highlightItems.length > 0
                ? highlightItems
                : Array.isArray(featuresFromAttr)
                  ? (featuresFromAttr as string[])
                  : [];
            const hasContent = mainParagraph || bullets.length > 0 || reasonText;
            if (!hasContent) return null;
            return (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </span>
                  Description
                </h2>
                <div className="space-y-4 text-gray-700">
                  {mainParagraph && (
                    <p className="leading-relaxed whitespace-pre-wrap text-[15px]">{mainParagraph}</p>
                  )}
                  {bullets.length > 0 && (
                    <ul className="list-none space-y-2">
                      {bullets.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center shrink-0 mt-0.5">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          </span>
                          <span className="text-[15px]">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {reasonText && (
                    <div className="pt-2 border-t border-gray-100">
                      <h4 className="font-medium text-gray-900 mb-1 text-sm">Reason for selling</h4>
                      <p className="leading-relaxed text-[15px]">{reasonText}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* RIGHT: Price, Title, Location, CTA, Seller, Safety */}
        <div className="lg:col-span-1">
          <AdDetailSidebarClient
            ad={ad}
            locationDisplay={locationDisplay}
            postedAgo={postedAgo}
            postedAgoUpper={postedAgoUpper}
            views={ad.views}
            specHighlight={specHighlight}
          />
        </div>
      </div>

      {/* Similar ads */}
      <RelatedAdsClient
        categorySlug={ad.category?.slug}
        subcategorySlug={ad.subcategory?.slug}
        excludeId={ad.id}
      />

      {/* Sticky mobile CTA */}
      <AdDetailStickyMobileClient
        adId={ad.id}
        userId={ad.user?.id}
        price={ad.price}
        phone={ad.user?.phone}
      />
      </div>
    </div>
  );
}
