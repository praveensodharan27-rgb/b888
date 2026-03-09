/**
 * Location slug utilities for SEO-friendly URLs.
 * Convention: city-state-country (e.g. mumbai-maharashtra-india)
 * Supports: city, city-state, or city-state-country.
 */

export interface ParsedLocationSlug {
  /** Original slug (lowercase, trimmed) */
  slug: string;
  /** City (first segment, title-cased for display) */
  city: string;
  /** State (second segment if present) */
  state: string | null;
  /** Country (third segment if present) */
  country: string | null;
  /** Display name e.g. "Mumbai, Maharashtra, India" */
  name: string;
  /** Number of segments (1 = city only, 2 = city-state, 3 = city-state-country) */
  segmentCount: number;
}

const SYNTHETIC_SLUGS = new Set(['india', 'all-india']);

/** Title-case a single word (e.g. "mumbai" → "Mumbai") */
function titlePart(part: string): string {
  const s = part.trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Parse an SEO-friendly location slug into city, state, country.
 * Valid slugs: 1–3 hyphen-separated parts (city, city-state, city-state-country).
 * Invalid: empty, comma-separated, or parts with empty segments.
 */
export function parseLocationSlug(slug: string | null | undefined): ParsedLocationSlug | null {
  const raw = (slug ?? '').trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  // Synthetic "All India" – not a real DB location
  if (SYNTHETIC_SLUGS.has(lower)) {
    return {
      slug: lower,
      city: '',
      state: null,
      country: 'India',
      name: 'All India',
      segmentCount: 1,
    };
  }

  // Reject comma-separated (display format, not slug)
  if (raw.includes(',') || raw.includes(', ')) return null;

  const parts = raw.split('-').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 1 || parts.length > 3) return null;

  const city = titlePart(parts[0]);
  const state = parts.length >= 2 ? titlePart(parts[1]) : null;
  const country = parts.length >= 3 ? titlePart(parts[2]) : null;

  const nameParts = [city];
  if (state) nameParts.push(state);
  if (country) nameParts.push(country);
  const name = nameParts.join(', ');

  return {
    slug: lower,
    city,
    state,
    country,
    name,
    segmentCount: parts.length,
  };
}

/**
 * Check if a slug is valid (parseable) before making API calls.
 */
export function isLocationSlugValid(slug: string | null | undefined): boolean {
  return parseLocationSlug(slug) !== null;
}

/**
 * Build an SEO-friendly slug from city, state, country.
 * Omitted parts are not included (e.g. city only → "mumbai").
 */
export function formatLocationSlug(parts: {
  city: string;
  state?: string | null;
  country?: string | null;
}): string {
  const { city, state, country } = parts;
  const c = (city ?? '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!c) return '';
  const s = (state ?? '').trim().toLowerCase().replace(/\s+/g, '-');
  const co = (country ?? '').trim().toLowerCase().replace(/\s+/g, '-');
  const out = [c];
  if (s) out.push(s);
  if (co) out.push(co);
  return out.join('-');
}

/**
 * Convert parsed slug to LocationData-shaped object (no coords).
 * Use when API returns 404 but slug is valid – keeps SEO URL, no retry.
 */
export function parsedSlugToLocationData(parsed: ParsedLocationSlug): {
  slug: string;
  name: string;
  city?: string;
  state?: string;
  neighbourhood?: undefined;
  latitude?: undefined;
  longitude?: undefined;
} {
  return {
    slug: parsed.slug,
    name: parsed.name,
    city: parsed.city || undefined,
    state: parsed.state ?? undefined,
    neighbourhood: undefined,
    latitude: undefined,
    longitude: undefined,
  };
}
