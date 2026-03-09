/**
 * Directory slug and URL constants. Production-ready SEO.
 */

/** Max length for stateSlug, citySlug, categorySlug, businessSlug. */
export const SLUG_MAX_LENGTH = 70;

/** URL segment rules: lowercase, hyphens, no special chars, no duplicate hyphens, trim. */
export const SLUG_RULES = {
  lowercase: true,
  replaceSpacesWith: '-',
  removeSpecialChars: true,
  trimHyphens: true,
  maxLength: SLUG_MAX_LENGTH,
} as const;
