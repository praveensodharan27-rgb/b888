/**
 * SSR-safe API layer for ads.
 * - Uses try/catch
 * - Returns null on 404/error
 * - Never throws
 */

import { cache } from 'react';
import { getApiUrl } from './seo';

export async function fetchAdById(id: string): Promise<Record<string, unknown> | null> {
  const apiUrl = getApiUrl();
  try {
    const res = await fetch(`${apiUrl}/ads/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ad ?? null;
  } catch {
    return null;
  }
}

/** Cached to prevent double API calls between generateMetadata and page */
export const getAd = cache(fetchAdById);
