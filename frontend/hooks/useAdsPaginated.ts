import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface AdsFilters {
  page?: number;
  limit?: number;
  category?: string;
  subcategory?: string;
  location?: string;
  city?: string;
  state?: string;
  latitude?: string;
  longitude?: string;
  radius?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  search?: string;
  condition?: string;
  sort?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped';
  postedTime?: string;
  brand?: string;
  model?: string;
  [key: string]: string | number | undefined;
}

/** Build a stable key from filter values so same filters => same key (avoids 429 from object reference changes) */
function getStableFilterKey(filters: AdsFilters): string {
  const o: Record<string, string | number> = {};
  const keys = Object.keys(filters).filter(
    (k) => filters[k] !== undefined && filters[k] !== null && filters[k] !== ''
  );
  keys.sort();
  for (const k of keys) {
    const v = filters[k];
    if (Array.isArray(v)) o[k] = v.join(',');
    else if (typeof v === 'object' && v !== null) continue;
    else o[k] = v as string | number;
  }
  return JSON.stringify(o);
}

/**
 * Paginated ads hook - fetches a single page for traditional pagination UI.
 * Uses a stable query key from filter values so API is called only when filters actually change.
 */
export function useAdsPaginated(filters: AdsFilters = {}, options?: { enabled?: boolean }) {
  const filterKey = getStableFilterKey(filters);
  return useQuery({
    queryKey: ['ads', 'paginated', filterKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && key !== 'limit') {
          if (key === 'priceMin') {
            params.append('minPrice', String(value));
            return;
          }
          if (key === 'priceMax') {
            params.append('maxPrice', String(value));
            return;
          }
          if (Array.isArray(value)) {
            value.forEach(v => {
              if (v !== undefined && v !== null && v !== '') params.append(key, String(v));
            });
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // skip complex objects
          } else {
            params.append(key, String(value));
          }
        }
      });
      params.set('page', String(filters.page || 1));
      params.set('limit', String(filters.limit || 20));

      // Build sponsored-ads query based on current filters (location + category)
      const sponsoredParams: Record<string, string> = { size: 'auto' };
      if (filters.location) sponsoredParams.location = String(filters.location);
      if (filters.city) sponsoredParams.city = String(filters.city);
      if (filters.state) sponsoredParams.state = String(filters.state);
      if (filters.latitude) sponsoredParams.latitude = String(filters.latitude);
      if (filters.longitude) sponsoredParams.longitude = String(filters.longitude);
      // Prefer subcategory slug for more specific targeting; fallback to category
      if (filters.subcategory || filters.category) {
        sponsoredParams.category = String(filters.subcategory || filters.category);
      }

      const [adsRes, sponsoredRes] = await Promise.all([
        api.get(`/ads?${params.toString()}`),
        api.get('/sponsored-ads', { params: sponsoredParams }).catch(() => null),
      ]);

      const data = adsRes.data || { ads: [] };
      const baseAds: any[] = Array.isArray(data.ads) ? data.ads : [];

      const sponsoredPayload = sponsoredRes?.data;
      const sponsored =
        sponsoredPayload?.ad || (Array.isArray(sponsoredPayload?.ads) ? sponsoredPayload.ads[0] : null);

      if (!sponsored) {
        return data;
      }

      // Mark as sponsored so UI can distinguish
      const sponsoredTagged = { ...sponsored, _type: 'sponsored' as const };

      const injected: any[] = [];
      const everyN = 5;
      baseAds.forEach((ad, index) => {
        injected.push(ad);
        if ((index + 1) % everyN === 0) {
          injected.push(sponsoredTagged);
        }
      });

      return { ...data, ads: injected };
    },
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Keep previous page of ads visible while new filters load,
    // so radio/filter changes feel smooth with no blank flash.
    keepPreviousData: true,
    placeholderData: (prev) => prev,
    retry: 1,
  });
}
