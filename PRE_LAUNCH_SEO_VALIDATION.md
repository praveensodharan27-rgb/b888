# Final Pre-Launch SEO & Technical Validation

**Project:** SellIt Marketplace  
**Framework:** Next.js 15 (App Router)  
**Market:** India / Local Marketplace  
**Validation date:** February 2025  

**Fill in before go-live:**  
- **Live URL:** __________  
- **API URL:** __________  

---

## Executive Summary

| Risk score | **28 / 100** (lower = better) |
|------------|-------------------------------|
| **Go-live recommendation** | **CONDITIONAL GO** — Fix blocking items (env + build env), then launch. Remaining items are post-launch or non-blocking. |
| **Build status** | ✅ **PASS** — `npm run build` succeeds. |

---

## 1. Environment & Configuration

| Check | Status | Notes |
|-------|--------|--------|
| NEXT_PUBLIC_BASE_URL | ⚠️ **Config** | Not in repo (correct). **Must be set in production** to your live domain (e.g. `https://yoursite.com`). If missing, sitemap/OG/canonicals will use localhost. |
| NEXT_PUBLIC_API_URL | ⚠️ **Config** | Set in `.env.local` for dev. **Production:** set to live API (e.g. `https://api.yoursite.com/api` or same-origin). |
| Production secrets | ✅ **Pass** | No secrets in code. Firebase config in `lib/firebase.ts` is client-side (normal); consider moving to env for multi-environment. |
| .env.example accuracy | ✅ **Pass** | Documents `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_BASE_URL`. Add `NEXT_PUBLIC_SEO_INDEXABLE` if you use staging. |

**Blocking:** None if you set env at deploy.  
**Must-do:** Set `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_API_URL` in the **production build environment** (e.g. Vercel/Netlify env, or `env.production`). Next.js inlines these at **build time** for routes like sitemap.

---

## 2. Core SEO Setup

| Check | Status | Notes |
|-------|--------|--------|
| Dynamic metadata on key pages | ✅ **Pass** | `/ads/[id]` (layout), `/[categorySlug]`, `/[categorySlug]/[subcategorySlug]`, `/[categorySlug]/[subcategorySlug]/[productSlug]`, `/lists/[slug]`, `/category/[slug]` all use `generateMetadata` or metadata. |
| Unique titles/descriptions | ✅ **Pass** | Ad pages: title/description from ad. Category/product/list: from API or slug. Root layout provides site-wide default. |
| Canonical URLs | ✅ **Pass** | Set on category, subcategory, product slug, list slug, and **ad detail** (`/ads/[id]` layout). Uses `getBaseUrl()`. |
| Open Graph & Twitter cards | ✅ **Pass** | Root layout: OG + Twitter. Ad layout: OG + Twitter with ad title, description, image. |

**Blocking:** None.  
**Optional:** Add static metadata for `/ads` (e.g. "Browse all ads | SellIt") and `/` if you want a custom homepage meta (currently uses default).

---

## 3. Indexing & Crawl Control

| Check | Status | Notes |
|-------|--------|--------|
| robots.txt (dev vs prod) | ✅ **Pass** | `app/robots.ts`: dev or `NEXT_PUBLIC_SEO_INDEXABLE=false` → `Disallow: /`. Prod → `Allow: /`, `Disallow: /admin/`, `/api/`, `/auth/callback`, Sitemap + Host. |
| noindex removal in prod | ✅ **Pass** | Root layout: `robots: isDev ? 'noindex, nofollow' : 'index, follow'`. Production build gets `index, follow`. |
| Sitemap reference | ✅ **Pass** | robots.txt in production includes `Sitemap: {BASE_URL}/sitemap.xml`. |

**Blocking:** None. Ensure production build runs with `NODE_ENV=production` so `isDev` is false.

---

## 4. Sitemap & Discovery

| Check | Status | Notes |
|-------|--------|--------|
| /sitemap.xml availability | ✅ **Pass** | Route at `app/sitemap.xml/route.ts`; served at `/sitemap.xml`. |
| /ads and /ads/[id] included | ✅ **Pass** | Single entry for `/ads`. Up to 2000 recent ads from API with `/ads/{id}`, changefreq weekly, priority 0.7. |
| Correct base domain | ⚠️ **Build env** | Sitemap uses `getBaseUrl()`. **You must set `NEXT_PUBLIC_BASE_URL` when building for production** so `<loc>` URLs use your live domain. |

**Blocking:** Set `NEXT_PUBLIC_BASE_URL` before production build.  
**Verify after deploy:** Open `https://yourdomain.com/sitemap.xml` and confirm `<loc>` values use your domain.

