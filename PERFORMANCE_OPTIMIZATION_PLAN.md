# OLX-Style Marketplace — Performance Optimization Plan

**Target:** Lighthouse 90+, instant filter sidebar, sub-2s load for Indian users.  
**Stack:** Next.js 15, React 19, Node/Express, MongoDB (Prisma), Redis, Meilisearch.

---

## 1. Frontend Optimization Plan

### 1.1 Lazy Loading & Code Splitting

**Current:** Heavy components (Navbar, DynamicFilters, Modals) load upfront.

**Actions:**

1. **Dynamic import below-the-fold and modals**
   - Lazy load: Filter sidebar content, Login/Signup modals, Image gallery, Admin panel.
   - Use `next/dynamic` with `ssr: false` for client-only and `loading` for skeleton.

2. **Route-based code splitting**
   - Next.js already splits by route; keep pages thin. Move heavy UI into lazy components.

3. **Icon/library splitting**
   - Replace full `react-icons` import with path imports so only used icons are bundled.

**Example — Lazy Filter Sidebar (instant shell, content async):**

```tsx
// frontend/components/DynamicFiltersLazy.tsx
import dynamic from 'next/dynamic';

const DynamicFiltersContent = dynamic(
  () => import('@/components/DynamicFilters'),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    ),
  }
);

export default function DynamicFiltersLazy(props: any) {
  return <DynamicFiltersContent {...props} />;
}
```

**Example — Icons (reduce bundle):**

```tsx
// Before (pulls all icons)
import { FiChevronDown, FiFilter } from 'react-icons/fi';

// After (only these icons)
import FiChevronDown from 'react-icons/fi/FiChevronDown';
import FiFilter from 'react-icons/fi/FiFilter';
```

**Example — Ads page: load sidebar first, then grid**

```tsx
// app/ads/page.tsx — wrap sidebar in dynamic
const DynamicFilters = dynamic(() => import('@/components/DynamicFilters'), {
  ssr: false,
  loading: () => <FilterSidebarSkeleton />,
});
```

---

### 1.2 Caching (React Query + HTTP)

**Goals:** Filter config and categories load once; list data cached per query.

**React Query (frontend):**

```ts
// frontend/lib/queryClient.ts — production defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min
      gcTime: 30 * 60 * 1000,        // 30 min (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

**Filter sidebar — long cache (static-ish):**

```ts
// In DynamicFilters or useFilterConfig hook
useQuery({
  queryKey: ['filter-configurations', categorySlug, subcategorySlug],
  queryFn: fetchFilterConfig,
  staleTime: 30 * 60 * 1000,   // 30 min
  gcTime: 60 * 60 * 1000,      // 1 hr
});
```

**Categories / locations (Navbar):**

```ts
useQuery({
  queryKey: ['categories'],
  staleTime: 15 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
});

useQuery({
  queryKey: ['locations', 'states'],
  staleTime: 30 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
});
```

**Preload critical data in layout:**

```tsx
// app/ads/layout.tsx (optional)
export default function AdsLayout({ children }) {
  const queryClient = useQueryClient();
  queryClient.prefetchQuery({ queryKey: ['filter-configurations'] });
  queryClient.prefetchQuery({ queryKey: ['categories'] });
  return children;
}
```

---

### 1.3 SSR/ISR for Speed & SEO

**Use SSR/ISR for:**
- Home page (trending/featured ads)
- Category landing pages (e.g. `/mobiles`)
- Ad detail page (e.g. `/ads/[id]`)

**Keep client-only:**
- Listing page with filters (e.g. `/ads?category=mobiles`)
- User dashboard, post-ad, search results (dynamic)

**Example — Category page with ISR:**

```tsx
// app/[categorySlug]/page.tsx
export const revalidate = 300; // ISR: revalidate every 5 min

export default async function CategoryPage({ params }) {
  const slug = params.categorySlug;
  const category = await getCategoryBySlug(slug); // server fetch
  const initialAds = await getAdsByCategory(slug, { limit: 12 });
  return (
    <CategoryPageClient
      initialData={{ category, ads: initialAds }}
      categorySlug={slug}
    />
  );
}
```

**Example — Ad detail SSR:**

```tsx
// app/ads/[id]/page.tsx
export const revalidate = 60;

export default async function AdPage({ params }) {
  const ad = await getAdById(params.id);
  if (!ad) notFound();
  return <AdDetailClient initialAd={ad} />;
}
```

---

### 1.4 Make Filter Sidebar “Instant”

1. **Show UI immediately with skeleton**
   - Render filter sidebar shell + skeleton (see DynamicFiltersLazy above).
2. **Preload filter config**
   - Prefetch `filter-configurations` and `categories` in layout or on hover.
3. **Hydrate from cache**
   - Use React Query so second visit is instant from cache.
4. **Avoid blocking**
   - Don’t await filter config before rendering the rest of the page; use Suspense or lazy content.

**Example — Suspense boundary for filters:**

```tsx
// In listing layout
<Suspense fallback={<FilterSidebarSkeleton />}>
  <DynamicFilters ... />
