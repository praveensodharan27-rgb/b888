/**
 * SEO-friendly dynamic page title for marketplace product details.
 * Format: {Product Name} for Sale in {City} – ₹{Price} | {Brand}
 *
 * Rules:
 * - Keep under 60 chars when possible
 * - Primary keyword (product name) first
 * - "for Sale" intent
 * - City for local SEO
 * - Price after dash
 * - Brand at end
 */

const MAX_LENGTH = 60;

export interface ProductTitleInput {
  productName: string;
  category?: string | null;
  city: string | null;
  price: number | null;
  brand?: string | null;
}

/**
 * Truncate text to max length, cutting at word boundary when possible.
 */
function truncateTo(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > max * 0.5) return cut.slice(0, lastSpace).trim();
  return cut.trim();
}

/**
 * Generate SEO-friendly product detail page title.
 * Format: {Product Name} for Sale in {City} – ₹{Price} | {Brand}
 * Keeps under 60 chars when possible by truncating product name first.
 */
export function buildProductDetailTitle(input: ProductTitleInput): string {
  const { productName, city, price, brand } = input;

  const product = (productName || 'Product').trim();
  const cityStr = (city || '').trim();
  const priceFormatted =
    price != null && !Number.isNaN(price)
      ? `₹${Number(price).toLocaleString('en-IN')}`
      : '';
  const brandStr = (brand || '').trim();

  // Core format: {Product} for Sale in {City} – ₹{Price} | {Brand}
  const suffixParts: string[] = [];
  suffixParts.push(cityStr ? ` for Sale in ${cityStr}` : ' for Sale');
  if (priceFormatted) suffixParts.push(` – ${priceFormatted}`);
  if (brandStr) suffixParts.push(` | ${brandStr}`);
  const suffix = suffixParts.join('');

  const fullTitle = product + suffix;
  if (fullTitle.length <= MAX_LENGTH) return fullTitle;

  // Over 60 chars: truncate product name
  const maxProduct = Math.max(10, MAX_LENGTH - suffix.length);
  const truncatedProduct = truncateTo(product, maxProduct);
  return truncatedProduct + suffix;
}
