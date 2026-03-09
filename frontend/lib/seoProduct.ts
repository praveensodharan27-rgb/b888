/**
 * SEO utilities for marketplace product detail pages.
 * Used for meta titles, descriptions, H1, structured data, and keyword content.
 */

const TITLE_MAX = 60;
const DESC_MAX = 155;

/** Fallback when city is missing (e.g. "India") */
export const FALLBACK_CITY = 'India';

/** Slugify for filename-safe strings */
function toSlug(s: string, max = 50): string {
  return (s || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, max)
    .replace(/-$/, '');
}

function truncate(text: string, max: number, atWord = true): string {
  const t = (text || '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  if (!atWord) return cut.trim();
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > max * 0.5) return cut.slice(0, lastSpace).trim();
  return cut.trim();
}

export interface ProductSeoInput {
  productName: string;
  categoryName?: string | null;
  city?: string | null;
  state?: string | null;
  price?: number | null;
  brand?: string | null;
  condition?: string | null;
  topSpec?: string | null;
}

/**
 * H1: {Product Name} for Sale in {City}
 * Fallback: city missing → "India"
 */
export function buildSeoH1(input: ProductSeoInput): string {
  const product = (input.productName || 'Product').trim();
  const city = (input.city || FALLBACK_CITY).trim();
  return `${product} for Sale in ${city}`;
}

/**
 * Meta title (max 60 chars): {Product Name} ({Top Spec}) for Sale in {City} – Price | {Brand}
 * - If price missing → omit price part
 * - If description too short → not applicable to title
 */
export function buildSeoMetaTitle(input: ProductSeoInput): string {
  const product = (input.productName || 'Product').trim();
  const city = (input.city || FALLBACK_CITY).trim();
  const topSpec = (input.topSpec || '').trim();
  const brand = (input.brand || '').trim();
  const price = input.price != null && !Number.isNaN(input.price)
    ? `₹${Number(input.price).toLocaleString('en-IN')}`
    : '';

  let base = product;
  if (topSpec) base = `${product} (${topSpec})`;
  const suffixParts: string[] = [];
  suffixParts.push(` for Sale in ${city}`);
  if (price) suffixParts.push(` – ${price}`);
  if (brand) suffixParts.push(` | ${brand}`);
  const suffix = suffixParts.join('');

  const full = base + suffix;
  if (full.length <= TITLE_MAX) return full;

  const maxBase = Math.max(10, TITLE_MAX - suffix.length);
  return truncate(base, maxBase) + suffix;
}

/**
 * Meta description (max 155 chars): product, condition, city, trust, CTA
 */
export function buildSeoMetaDescription(input: ProductSeoInput): string {
  const product = (input.productName || 'Product').trim();
  const city = (input.city || FALLBACK_CITY).trim();
  const condition = (input.condition || '').trim();
  const price = input.price != null && !Number.isNaN(input.price)
    ? `₹${Number(input.price).toLocaleString('en-IN')}`
    : '';

  const condStr = condition ? `${condition} ` : '';
  const trust = 'Trusted seller. ';
  const cta = 'Chat now!';

  let desc = `${product} ${condStr}for sale in ${city}. ${trust}${cta}`;
  if (price) desc = `${product} – ${price}. ${condStr}Available in ${city}. ${trust}${cta}`;

  return truncate(desc, DESC_MAX);
}

/**
 * Keyword-rich natural paragraph (used product, price in state, second hand)
 * No stuffing; human-readable.
 */
export function buildKeywordRichParagraph(input: ProductSeoInput): string {
  const product = (input.productName || 'Product').trim();
  const state = (input.state || 'India').trim();
  const city = (input.city || FALLBACK_CITY).trim();
  const category = (input.categoryName || 'items').trim().toLowerCase();
  const condition = (input.condition || '').trim().toLowerCase();

  const usedOrSecond = condition && ['used', 'like_new', 'like new', 'refurbished'].some((c) =>
    condition.includes(c)
  );

  const parts: string[] = [];
  if (usedOrSecond) {
    parts.push(`This used ${product} is listed for sale in ${city}, ${state}.`);
  } else {
    parts.push(`This ${product} is available for sale in ${city}, ${state}.`);
  }
  parts.push(`${product} price in ${state} can vary; check this listing for the current offer.`);
  if (usedOrSecond) {
    parts.push(`If you are looking for a second hand ${category} at a good price, this could be a great option.`);
  } else {
    parts.push(`If you are looking for a ${category} at the best price, this listing is worth considering.`);
  }

  return parts.join(' ');
}

/**
 * Auto SEO content block paragraph
 */
export function buildAutoSeoContentBlock(input: ProductSeoInput): string {
  const product = (input.productName || 'Product').trim();
  const city = (input.city || FALLBACK_CITY).trim();
  const state = (input.state || 'India').trim();
  const category = (input.categoryName || 'product').trim().toLowerCase();

  return `This ${product} is available for sale in ${city}, ${state}. If you are looking for a used ${category} at the best price, this listing is a great choice.`;
}

/**
 * Image alt: "{Product Name} for sale in {City}"
 */
export function buildImageAlt(input: { productName: string; city?: string | null }): string {
  const product = (input.productName || 'Product').trim();
  const city = (input.city || FALLBACK_CITY).trim();
  return `${product} for sale in ${city}`;
}

/**
 * Image title: "Used {Product Name} in {State}"
 */
export function buildImageTitle(input: { productName: string; state?: string | null }): string {
  const product = (input.productName || 'Product').trim();
  const state = (input.state || FALLBACK_CITY).trim();
  return `Used ${product} in ${state}`;
}

/**
 * SEO filename suggestion: {product-name}-{city}.webp
 * (Actual filename is backend-controlled; this is for reference/alt)
 */
export function buildSeoFilename(input: { productName: string; city?: string | null }, index = 0): string {
  const product = toSlug(input.productName, 40);
  const city = toSlug(input.city || FALLBACK_CITY, 20);
  const suffix = index > 0 ? `-${index}` : '';
  return `${product}-${city}${suffix}.webp`;
}

/** Extract first meaningful spec for meta title (e.g. "8GB RAM", "128GB") */
export function extractTopSpec(attrs: Record<string, unknown> | undefined | null): string | null {
  const a = attrs || {};
  const order = ['ram', 'storage', 'model', 'brand', 'year', 'release_year', 'km_driven', 'area_sqft', 'bedrooms'];
  for (const k of order) {
    const v = a[k];
    if (v == null || String(v).trim() === '') continue;
    const s = String(v).trim();
    if (k === 'ram' && /^\d+$/.test(s)) return `${s}GB RAM`;
    if (k === 'storage') return s;
    if (k === 'km_driven' || k === 'kms_driven') {
      const n = Number(v);
      return !Number.isNaN(n) ? `${Math.round(n).toLocaleString('en-IN')} km` : s;
    }
    if (k === 'area_sqft') {
      const n = Number(v);
      return !Number.isNaN(n) ? `${n} sq.ft` : s;
    }
    return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}
