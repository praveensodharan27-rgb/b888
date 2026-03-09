'use client';

import Link from 'next/link';
import {
  ProductGallery,
  PriceActionCard,
  KeyHighlights,
  SpecificationsGrid,
  DescriptionBlock,
  AutoSeoContentBlock,
  InternalLinkingSection,
  SellerCard,
  SafetyTips,
  LocalPickupCard,
  RelatedItemsCarousel,
  StickyMobileCTA,
} from './index';
import {
  buildSeoH1,
  buildKeywordRichParagraph,
  buildAutoSeoContentBlock,
  buildImageAlt,
  buildImageTitle,
  FALLBACK_CITY,
} from '@/lib/seoProduct';

export interface ProductDetailPageProps {
  ad: {
    id: string;
    title: string;
    description?: string | null;
    price?: number | null;
    images?: string[];
    createdAt?: string;
    condition?: string | null;
    attributes?: Record<string, any>;
    user?: {
      id: string;
      name?: string | null;
      avatar?: string | null;
      phone?: string | null;
      createdAt?: string;
      isVerified?: boolean;
    } | null;
    location?: {
      name?: string;
      city?: string;
      state?: string;
      latitude?: number;
      longitude?: number;
    } | null;
    city?: string | null;
    state?: string | null;
    category?: { slug?: string; name?: string } | null;
  };
  locationDisplay: string;
  postedTime: string;
  mapCoordinates: { lat: number; lng: number } | null;
  cityForMapFallback: string | null;
  isLoadingMap?: boolean;
  keyHighlights: string[];
  specItems: { label: string; value: string | number; icon?: string }[];
  relatedFromSeller: any[];
  relatedSimilar: any[];
  relatedRecentlyViewed: any[];
  isFavorite: boolean;
  showPhone: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
  onWishlist: (e?: React.MouseEvent) => void;
  onRevealPhone: () => void;
  onShare: () => void;
  onBack?: () => void;
  breadcrumbPath?: { name: string; href: string }[];
  reportButton?: React.ReactNode;
}

