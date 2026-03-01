/**
 * Enrich ad(s) for SEO URL: state/city from location when null;
 * ensure stateSlug, citySlug, categorySlug, slug for frontend getAdUrl and redirect.
 * computeAdSlugFields: generate slug fields for ad create/update.
 */
const { slugify } = require('./slug');

/**
 * Compute slug, stateSlug, citySlug, categorySlug for an ad (create/update).
 * @param {{ title?: string, state?: string | null, city?: string | null, category?: { slug?: string } | null, location?: { state?: string, city?: string } | null, id?: string }} ad
 * @param {{ appendIdForUniqueness?: boolean }} options - if true, append short id to slug (for create)
 * @returns {{ slug: string, stateSlug: string, citySlug: string, categorySlug: string }}
 */
function computeAdSlugFields(ad, options = {}) {
  const state = ad.state || ad.location?.state || '';
  const city = ad.city || ad.location?.city || '';
  const categorySlug = (ad.category && ad.category.slug) ? ad.category.slug : '';
  const stateSlug = slugify(state);
  const citySlug = slugify(city);
  let slug = slugify((ad.title || '').trim(), 70);
  if (options.appendIdForUniqueness && ad.id) {
    const shortId = String(ad.id).slice(-6);
    slug = slug ? `${slug}-${shortId}` : shortId;
  }
  if (!slug) slug = 'ad';
  return { slug, stateSlug, citySlug, categorySlug };
}

function enrichAdForSeoUrl(ad) {
  if (!ad) return ad;
  const out = { ...ad };
  // Respect user privacy: hide phone when showPhone is false
  if (out.user && out.user.showPhone === false) {
    out.user = { ...out.user, phone: null };
  }
  if ((!out.state || !out.city) && ad.location) {
    if (!out.state && ad.location.state) out.state = ad.location.state;
    if (!out.city && ad.location.city) out.city = ad.location.city;
  }
  const state = out.state || '';
  const city = out.city || '';
  const catSlug = (ad.category && ad.category.slug) ? ad.category.slug : (out.categorySlug || '');
  if (!out.stateSlug && state) out.stateSlug = slugify(state);
  if (!out.citySlug && city) out.citySlug = slugify(city);
  if (!out.categorySlug && catSlug) out.categorySlug = catSlug;
  if (!out.slug && (out.title || '').trim()) out.slug = slugify(out.title || '', 70);
  // Place (location) for URL display and find-by-place
  if (ad.location) {
    if (ad.location.slug) out.locationSlug = ad.location.slug;
    if (ad.location.name) out.locationName = ad.location.name;
  }
  return out;
}

function enrichAdsResult(result) {
  if (result && Array.isArray(result.ads)) result.ads = result.ads.map(enrichAdForSeoUrl);
  return result;
}

module.exports = { enrichAdForSeoUrl, enrichAdsResult, computeAdSlugFields };
