# SEO Implementation Guide

Step-by-step reference for the SEO changes implemented in this project.

---

## PRIORITY 1

### 1. Dynamic metadata for `/ads/[id]`

**File:** `app/ads/[id]/layout.tsx`

**What it does:** A **server layout** wraps the existing client page. It fetches the ad by `id` on the server and exports `generateMetadata()` so every ad gets a unique title, meta description, Open Graph, Twitter card, and canonical URL. The client `page.tsx` is unchanged and still fetches the ad for the UI.

**Important details:**
- `params` is a **Promise** in Next.js 15: always `await params`.
- OG image uses the first ad image; if relative (e.g. `/uploads/...`), it’s turned into an absolute URL using the API origin.
- If the ad is not found, the layout calls `notFound()` so the app’s 404 is shown.

**Common mistakes:**
- Using `params.id` without `await params` (Next 15).
- Forgetting to build absolute URLs for OG images (crawlers need full URLs).
- Putting `generateMetadata` in the client `page.tsx` (it only runs on the server).

**Verify:**
1. Open any ad: `http://localhost:3000/ads/<id>`.
2. View page source (Ctrl+U): `<title>` and `<meta name="description">` should match the ad.
3. Check `<link rel="canonical">` and OG meta tags.

---

### 2. `NEXT_PUBLIC_BASE_URL` and central SEO config

**Files:**
- `lib/seo.ts` – `getBaseUrl()`, `getApiUrl()`, `getApiBaseOrigin()`.
- `.env.example` – documents `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_API_URL`.

**What it does:** All metadata, sitemap, robots, and JSON-LD use `getBaseUrl()` so the production domain is consistent. In production, set `NEXT_PUBLIC_BASE_URL=https://yourdomain.com` (no trailing slash).

**Common mistakes:**
- Setting `NEXT_PUBLIC_BASE_URL` with a trailing slash (we trim it in `lib/seo.ts`).
- Forgetting to set it in production and leaving default localhost in sitemap/OG.

**Verify:**
- After setting in `.env.local`, run build and check `robots.txt` and sitemap XML for the correct domain.

---

## PRIORITY 2

### 3. Structured data (JSON-LD)

**Files:**
- `components/seo/JsonLdSite.tsx` – **WebSite** + **Organization** (used in root layout).
- `app/ads/[id]/layout.tsx` – **Product** (with **Offer**) + **BreadcrumbList** for each ad.

**What it does:** Injects `<script type="application/ld+json">` so Google can read site and ad info for rich results (e.g. product snippets, sitelinks).

**Common mistakes:**
- Invalid JSON (e.g. trailing commas, undefined in JSON.stringify). We only pass plain objects.
- Wrong `priceCurrency` (we use `INR`).

**Verify:**
1. Open homepage and an ad page, view source, search for `application/ld+json`.
2. Copy the JSON into [Google Rich Results Test](https://search.google.com/test/rich-results) or [Schema.org Validator](https://validator.schema.org/).

---

## PRIORITY 3

### 4. Sitemap: `/ads` and recent `/ads/[id]`

**File:** `app/sitemap.xml/route.ts`

**What it does:**
- Uses `getBaseUrl()` and `getApiUrl()` from `lib/seo.ts`.
- Adds a single URL for `/ads`.
- Fetches recent ads from `GET /ads?page=1&limit=100&sort=newest` (up to 2000 URLs) and adds `/ads/<id>` with `changefreq=weekly`, `priority=0.7`, and `lastmod` from `updatedAt` when present.

**Common mistakes:**
- Sitemap size: we cap at 2000 ad URLs to keep the file small. Increase in code if needed.
- API not returning `ads` array: we use `data?.ads ?? data?.data`.

**Verify:**
- Open `http://localhost:3000/sitemap.xml` and confirm `/ads` and multiple `/ads/<id>` entries with correct base URL.

---

### 5. Breadcrumb schema

**File:** `app/ads/[id]/layout.tsx` (same as P1/P2) – `buildBreadcrumbJsonLd()` and the second JSON-LD script.

**What it does:** Outputs BreadcrumbList: Home → Ads → [Ad title] so search can show breadcrumbs.

**Verify:** View source on an ad page and validate the BreadcrumbList block in Rich Results Test.

---

## PRIORITY 4: Dev → Production SEO switch

**Files:**
- `app/layout.tsx` – `robots: isDev ? 'noindex, nofollow' : 'index, follow'` (using `getBaseUrl()`).
- `app/robots.ts` – In production and when `NEXT_PUBLIC_SEO_INDEXABLE !== 'false'`: allow crawling, sitemap URL, and disallow `/admin/`, `/api/`, `/auth/callback`. Otherwise: `Disallow: /`.

**What it does:**
- **Development:** `NODE_ENV=development` → noindex meta and robots.txt disallow. Staging can keep indexing off by setting `NEXT_PUBLIC_SEO_INDEXABLE=false` even if `NODE_ENV=production`.
- **Production:** Set `NODE_ENV=production` and `NEXT_PUBLIC_BASE_URL=https://yourdomain.com`. No noindex; robots allow; sitemap linked in robots.txt.

**Checklist for go-live:**
1. Set `NEXT_PUBLIC_BASE_URL` to production domain.
2. Ensure production build runs with `NODE_ENV=production`.
3. (Optional) On staging, set `NEXT_PUBLIC_SEO_INDEXABLE=false` to keep noindex.
4. After deploy, open `https://yourdomain.com/robots.txt` and `https://yourdomain.com/sitemap.xml` and confirm URLs.

---

## Env variables summary

| Variable | Required | Example | Used for |
|----------|----------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:5000/api` | Fetching ads (metadata, sitemap). |
| `NEXT_PUBLIC_BASE_URL` | Production | `https://yoursite.com` | Sitemap, canonicals, OG, robots, JSON-LD. |
| `NEXT_PUBLIC_SEO_INDEXABLE` | Optional | `false` on staging | When `false`, robots disallow even in production build. |

---

## Quick verification checklist

- [ ] Homepage: view source → WebSite + Organization JSON-LD present.
- [ ] Any `/ads/[id]`: view source → unique title, description, canonical, OG, Product + BreadcrumbList JSON-LD.
- [ ] `/robots.txt`: in dev shows Disallow; in prod shows Allow + Sitemap.
- [ ] `/sitemap.xml`: contains `/`, `/ads`, and many `/ads/<id>` with correct base URL.
- [ ] Production: set `NEXT_PUBLIC_BASE_URL`, rebuild, and re-check robots + sitemap + one ad page source.
