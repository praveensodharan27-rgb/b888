/**
 * SEO-friendly slug: lowercase, hyphens, no special chars.
 * Used for directory URLs: state, city, category, business name.
 * - Remove symbols (&, %, $, etc.)
 * - Replace spaces with hyphens, trim extra hyphens
 * - Limit to maxLength (default 70)
 */
function slugify(text, maxLength = 70) {
  if (!text || typeof text !== 'string') return '';
  const raw = text
    .trim()
    .toLowerCase()
    .replace(/[&\-%$#@!*()+=[\]{}|;:'",.<>?/\\]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  const trimmed = raw.slice(0, maxLength);
  return trimmed.replace(/-+$/, '');
}

/**
 * If a slug already exists (e.g. same city+category), append city name or a short unique suffix.
 * Caller should pass existingSlugs array and optionally citySlug; returns slug that is unique.
 */
function slugifyUnique(businessName, existingSlugs = [], citySlug = '', maxLength = 70) {
  let base = slugify(businessName, maxLength - 10);
  if (!base) return 'business';
  let candidate = base;
  let n = 0;
  while (existingSlugs.includes(candidate)) {
    n += 1;
    const suffix = citySlug ? `-${citySlug}` : `-${n}`;
    candidate = `${base.slice(0, maxLength - suffix.length)}${suffix}`;
  }
  return candidate;
}

module.exports = { slugify, slugifyUnique };
