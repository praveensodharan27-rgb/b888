# Ad URL workflow (SEO path)

## Target URL structure

- **SEO path:** `/{stateSlug}/{citySlug}/{categorySlug}/{adSlug}`
- Example: `/kerala/ernakulam/mobiles/iphone-12-pro-64gb`

## Flow

1. **Backend**
   - `GET /api/ads/by-path/:stateSlug/:citySlug/:categorySlug/:slug` → returns ad (indexed lookup when backfill done).
   - Ads have `slug`, `stateSlug`, `citySlug`, `categorySlug` (backfill script sets them).
   - Single ad: `GET /api/ads/:id` returns ad with `state`, `city`, `category.slug`, `slug` (used for redirect and links).

2. **Frontend routes**
   - **`/ads/[id]`** – Fetches ad by id. If ad has `state`, `city`, `category.slug` → **301 redirect** to `/{stateSlug}/{citySlug}/{categorySlug}/{slug}`.
   - **`/[categorySlug]/[subcategorySlug]/[productSlug]/[businessSlug]`** – 4 segments. Treated as **state/city/category/slug** when first segment is a state (e.g. kerala). Tries directory business first, then **getAdByPath(first, second, third, fourth)** for marketplace ad → renders **AdDetailByPath**.

3. **Links to ads**
   - Listing/cards: use **SEO URL** when ad has path slugs (`stateSlug`, `citySlug`, `categorySlug`, `slug`), else fallback to `/ads/{id}`.
   - So from listing, user goes directly to `/kerala/ernakulam/mobiles/iphone-12` (no redirect).

## Why URL might not change

- **Redirect not happening:** Ad missing `state` or `city` (layout only redirects when both + category.slug exist). Ensure ads have state/city (from location or form).
- **Backfill not run:** Run `node scripts/backfill-ad-slugs.js` so ads get `slug`, `stateSlug`, `citySlug`, `categorySlug`. Then GET /ads/:id and list APIs should return them.
- **API response:** List/detail must include `slug`, `stateSlug`, `citySlug`, `categorySlug` (or at least `state`, `city`, `category.slug`) so frontend can build the SEO link or redirect.

## Checklist

- [ ] `prisma db push` applied (indexes + Ad.stateSlug, citySlug, categorySlug).
- [ ] `node scripts/backfill-ad-slugs.js` run (all ads have slugs).
- [ ] Backend GET /ads/:id and list responses include `state`, `city`, `slug`, `category.slug` (and optionally stateSlug, citySlug, categorySlug).
- [ ] Frontend ad cards use SEO path when available (see `getAdUrl(ad)` in lib).
- [ ] Opening `/ads/:id` redirects 301 to `/{state}/{city}/{category}/{slug}` when ad has location.
