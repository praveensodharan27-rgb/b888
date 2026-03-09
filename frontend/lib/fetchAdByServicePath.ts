/**
 * Fetch ad by JustDial-style path (server-side). For /:city/services/:category/:slug
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_BASE = API_URL.replace(/\/+$/, '').endsWith('/api') ? API_URL.replace(/\/+$/, '') : `${API_URL.replace(/\/+$/, '')}/api`;

export async function fetchAdByServicePath(
  locationSlug: string,
  categorySlug: string,
  slug: string
): Promise<{ id: string; [key: string]: unknown } | null> {
  const loc = encodeURIComponent(locationSlug.trim().toLowerCase());
  const cat = encodeURIComponent(categorySlug.trim().toLowerCase());
  const sl = encodeURIComponent(slug.trim().toLowerCase());
  if (!loc || !cat || !sl) return null;
  try {
    const res = await fetch(
      `${API_BASE}/ads/by-service-path/${loc}/${cat}/${sl}`,
      { next: { revalidate: 60 }, headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.success && data?.ad ? data.ad : null;
  } catch {
    return null;
  }
}