export function ProductDetailPage(props: ProductDetailPageProps) {
  const {
    ad,
    locationDisplay,
    postedTime,
    mapCoordinates,
    cityForMapFallback,
    isLoadingMap = false,
    keyHighlights,
    specItems,
    relatedFromSeller,
    relatedSimilar,
    relatedRecentlyViewed,
    isFavorite,
    showPhone,
    isOwner,
    isAuthenticated,
    onWishlist,
    onRevealPhone,
    onShare,
    onBack,
    breadcrumbPath = [],
    reportButton,
  } = props;

  const city = cityForMapFallback || FALLBACK_CITY;
  const state = ad.state ?? ad.location?.state ?? FALLBACK_CITY;
  const categoryName = ad.category?.name ?? null;
  const categorySlug = ad.category?.slug ?? null;
  const brand = (ad.attributes?.brand as string) ?? null;

  const seoInput = {
    productName: ad.title,
    categoryName,
    city,
    state,
    price: ad.price ?? null,
    brand,
    condition: ad.condition ?? undefined,
  };

  const seoH1 = buildSeoH1(seoInput);
  const keywordRichParagraph = buildKeywordRichParagraph(seoInput);
  const autoSeoContent = buildAutoSeoContentBlock(seoInput);
  const imageAlt = buildImageAlt({ productName: ad.title, city });
  const imageTitle = buildImageTitle({ productName: ad.title, state });

  const validImages = (ad.images || [])
    .filter((img: any) => img && String(img).trim())
    .map((img: any) => {
      const s = String(img).trim();
      if (s.startsWith('/uploads/')) {
        const base = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
        return `${base}${s}`;
      }
      return s;
    });

  const trustBadges = [];
  if (ad.user?.isVerified) trustBadges.push({ label: 'Verified seller' });
  trustBadges.push({ label: 'Fast response' });
  if (ad.user?.createdAt) trustBadges.push({ label: 'Member since' });

  const memberSince = ad.user?.createdAt
    ? (() => {
        try {
          const d = new Date(ad.user!.createdAt!);
          return `Member since ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
        } catch {
          return null;
        }
      })()
    : null;

  const combinedRelated = [
    ...relatedFromSeller,
    ...relatedSimilar.filter((r) => !relatedFromSeller.some((s) => s.id === r.id)),
  ];
  const similarAds = combinedRelated.slice(0, 12);
  const recentlyViewed = relatedRecentlyViewed.slice(0, 8);

  const showStickyCTA = !isOwner && ad.user?.id;

  return (
    <div className={`min-h-screen bg-[#f9fafb] ${showStickyCTA ? 'pb-20 sm:pb-24 lg:pb-0' : ''}`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Back & Breadcrumbs */}
        {(onBack || breadcrumbPath.length > 0) && (
          <div className="mb-4 sm:mb-6">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
            {breadcrumbPath.length > 0 && (
              <nav className="text-xs sm:text-sm text-gray-500 overflow-x-auto whitespace-nowrap" aria-label="Breadcrumb">
                {breadcrumbPath.map((item, i) => (
                  <span key={i}>
                    {i > 0 && <span className="mx-1 sm:mx-2">/</span>}
                    <Link href={item.href} className="hover:text-primary-600">
                      {item.name}
                    </Link>
                  </span>
                ))}
              </nav>
            )}
          </div>
        )}

        {/* Desktop: 2-col (65/35) | Mobile: stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_420px] gap-4 sm:gap-6 lg:gap-8 items-start">
          {/* Left column */}
          <div className="space-y-4 sm:space-y-6 order-1 min-w-0">
            {/* 1. Gallery */}
            <ProductGallery
              images={validImages}
              title={ad.title}
              condition={ad.condition}
              imageAlt={imageAlt}
              imageTitle={imageTitle}
              isFavorite={isFavorite}
              onWishlist={onWishlist}
            />

            {/* 2. Key highlights */}
            {keyHighlights.length > 0 && (
              <KeyHighlights items={keyHighlights} />
            )}

            {/* 3. Specifications (before description) */}
            {specItems.length > 0 && (
              <SpecificationsGrid
                items={specItems.map((s) => ({
                  ...s,
                  icon: (s.icon as any) || 'package',
                }))}
              />
            )}

            {/* 4. Description (with keyword-rich + auto-expand fallback) */}
            <DescriptionBlock
              description={ad.description || ''}
              keywordRichParagraph={keywordRichParagraph}
              autoSeoContent={autoSeoContent}
              expandIfShorterThan={100}
            />

            {/* 5. Auto SEO content block */}
            <AutoSeoContentBlock content={autoSeoContent} />

            {/* 6. Internal linking */}
            <InternalLinkingSection
              city={city !== FALLBACK_CITY ? city : null}
              categorySlug={categorySlug}
              categoryName={categoryName}
              brand={brand}
              categoryType={categoryName?.toLowerCase() ?? 'items'}
            />
          </div>

          {/* Right column - sticky */}
          <div className="space-y-4 sm:space-y-6 order-2 lg:order-2 min-w-0">
            {/* Price & Action card - sticky on desktop */}
            <PriceActionCard
              price={ad.price ?? null}
              title={ad.title}
              seoH1={seoH1}
              location={locationDisplay}
              postedTime={postedTime}
              adId={ad.id}
              userId={ad.user?.id}
              isOwner={isOwner}
              showPhone={showPhone}
              phone={ad.user?.phone}
              onRevealPhone={onRevealPhone}
              onWishlist={onWishlist}
              isFavorite={isFavorite}
              onShare={onShare}
              trustBadges={trustBadges}
              isAuthenticated={isAuthenticated}
            />

            <SellerCard
              userId={ad.user?.id}
              name={ad.user?.name}
              avatar={ad.user?.avatar}
              memberSince={memberSince}
              isVerified={ad.user?.isVerified}
              totalAdsCount={(ad.user as any)?.totalAdsCount ?? (ad.user as any)?._count?.ads}
            />

            <SafetyTips />

            <LocalPickupCard city={cityForMapFallback} />

            {reportButton}
          </div>
        </div>

        {/* Bottom: Related items (auto-hide empty) */}
        <div className="mt-8 sm:mt-10 lg:mt-12 space-y-6 sm:space-y-8 lg:space-y-10">
          {relatedFromSeller.length >= 2 && (
            <RelatedItemsCarousel
              title="More from this seller"
              items={relatedFromSeller}
            />
          )}
          {similarAds.length > 0 && (
            <RelatedItemsCarousel
              title="Similar items in this price range"
              items={similarAds}
            />
          )}
          {recentlyViewed.length > 0 && (
            <RelatedItemsCarousel
              title="Recently viewed"
              items={recentlyViewed}
            />
          )}
        </div>
      </div>

      {/* Sticky mobile CTA: Price | Chat | Call */}
      <StickyMobileCTA
        adId={ad.id}
        userId={ad.user?.id}
        isOwner={isOwner}
        showPhone={showPhone}
        phone={ad.user?.phone}
        price={ad.price ?? null}
        onRevealPhone={onRevealPhone}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
