/**
 * Ad URL helpers – no dependency on directory API or seo.
 * Use this from client components to avoid circular/init order issues.
 */

const SLUG_MAX_LENGTH = 70;

function normalizeSegment(segment: string): string {
  if (!segment || typeof segment !== 'string') return '';
  return segment
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugify(text: string, maxLength: number = SLUG_MAX_LENGTH): string {
  const raw = text
    .trim()
    .toLowerCase()
    .replace(/[&\-%$#@!*()+=[\]{}|;:'",.<>?/\\]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw.slice(0, maxLength).replace(/-+$/, '');
}

function dirPath(...segments: string[]): string {
  const normalized = segments.map((s) => normalizeSegment(s)).filter(Boolean);
  return normalized.length ? `/${normalized.join('/')}` : '';
}

/** Ad URL for listing/cards: SEO path when ad has location + category slugs, else /ads/:id. */
export function getAdUrl(ad: {
  id: string;
  stateSlug?: string | null;
  citySlug?: string | null;
  categorySlug?: string | null;
  slug?: string | null;
  state?: string | null;
  city?: string | null;
  category?: { slug?: string } | null;
  title?: string | null;
  location?: { slug?: string; name?: string } | null;
  locationSlug?: string | null;
}): string {
  const stateSlug = ad.stateSlug ?? (ad.state ? slugify(ad.state) : '');
  const citySlug = ad.citySlug ?? (ad.city ? slugify(ad.city) : '');
  const categorySlug = ad.categorySlug ?? ad.category?.slug ?? '';
  const adSlug = (ad.slug && String(ad.slug).trim()) ? String(ad.slug).trim().toLowerCase() : (ad.title ? slugify(ad.title, 70) : '');
  if (stateSlug && citySlug && categorySlug && adSlug) {
    return dirPath(stateSlug, citySlug, categorySlug, adSlug);
  }
  return `/ads/${ad.id}`;
}

/** URL to find more ads in this place: /ads?location=slug */
export function getFindInPlaceUrl(locationSlug: string | null | undefined, categorySlug?: string | null): string {
  if (!locationSlug) return '/ads';
  const params = new URLSearchParams();
  params.set('location', locationSlug);
  if (categorySlug) params.set('category', categorySlug);
  return `/ads?${params.toString()}`;
}
