/**
 * India Business Directory – API helpers and SEO URL builder.
 * Production-ready: strict URL structure, slug system, redirects.
 */

import { getBaseUrl, getApiUrl } from './seo';

const API = getApiUrl();
const BASE = getBaseUrl();

/** Slug max length (state, city, category, business). */
export const SLUG_MAX_LENGTH = 70;

export function directoryApi(path: string, options?: RequestInit) {
  return fetch(`${API}/directory${path}`, {
    ...options,
    next: options?.next ?? { revalidate: 300 },
  });
}

export async function getStates() {
  const res = await directoryApi('/states');
  if (!res.ok) return { success: false, states: [] };
  const data = await res.json();
  return data;
}

export async function getStateBySlug(stateSlug: string) {
  try {
    const res = await directoryApi(`/states/${encodeURIComponent(stateSlug.toLowerCase())}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.state : null;
  } catch {
    return null;
  }
}

export async function getCitiesByState(stateSlug: string) {
  const res = await directoryApi(`/states/${encodeURIComponent(stateSlug.toLowerCase())}/cities`);
  if (!res.ok) return { success: false, cities: [] };
  return res.json();
}

export async function getCityBySlug(stateSlug: string, citySlug: string) {
  const res = await directoryApi(
    `/cities/${encodeURIComponent(stateSlug.toLowerCase())}/${encodeURIComponent(citySlug.toLowerCase())}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.success ? data.city : null;
}

export async function getCategories() {
  const res = await directoryApi('/categories');
  if (!res.ok) return { success: false, categories: [] };
  return res.json();
}

export async function getBusinesses(params: {
  stateSlug?: string;
  citySlug?: string;
  categorySlug?: string;
  page?: number;
  limit?: number;
  sort?: string;
}) {
  const q = new URLSearchParams();
  if (params.stateSlug) q.set('stateSlug', params.stateSlug);
  if (params.citySlug) q.set('citySlug', params.citySlug);
  if (params.categorySlug) q.set('categorySlug', params.categorySlug);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.sort) q.set('sort', params.sort);
  const res = await directoryApi(`/businesses?${q.toString()}`);
  if (!res.ok) return { success: false, businesses: [], pagination: { page: 1, pages: 0, total: 0 } };
  return res.json();
}

export async function getBusinessBySlug(
  stateSlug: string,
  citySlug: string,
  categorySlug: string,
  businessSlug: string
) {
  try {
    const res = await directoryApi(
      `/business/${encodeURIComponent(stateSlug.toLowerCase())}/${encodeURIComponent(citySlug.toLowerCase())}/${encodeURIComponent(categorySlug.toLowerCase())}/${encodeURIComponent(businessSlug.toLowerCase())}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.business : null;
  } catch {
    return null;
  }
}

export async function getBlogPosts(page = 1, limit = 12) {
  const res = await directoryApi(`/blog?page=${page}&limit=${limit}`);
  if (!res.ok) return { success: false, posts: [], pagination: { page: 1, pages: 0, total: 0 } };
  return res.json();
}

export async function getBlogPostBySlug(slug: string) {
  const res = await directoryApi(`/blog/${encodeURIComponent(slug.toLowerCase())}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.success ? data.post : null;
}

/** Check for 301 redirect when slug was updated. Returns new path (with leading /) or null. */
export async function getRedirectForPath(path: string): Promise<string | null> {
  try {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const res = await directoryApi(`/redirect?path=${encodeURIComponent(normalized)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.success && data.toPath ? data.toPath : null;
  } catch {
    return null;
  }
}

/** Fetch marketplace ad by SEO path: /{state}/{city}/{category}/{slug}. Uses main API, not directory. */
export async function getAdByPath(
  stateSlug: string,
  citySlug: string,
  categorySlug: string,
  slug: string
): Promise<{ id: string; [key: string]: unknown } | null> {
  const base = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
    ? String(process.env.NEXT_PUBLIC_API_URL).replace(/\/+$/, '')
    : 'http://148.230.67.118:5000';
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;
  const url = `${apiBase}/ads/by-path/${encodeURIComponent(stateSlug)}/${encodeURIComponent(citySlug)}/${encodeURIComponent(categorySlug)}/${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 }, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.success && data?.ad ? data.ad : null;
  } catch {
    return null;
  }
}

/** Root-level directory URL: /{state}, /{state}/{city}, etc. No /in prefix. Lowercase, hyphens. */
export function dirUrl(...segments: string[]): string {
  const path = dirPath(...segments);
  return path ? `${BASE}${path}` : BASE;
}

/** Path only (no origin): /state, /state/city, /state/city/category, etc. For Link href. */
export function dirPath(...segments: string[]): string {
  const normalized = segments.map((s) => normalizeSegment(s)).filter(Boolean);
  return normalized.length ? `/${normalized.join('/')}` : '';
}

/** Ad URL for listing/cards: SEO path when ad has location + category slugs, else /ads/:id. Place = state/city in URL. */
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

/** Normalize one URL segment: lowercase, spaces to hyphens, no special chars, no duplicate hyphens. */
export function normalizeSegment(segment: string): string {
  if (!segment || typeof segment !== 'string') return '';
  return segment
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slug from business name: lowercase, remove symbols, hyphens, max 70 chars. Duplicate handling is server-side. */
export function slugify(text: string, maxLength: number = SLUG_MAX_LENGTH): string {
  const raw = text
    .trim()
    .toLowerCase()
    .replace(/[&\-%$#@!*()+=[\]{}|;:'",.<>?/\\]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw.slice(0, maxLength).replace(/-+$/, '');
}
