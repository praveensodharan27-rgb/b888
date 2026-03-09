# Ad path resolution system

## Summary

- **ID URL** (`/ads/:id`): If ad has location + category → **301 redirect** to SEO URL. Otherwise show ad at `/ads/:id`.
- **SEO path** (`/:state/:city/:category/:slug`): Resolve **directory business first**, then **ad-by-path API**; show ad with **no redirect**.
- **Slug fields** are **auto-generated** on ad create/update.
- **All ad links** use `getAdUrl(ad)` so they point to the SEO path when possible.
- **Meta & canonical**: ID route uses SEO URL as canonical when applicable; path route uses current path as canonical.

---

## 1. ID URL → 301 to SEO URL

**File:** `frontend/app/ads/[id]/layout.tsx`

- On load, fetch ad by id.
- If ad has `state`, `city`, and `category.slug`:
  - Build SEO path: `dirPath(stateSlug, citySlug, category.slug, adSlug)`.
  - **301 redirect** to that path.
- If not (e.g. no location), render the ad at `/ads/:id` (no redirect).

**Canonical in metadata:** When ad has location + category, `generateMetadata` sets `alternates.canonical` to the SEO URL so crawlers see the preferred URL even when hitting `/ads/:id`.

---

## 2. SEO path resolution (no redirect)

**File:** `frontend/app/[categorySlug]/[subcategorySlug]/[productSlug]/[businessSlug]/page.tsx`

- URL = `/:first/:second/:third/:fourth` (e.g. `/kerala/ernakulam/mobiles/iphone-12`).
- **Step 1:** Treat first segment as state → `getStateBySlug(first)`. If no state, `notFound()`.
- **Step 2:** Try **directory business**: `getBusinessBySlug(first, second, third, fourth)`.
  - If found → render directory business page.
- **Step 3:** If no business, optionally check **slug redirect** (`getRedirectForPath`); if redirect target exists → 301.
- **Step 4:** Try **marketplace ad**: `getAdByPath(first, second, third, fourth)` (calls `GET /api/ads/by-path/:stateSlug/:citySlug/:categorySlug/:slug`).
  - If found → render `AdDetailByPath` (no redirect).
- **Step 5:** If neither → `notFound()`.

---

## 3. Slug auto-generation (backend)

**Create:** `backend/src/application/services/AdService.js` (createAd)

- After `adRepository.create()`, compute `slug`, `stateSlug`, `citySlug`, `categorySlug` via `computeAdSlugFields(ad, { appendIdForUniqueness: true })`.
- Slug = `slugify(title)` + `-` + last 6 chars of id.
- State/city from `ad.state`, `ad.city`, or `ad.location` (enrichment already fills from location).
- Then `adRepository.update(ad.id, slugFields)` and attach to returned ad.

**Update:** `backend/src/application/services/AdService.js` (updateAd)

- After first `adRepository.update(adId, adData)`, build merged ad (existing + adData + relations).
- `slugFields = computeAdSlugFields(merged)` and `adRepository.update(adId, slugFields)`.
- Return the result of the second update.

**Helper:** `backend/utils/adSeo.js` – `computeAdSlugFields(ad, options)`.

---

## 4. All ad links use SEO URL when possible

**Helper:** `frontend/lib/directory.ts` – `getAdUrl(ad)`.

- If ad has `stateSlug`, `citySlug`, `categorySlug`, `slug` (or derivable from state, city, category, title) → return `dirPath(stateSlug, citySlug, categorySlug, adSlug)`.
- Else return `/ads/${ad.id}`.

**Replaced** all `href={/ads/${ad.id}}` / `router.push(/ads/${id})` with `getAdUrl(ad)` in:

- AdCardOLX, AdCardOGNOX, AdCard, MyAdsAdCard
- User profile ads, chat (View Listing), compare, contact-requests
- Admin: AdminAds, reports, moderation, orders
- Orders page (View Details)

---

## 5. Dynamic meta + canonical

- **`/ads/[id]`:** `generateMetadata` sets `title`, `description`, `openGraph`, `twitter`, `alternates.canonical`. Canonical = SEO URL when ad has location + category, else `/ads/:id`.
- **`/:state/:city/:category/:slug` (ad):** `generateMetadata` in the 4-segment page sets title, description, openGraph, twitter, and `alternates.canonical` = `dirUrl(first, second, third, fourth)` for the marketplace ad case.

---

## Backend by-path API

- **GET** `/api/ads/by-path/:stateSlug/:citySlug/:categorySlug/:slug`
- Uses indexed lookup on `stateSlug`, `citySlug`, `categorySlug`, `slug` when backfilled; fallback by categoryId + state/city + slug.
- Returns full ad with user, category, subcategory, location for `AdDetailByPath`.
