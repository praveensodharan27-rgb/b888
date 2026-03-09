/**
 * Short-format helpers for spec labels to save horizontal space.
 * Used by AdSpecs for fit-to-width rendering.
 */

/** Convert long spec text to short format for tight layouts */
export function toShortFormat(label: string): string {
  if (!label || typeof label !== 'string') return label;
  const v = label.trim();
  if (!v) return v;

  // 25,000 km / 25000 km → 25k km
  const kmMatch = v.match(/^([\d,.\s]+)\s*km$/i);
  if (kmMatch) {
    const num = parseInt(String(kmMatch[1]).replace(/\D/g, ''), 10);
    if (!Number.isNaN(num)) {
      if (num >= 1000) return `${(num / 1000) | 0}k km`;
      return `${num} km`;
    }
  }

  // 3 years / 3 yrs / 3 year → 3 yr
  const yrMatch = v.match(/^(\d+)\s*(?:years?|yrs?)$/i);
  if (yrMatch) return `${yrMatch[1]} yr`;

  // 1200 sq.ft / 1,200 square feet → 1200 sqft
  const sqftMatch = v.match(/^([\d,.\s]+)\s*(?:sq\.?\s*ft|square\s*feet?|sqft)$/i);
  if (sqftMatch) {
    const num = String(sqftMatch[1]).replace(/\D/g, '');
    return `${num} sqft`;
  }

  // 8 GB / 128 GB → keep as is (already short)
  // Like New / Good / Used → keep
  return v;
}
