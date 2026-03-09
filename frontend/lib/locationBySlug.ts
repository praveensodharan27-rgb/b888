/**
 * Fetch location by slug (for server components). Used by JustDial-style /:city/services pages.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = API_URL.replace(/\/+$/, '').endsWith('/api') ? API_URL.replace(/\/+$/, '') : `${API_URL.replace(/\/+$/, '')}/api`;

export interface LocationInfo {
  id: string;
  name: string;
  slug: string;
  state?: string | null;
  city?: string | null;
  neighbourhood?: string | null;
}

export async function getLocationBySlug(slug: string): Promise<LocationInfo | null> {
  const safeSlug = slug.trim().toLowerCase();
  if (!safeSlug || safeSlug === 'india' || safeSlug === 'all-india') return null;
  try {
    const res = await fetch(`${API_BASE}/locations/${encodeURIComponent(safeSlug)}`, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.location ?? null;
  } catch {
    return null;
  }
}