</Suspense>
```

---

### 1.5 Image Optimization

**Already in place:** Next.js `images` with AVIF/WebP, `remotePatterns` for uploads.

**Add:**

1. **Priority for LCP image (hero/first ad)**
   ```tsx
   <Image src="..." priority alt="..." />
   ```
2. **Sizes for ad thumbnails**
   ```tsx
   <Image
     src={ad.images[0]}
     width={320}
     height={240}
     sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
     alt={ad.title}
   />
   ```
3. **Blur placeholder for list images**
   ```tsx
   <Image
     src={url}
     placeholder="blur"
     blurDataURL={tinyBlurUrlOrStatic}
     ...
   />
   ```

---

### 1.6 Next.js Config (Production)

```js
// next.config.js — add/keep
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    // ... existing remotePatterns
  },
  // Production: enable package optimizations
  experimental: {
    optimizePackageImports: ['react-icons'], // tree-shake icons
  },
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};
```

---

## 2. Backend Optimization Plan

### 2.1 Redis Cache (You Already Have It)

**Fix TTL units:** `cacheMiddleware(10 * 60 * 1000)` is wrong if the middleware expects **seconds**. Use seconds:

```js
// backend/middleware/cache.js — ensure TTL is in seconds
cacheMiddleware(10 * 60)   // 10 min
cacheMiddleware(30 * 60)   // 30 min for categories/locations
```

**Cache hot routes:**

| Route                     | TTL (sec) | Notes                    |
|---------------------------|-----------|--------------------------|
| GET /categories           | 600       | 10 min                   |
| GET /locations/states     | 600       | 10 min                   |
| GET /locations/states/:state/cities | 600 | 10 min            |
| GET /filter-configurations| 600       | 10 min                   |
| GET /ads (list)           | 60–120    | 1–2 min, invalidate on new ad |

**Example — cache layer with Redis:**

```js
// backend/routes/locations.js — ensure Redis is used
router.get('/states',
  cacheMiddleware(10 * 60),  // 600 seconds
  async (req, res) => { ... }
);
```

---

### 2.2 Locations /states Optimization (Fixes Timeout)

**Problem:** `/locations/states` does `findMany` on all locations then deduplicates in Node → slow on large DB.

**Fix 1 — Distinct in DB (MongoDB aggregation):**

```js
// backend/routes/locations.js — replace /states handler
router.get('/states', cacheMiddleware(10 * 60), async (req, res) => {
  try {
    const result = await prisma.location.aggregateRaw({
      pipeline: [
        { $match: { isActive: true, state: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$state' } },
        { $sort: { _id: 1 } },
        { $project: { state: '$_id', _id: 0 } },
      ],
    });
    const states = (result || []).map((r) => r.state).filter(Boolean);
    res.json({ success: true, states });
  } catch (error) {
    console.error('Get states error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch states' });
  }
});
```

**Fix 2 — If aggregation is not used, at least limit fields and add index:**

```js
// Only select state, use index
const locations = await prisma.location.findMany({
  where: { isActive: true, state: { not: null } },
  select: { state: true },
  take: 10000, // safety cap
});
```

**Schema index (already have similar):**

```prisma
// prisma/schema.mongodb.prisma — Location model
@@index([isActive, state])
@@index([state, city])
```

---

### 2.3 Ads List Query Optimization

**Indexes (you already have good ones):**

- `status`, `createdAt`, `categoryId`, `locationId`, `expiresAt`, `city`, `state`

**Add compound index for common filter:**

```prisma
// Ad model
@@index([status, expiresAt, categoryId, createdAt])
@@index([status, expiresAt, locationId, createdAt])
@@index([status, expiresAt, city, createdAt])
```

**Pagination:** Use cursor-based for deep pages (e.g. `createdAt` + `id`).

**Example — cursor-based next page:**

```js
// backend: accept cursor and limit
const { cursor, limit = 20, category, ... } = req.query;
const where = { status: 'APPROVED', ... };
const take = Math.min(parseInt(limit, 10) || 20, 50);
const query = {
  where,
  take: take + 1,
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
};
if (cursor) {
  const [createdAt, id] = cursor.split(',');
  query.cursor = { createdAt_id: new Date(createdAt), id };
  query.skip = 1;
}
const ads = await prisma.ad.findMany(query);
const hasMore = ads.length > take;
const nextCursor = hasMore ? `${ads[take-1].createdAt},${ads[take-1].id}` : null;
res.json({ ads: ads.slice(0, take), nextCursor, hasMore });
```

---

### 2.4 Filter-Config and Categories

- **filter-configurations:** Already returns common filters; ensure Redis cache is applied and TTL in seconds.
- **categories:** Cache 10–15 min; single query with `include: { subcategories: true }` and proper index.

---

## 3. Network / CDN Setup

### 3.1 Cloudflare (Recommended for India)

1. Add site to Cloudflare (DNS + proxy).
2. **Caching:**
   - Page rules or Cache Rules: cache static assets (`/_next/static/*`, `/images/*`) for 1 year.
   - API: do **not** cache `POST`/auth; optionally cache `GET /api/categories`, `GET /api/locations/states` with short TTL (e.g. 10 min) via Cache API or Worker.
3. **Indian users:**
   - Use “Argo Smart Routing” or similar for better routing.
   - Consider “Regional Tiered Cache” if available.
4. **Compression:** Enable Brotli (and gzip) in Cloudflare.
5. **Headers:** Cloudflare can add security headers; keep your Next.js `async headers()` for Cache-Control on `/_next/static` and images.

### 3.2 Compression (Backend)

You have `compression` in Express. Ensure it’s applied before routes:

```js
// backend/src/server.js
const compression = require('compression');
app.use(compression());
```

### 3.3 Response Headers (Backend API)

```js
// For cacheable GET responses
res.set({
  'Cache-Control': 'public, max-age=600', // 10 min
  'Vary': 'Accept-Encoding',
});
```

---

## 4. Database Tuning (MongoDB)

### 4.1 Indexes (Prisma)

Already defined; ensure created:

```bash
cd backend && npx prisma db push   # or migrate
```

**Suggested extra for listing + filters:**

```prisma
// Ad
@@index([status, categoryId, createdAt(sort: Desc)])
@@index([status, locationId, createdAt(sort: Desc)])
@@index([status, city, createdAt(sort: Desc)])
@@index([status, expiresAt, createdAt(sort: Desc)])
```

### 4.2 Search / Filter

- **Full-text search:** Use Meilisearch (you have it); keep DB for exact filters (category, location, price, condition).
- **Heavy filters:** Prefer indexed fields (categoryId, locationId, city, state) over JSON `attributes` when possible; add compound indexes for common filter combos.

### 4.3 Connection Pooling

MongoDB Atlas or self-hosted: use default connection pool; tune pool size if you see connection exhaustion under load.

---

## 5. Step-by-Step Action Plan

### Phase 1 — Quick wins (1–2 days)

1. **Backend:** Fix `/locations/states` (aggregation or indexed select + cap) and fix cache TTL to seconds.
2. **Backend:** Ensure Redis is used for `GET /categories`, `GET /locations/states`, `GET /filter-configurations`.
3. **Frontend:** Increase React Query `staleTime` for categories, locations, filter-config (e.g. 15–30 min).
4. **Frontend:** Lazy load `DynamicFilters` and Login/Signup modals with skeleton.
5. **Frontend:** Use `priority` for LCP image and `sizes` on ad thumbnails.

### Phase 2 — Caching & UX (2–3 days)

6. **Frontend:** Prefetch filter-config and categories in layout or on route prefetch.
7. **Frontend:** Filter sidebar: show skeleton immediately; hydrate from cache when ready.
8. **Backend:** Add/verify compound indexes on Ad for status + category/location/city + createdAt.
9. **Next.js:** Add `optimizePackageImports: ['react-icons']` (and fix any dev-only issues).
10. **Headers:** Ensure Cache-Control on `/_next/static` and images (you already have some).

### Phase 3 — SSR/ISR & CDN (3–5 days)

11. **Next.js:** Implement ISR for category landing and ad detail pages (revalidate 60–300s).
12. **Cloudflare:** Add site, enable Brotli, cache static assets, optional cache for public GET APIs.
13. **Backend:** Cursor-based pagination for ads list (optional but better for deep pages).
14. **Lighthouse:** Measure (Performance, LCP, TBT, CLS); fix remaining bottlenecks (fonts, third-party, images).

### Phase 4 — Scale (ongoing)

15. **DB:** Monitor slow queries; add indexes per real usage.
16. **Redis:** Use for session/store if not already; consider Redis for hot listing cache keys.
17. **APIs:** Rate limiting, timeouts, and timeouts per route (e.g. 60s for locations) already improved on frontend.

---

## 6. Example Snippets Summary

| Area              | Snippet / change |
|-------------------|-------------------|
| Lazy filter       | `dynamic(() => import('@/components/DynamicFilters'), { ssr: false, loading: Skeleton })` |
| React Query cache | `staleTime: 30*60*1000`, `gcTime: 60*60*1000` for filter-config, categories, states |
| Locations /states | Use `aggregateRaw` for distinct states or `select: { state: true }` + index |
| Cache TTL         | `cacheMiddleware(10*60)` (seconds, not ms) |
| ISR category      | `export const revalidate = 300` + server fetch in category page |
| Images            | `priority` for LCP, `sizes` for thumbnails, `placeholder="blur"` |
| Cloudflare        | Proxy + cache static + Brotli + optional API cache rules |

---

**Note:** Your app uses **MongoDB** (Prisma) rather than PostgreSQL. Index and query advice above is for MongoDB. If you add PostgreSQL later, equivalent B-tree indexes and connection pooling (e.g. PgBouncer) would apply.

Implementing Phase 1 and 2 will already improve load time and make the filter sidebar feel instant; Phases 3–4 will push toward Lighthouse 90+ and scale for Indian traffic.