---

## 5. Structured Data

| Check | Status | Notes |
|-------|--------|--------|
| WebSite + Organization | ✅ **Pass** | `components/seo/JsonLdSite.tsx` in root layout. Organization has @id, name, url, logo. WebSite has SearchAction. |
| Product + Offer | ✅ **Pass** | `app/ads/[id]/layout.tsx` outputs Product (name, description, image, url) and Offer (price, INR, InStock). |
| BreadcrumbList | ✅ **Pass** | Same ad layout: Home → Ads → [Ad title]. |
| Schema errors | ⚠️ **Minor** | `itemCondition` on Product uses `ad.condition` (e.g. "Like New") and appends "Condition"; values like "LikeNewCondition" are not valid Schema.org. Optional fix: map to valid terms (e.g. UsedCondition) or omit. Validate with [Rich Results Test](https://search.google.com/test/rich-results). |

**Blocking:** None.  
**Recommended:** Run Rich Results Test on homepage and one ad page after launch.

---

## 6. Performance & UX

| Check | Status | Notes |
|-------|--------|--------|
| Lighthouse SEO & Performance | 🔶 **Manual** | Run on **production URL** after deploy: Lighthouse in Chrome DevTools or PageSpeed Insights. Target: SEO 90+, Performance 70+. |
| Core Web Vitals | 🔶 **Manual** | Monitor in Search Console and/or CrUX after launch. Ensure LCP &lt; 2.5s, INP &lt; 200ms, CLS &lt; 0.1. |
| Mobile usability | 🔶 **Manual** | Test key flows on real devices; Lighthouse includes mobile audit. |

**Blocking:** None for code. Post-launch: run Lighthouse and fix any critical issues.

---

## 7. Security & Trust Signals

| Check | Status | Notes |
|-------|--------|--------|
| HTTPS | 🔶 **Deploy** | Enforce HTTPS at host/CDN. No hardcoded `http://` for production domain in SEO code; `getBaseUrl()` should be set to `https://`. |
| Mixed content | ✅ **Pass** | OG/canonicals use `getBaseUrl()`; images from API use `getApiBaseOrigin()`. Set production API to HTTPS to avoid mixed content. |
| Admin/API exposure | ✅ **Pass** | robots.txt disallows `/admin/` and `/api/`. Admin routes require auth; not linked from public SEO surface. |

**Blocking:** Ensure production uses HTTPS and API URL is HTTPS (or same-origin).

---

## 8. Analytics & Monitoring

| Check | Status | Notes |
|-------|--------|--------|
| Google Analytics | ⚠️ **Partial** | Firebase Analytics present (`lib/firebase.ts`, `initializeFirebase()`). No GA4 gtag/GTM found. For Search Console correlation and standard GA4, add GA4 property and gtag or GTM. |
| Search Console | 🔶 **Post-launch** | Add property for live URL, submit sitemap `https://yourdomain.com/sitemap.xml`, verify ownership. |
| Error tracking | 🔶 **Optional** | No Sentry/similar found. Consider adding for JS errors and failed API calls. |

**Blocking:** None.  
**Recommended:** Add GA4 (or confirm Firebase Analytics is enough); set up Search Console and submit sitemap in first week.

---

## 9. Content & Keyword Optimization

| Check | Status | Notes |
|-------|--------|--------|
| Primary/secondary keywords | ✅ **Pass** | Root metadata: "classifieds, buy, sell, marketplace, local". Category/product/ad titles and descriptions are dynamic. |
| Location SEO | ✅ **Pass** | Location in ad data and filters; consider adding location in meta/structured data if you target city-level landing pages. |
| Duplicate content | ✅ **Pass** | Canonicals set on key templates. Single H1 per page. No obvious duplicate URLs. |

**Blocking:** None.

---

## 10. Production Readiness

| Check | Status | Notes |
|-------|--------|--------|
| Build success | ✅ **Pass** | `npm run build` completes successfully. |
| Error-free deploy | ⚠️ **Note** | During build, `/lists` triggered a 404 to `GET /api/clusters/lists`. If that route is missing in production, `/lists` may error at runtime; add route or handle gracefully. |
| Rollback plan | 🔶 **Ops** | Use host rollback (e.g. previous deployment) and/or feature flags. Keep previous build artifact. |

**Blocking:** None. Fix or accept `/clusters/lists` 404 if it affects `/lists` in production.

---

## Blocking Launch Issues

1. **Set production env at build time**  
   - `NEXT_PUBLIC_BASE_URL=https://yourdomain.com`  
   - `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api` (or your real API URL)  
   Without these, sitemap and OG/canonicals will show localhost or wrong domain.

2. **Build with production env**  
   Run the production build in CI/deploy with the above variables set so inlined values are correct.

---

## Step-by-Step Fixes (Pre-Launch)

1. **Environment (required)**  
   - In your deploy platform (Vercel/Netlify/etc.), add:  
     - `NEXT_PUBLIC_BASE_URL` = your live site URL (e.g. `https://yoursite.com`)  
     - `NEXT_PUBLIC_API_URL` = your live API URL (e.g. `https://api.yoursite.com/api`)  
   - Ensure the **production** build uses these (not .env.local from dev).

2. **Optional: .env.example**  
   - Add a line: `# NEXT_PUBLIC_SEO_INDEXABLE=false  # Set on staging to keep noindex`  
   if you use a staging environment.

3. **Optional: Product schema itemCondition**  
   - In `app/ads/[id]/layout.tsx`, replace or remove the `itemCondition` line if you want only valid Schema.org values (e.g. map "Like New" → `https://schema.org/UsedCondition` or omit).

4. **Post-deploy**  
   - Open `https://yourdomain.com/robots.txt` → expect Allow + Sitemap.  
   - Open `https://yourdomain.com/sitemap.xml` → expect your domain in `<loc>`.  
   - Open one ad URL → View Source → check title, canonical, and JSON-LD.

---

## Risk Score (0–100, lower = better)

| Area | Weight | Score (0–10) | Weighted |
|------|--------|--------------|----------|
| Env & config | 15% | 3 (env must be set) | 0.45 |
| Core SEO | 20% | 1 | 0.20 |
| Indexing | 10% | 1 | 0.10 |
| Sitemap | 15% | 2 (domain depends on env) | 0.30 |
| Structured data | 10% | 2 (minor itemCondition) | 0.20 |
| Performance/UX | 10% | 5 (not measured) | 0.50 |
| Security | 10% | 2 (HTTPS deploy) | 0.20 |
| Analytics | 5% | 4 (Firebase only) | 0.20 |
| Content/SEO | 5% | 1 | 0.05 |
| Build/deploy | 10% | 2 (lists 404 note) | 0.20 |
| **Total** | 100% | | **2.40** → **24** (scale 0–100) |

**Risk score: ~24–28 / 100** (low risk once env is set and deploy is HTTPS).

---

## Go-Live Recommendation

**CONDITIONAL GO**

- **Do before launch:**  
  - Set `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_API_URL` in the **production build** environment.  
  - Deploy with HTTPS and, if applicable, HTTPS API.  
- **Then:** Launch. Remaining items (Lighthouse, Search Console, GA4, optional schema tweak) can be done in the first 30 days.

---

## 30-Day Post-Launch SEO Plan

| Week | Action |
|------|--------|
| **1** | Add property in Google Search Console; submit sitemap `https://yourdomain.com/sitemap.xml`. Verify robots.txt and one ad page (title, canonical, JSON-LD). Run Lighthouse on homepage and one ad page; fix any critical SEO/performance issues. |
| **2** | Confirm Firebase Analytics or add GA4; link GA4 to Search Console if using GA4. Check Coverage for indexing errors; request indexing for key URLs (home, /ads, 2–3 category and ad URLs). |
| **3** | Review Core Web Vitals in Search Console; optimize LCP/INP/CLS if needed. Validate Product/BreadcrumbList in Rich Results Test; fix itemCondition if desired. Add optional metadata for `/ads` and improve any low-performing page titles/descriptions. |
| **4** | Review search queries and impressions in Search Console; refine meta and content for top queries. Consider location-specific landing pages or structured data if targeting city-level SEO. Plan next batch of content or schema improvements. |

---

## Quick Verification Checklist (Post-Deploy)

- [ ] `https://yourdomain.com/robots.txt` shows Allow and Sitemap with your domain.  
- [ ] `https://yourdomain.com/sitemap.xml` shows your domain in `<loc>` and includes `/ads` and `/ads/...`.  
- [ ] One ad page: View Source has unique title, meta description, canonical, and Product + BreadcrumbList JSON-LD.  
- [ ] Homepage: View Source has WebSite + Organization JSON-LD.  
- [ ] Search Console: property added, sitemap submitted, no critical coverage errors.  
- [ ] Lighthouse (production): SEO score ≥ 90; fix any Performance or Best Practice blockers.
