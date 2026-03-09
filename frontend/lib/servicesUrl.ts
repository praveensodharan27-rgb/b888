/**
 * JustDial-style services URL helpers.
 * Structure: /:city/services, /:city/services/:category, /:city/services/:category/:slug
 * City = location slug from location selector (e.g. ernakulam-kerala).
 */

function normalizeSegment(s: string): string {
  if (!s || typeof s !== 'string') return '';
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Base URL for services in a city: /:city/services */
export function getServicesBaseUrl(citySlug: string): string {
  const city = normalizeSegment(citySlug);
  return city ? `/${city}/services` : '/ads?category=services';
}

/** Category listing: /:city/services/:category */
export function getServiceCategoryUrl(citySlug: string, categorySlug: string): string {
  const city = normalizeSegment(citySlug);
  const category = normalizeSegment(categorySlug);
  if (!city || !category) return '/ads?category=services';
  return `/${city}/services/${category}`;
}

/** Service detail: /:city/services/:category/:slug */
export function getServiceDetailUrl(citySlug: string, categorySlug: string, slug: string): string {
  const city = normalizeSegment(citySlug);
  const category = normalizeSegment(categorySlug);
  const s = normalizeSegment(slug);
  if (!city || !category || !s) return '';
  return `/${city}/services/${category}/${s}`;
}

export { normalizeSegment as normalizeCitySegment };
