/**
 * Indian number format with lakh and crore conversion.
 * < 1,00,000: full amount (e.g. ₹12,500)
 * 1,00,000–99,99,999: ₹X.XX lakh
 * 1,00,00,000+: ₹X.XX crore
 */
export function formatPriceFull(price: number): string {
  if (price >= 100_000_00) {
    const crore = price / 100_000_00;
    const str = crore.toFixed(2).replace(/\.?0+$/, '');
    return `₹${str} crore`;
  }
  if (price >= 100_000) {
    const lakh = price / 100_000;
    const str = lakh.toFixed(2).replace(/\.?0+$/, '');
    return `₹${str} lakh`;
  }
  return `₹${price.toLocaleString('en-IN')}`;
}

/**
 * Format price for ad cards: lakh (₹X.X lakh) for ≥1,00,000, crore for ≥1cr, k for thousands.
 */
export function formatPriceShort(price: number): string {
  if (price >= 100_000_00) {
    const crore = price / 100_000_00;
    const str = crore.toFixed(2).replace(/\.?0+$/, '');
    return `₹${str} crore`;
  }
  if (price >= 100_000) {
    const lakh = price / 100_000;
    const str = lakh.toFixed(2).replace(/\.?0+$/, '');
    return `₹${str} lakh`;
  }
  if (price >= 1_000) {
    const k = price / 1_000;
    const str = k % 1 === 0 ? String(Math.round(k)) : k.toFixed(1).replace(/\.?0+$/, '');
    return `₹${str}k`;
  }
  return `₹${price.toLocaleString('en-IN')}`;
}
