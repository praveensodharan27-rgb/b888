# SEO Audit Report — SellIt Marketplace

**Audit date:** February 2025  
**Framework:** Next.js 15 (App Router)  
**Rendering:** Hybrid — SSR for category/product/lists; client-only for home, /ads, /ads/[id]  
**Local URL:** http://localhost:3000 (frontend), http://localhost:5000 (API)  
**Target market:** India (INR, local listings) — fill in exact region if needed

---

## SEO Readiness Score: **62 / 100**

| Area | Score | Notes |
|------|--------|--------|
| 1. Indexing & Robots (Dev) | 4/10 | No robots.txt; no noindex in dev |
| 2. Meta Tags & Head | 6/10 | Root OG present; missing Twitter; /ads/[id] no metadata |
| 3. URL & Routing | 6/10 | Slug routes good; /ads/[id] uses raw ID |
| 4. Rendering & Crawlability | 5/10 | Key listing pages client-only; view-source poor for /ads |
| 5. Heading & Content | 8/10 | Single H1 per page; hierarchy generally good |
| 6. Image & Media | 7/10 | Alt mostly present; one empty alt; lazy loading used |
| 7. Internal Linking | 7/10 | Crawlable `<Link>`; /ads not in sitemap |
| 8. Performance (Dev) | 6/10 | No benchmark run; dynamic imports help |
| 9. Structured Data | 2/10 | No JSON-LD / Schema.org |
| 10. Production Switch | 4/10 | No env-based noindex/robots; sitemap partial |

---

## 1. Indexing & Robots Control (Dev Mode)

### Current state
- **robots.txt:** None (no file in `public/`, no route).
- **noindex:** Not set for development; crawlers could index localhost if exposed.
- **Canonical:** Present on category, subcategory, product (slug), and list pages. **Missing** on `/ads`, `/ads/[id]`, homepage, and most static pages.

### Blocking issues
- In dev/staging, search engines could index the site if the URL is reachable (no robots block, no noindex).

### Recommendations
- Add **robots.txt route** that returns `User-agent: *` / `Disallow: /` when `NODE_ENV !== 'production'` (or a dedicated env like `NEXT_PUBLIC_SEO_INDEXABLE=false`).
- In **production**, serve `Allow: /` and `Sitemap: https://yourdomain.com/sitemap.xml`.
- Add **conditional noindex** in root layout when in development (see code section below).

---

## 2. Meta Tags & Head Section

### Current state
- **Root layout:** `title`, `description`, `keywords`, `openGraph` (title, description, type). No `openGraph.url`, `openGraph.images`, no **Twitter** card.
- **Per-page metadata:** Implemented via `generateMetadata` for:
  - `/[categorySlug]`, `/[categorySlug]/[subcategorySlug]`, `/[categorySlug]/[subcategorySlug]/[productSlug]`
  - `/lists/[slug]`
  - `/category/[slug]` (metadata.ts)
- **Missing:** `/ads` (uses root metadata), **/ads/[id]** (client component — no `generateMetadata`), so every ad detail page shares the same default title/description. No **OG image** or **Twitter** at root.

### Blocking issues
- **/ads/[id]** is a major content URL and has no unique title, description, or OG/Twitter. View-source and social shares will show generic “SellIt - Buy and Sell Anything”.

### Must-fix before launch
1. Add **dynamic metadata for /ads/[id]** (e.g. server wrapper or separate metadata fetch so title/description/OG use ad title, price, image).
2. Add **Twitter card** in root metadata: `twitter: card, title, description` (and image when you have a default).
3. Add **default OG image** in root (e.g. `/logo.png` or a dedicated OG image).

---

## 3. URL & Routing Structure

### Current state
- **SEO-friendly slugs:** Category/subcategory/product use slugs: `/[categorySlug]/[subcategorySlug]/[productSlug]` and `/lists/[slug]`.
- **ID-based routes:** `/ads/[id]`, `/user/[userId]`, `/edit-ad/[id]`. Ads are linked as `/ads/${ad.id}` everywhere (AdCardOGNOX, AdCardOLX, MyAdsAdCard, etc.).
- **Clean routes:** No random query params for core content; filters use query params (acceptable).

### Blocking issues
- **/ads/[id]** uses opaque IDs. For SEO, consider hybrid: keep `/ads/[id]` for reliability (as in code comments) but add **canonical** and, long-term, optional slug-based URLs (e.g. redirect or alternate).

### Recommendations
- Keep current `/ads/[id]` for linking and redirects.
- Add **canonical** for `/ads/[id]` once you have metadata (e.g. `https://domain.com/ads/123`).
- Optionally add **slug or slug+id** in the future (e.g. `/ads/123/title-slug`) for readability; 301 from slug to id or vice versa.

---

## 4. Rendering & Crawlability

### Current state
- **SSR (good for SEO):** Category, subcategory, product (slug), list pages use server components + `generateMetadata`; HTML is fully rendered.
- **Client-only:** Home (`app/page.tsx` is `'use client'`), `/ads`, `/ads/[id]` — content depends on client-side fetch. Googlebot may see delayed or minimal content without JS.
- **View-source:** For `/ads` and `/ads/[id]`, initial HTML will show layout + loading state, not ad title/description/images.

### Blocking issues
- Main **listing detail** page (`/ads/[id]`) is client-rendered; crawlers may not index ad content well without executing JS.

### Must-fix before launch
1. **Prefer SSR or hybrid for /ads/[id]:** e.g. server component wrapper that fetches ad by id and passes to client for interactivity; or at minimum ensure critical meta (title, description, OG) are set server-side (see §2).
2. **Homepage:** Consider server component for above-the-fold content or at least static meta + structured data so view-source and crawlers get meaningful content.

### Recommendations
- Use **dynamic metadata** for `/ads/[id]` via a server layout or parent that fetches ad and sets `<title>`, `<meta name="description">`, OG, and canonical. Next.js can do this with a server component that reads params and fetches, then renders client children.
- Ensure **critical content** (title, price, location) is present in initial HTML where possible (e.g. server-rendered shell).

---

## 5. Heading & Content Structure

### Current state
- **Single H1:** Pages audited use one H1 per page (e.g. ad title, category name, “My Ads”, “Login”).
- **Hierarchy:** H2/H3 used for sections (e.g. product specs, seller info). No obvious H1 duplication.
- **Visible text:** No evidence of content hidden from users; body copy is in DOM.

### Recommendations
- Keep single H1 per page.
- On **/ads/[id]**, ensure the ad title is the H1 (already present in right column; confirm it’s the only H1 when ad loads).
- Add **breadcrumbs** (e.g. Home > Category > Subcategory > Ad title) for listing and ad pages where missing; use list + `aria-label` or schema BreadcrumbList later.

---

## 6. Image & Media SEO

### Current state
- **Alt tags:** Most images use descriptive alt (e.g. `ad.title`, `product.title`, `user.name`). One **empty alt** in `app/ads/[id]/page.tsx`: thumbnail `alt=""` (line ~994).
- **File naming:** Remote URLs (S3, Cloudinary, placeholder); not file-name SEO critical.
- **Lazy loading:** `ImageWithFallback` uses `loading={priority ? undefined : "lazy"}`; cards use `priority` for first items. Good.

### Must-fix before launch
- Replace the empty `alt=""` for the ad thumbnail with a short description (e.g. `alt={`${ad.title} thumbnail ${index + 1}`}` or similar).

### Recommendations
- Audit all `ImageWithFallback` and `next/image` usages for empty or redundant alt; prefer concise, unique descriptions.
- For **ad images**, ensure at least first image has `priority` for LCP on detail page.

---

## 7. Internal Linking

### Current state
- **Crawlable links:** Next.js `<Link>` used; hrefs are server-rendered where the component is server-rendered. Client components still emit `<a href="...">` via `<Link>`.
- **Sitemap:** `app/sitemap.xml/route.ts` includes homepage, category, subcategory, and **product-by-slug** URLs. It does **not** include `/ads`, `/ads/[id]`, or `/lists` (list index). Lists are under category structure; ads are not.
- **Orphan risk:** `/ads` and all `/ads/[id]` URLs are not in sitemap; discovery relies on internal links from home, category pages, and list pages. If crawlers don’t execute JS, they may not discover all ad URLs.

### Recommendations
- **Include /ads in sitemap:** Add a single entry for `https://yourdomain.com/ads` (changefreq daily, priority 0.9).
- **Consider ad URLs in sitemap:** For production, either add paginated `/ads` entries or a separate sitemap index with ad URLs (e.g. from API) so Google can discover them. Balance size (e.g. cap at 10k or recent ads).
- Ensure **footer/nav** links to key sections (e.g. categories, help, terms) so crawlers find them without JS.

---

## 8. Performance (Dev Benchmark)

### Current state
- **Bundle:** Next 15 with dynamic imports (Hero, FreshRecommendations, FollowButton, ReportAdModal, AdsFilterSidebar, FilterChips). Helps reduce initial JS.
- **Lighthouse:** Not run in this audit. In dev, source maps and unminified code will worsen scores; measure in **production build** (`next build` + `next start`).
- **Blocking:** No explicit defer/async audit; Next handles script loading.

### Recommendations
- Run **Lighthouse in production mode** (and on a staging URL if possible): Performance, SEO, Best Practices, Accessibility.
- Set **NEXT_PUBLIC_BASE_URL** (and optionally a staging URL) so sitemap and canonicals are correct when testing.
- Consider **Core Web Vitals** (LCP, INP, CLS); ensure hero image and first ad cards use `priority` and sensible `sizes`.

---

## 9. Structured Data

### Current state
- **Schema.org / JSON-LD:** None found. No Product, Organization, WebSite, BreadcrumbList, or ItemList.
- **Rich results:** No product rich snippets, no sitelinks search box, no breadcrumb rich results.

### Blocking issues
- Missing structured data means no product/price rich results in SERPs and less explicit signals for the site and listings.

### Must-fix before launch (high value)
1. **WebSite** (with optional SearchAction) on homepage.
2. **Organization** in layout or homepage (name, url, logo).
3. **Product** (or **Offer**) on **/ads/[id]** and slug product page: name, image, price, availability, seller. Use JSON-LD in a `<script type="application/ld+json">` (inject server-side for /ads/[id] when you add server metadata).
4. **BreadcrumbList** on category, subcategory, product, and ad detail pages.

### Recommendations
- Validate JSON-LD with [Google Rich Results Test](https://search.google.com/test/rich-results) and Schema.org validator.
- Use Next.js metadata or a small component that outputs JSON-LD from server data.

---

## 10. Pre-Launch Production Switch

### Current state
- No env-based **noindex** (so dev/staging can be indexed if public).
- No **robots.txt** (so no explicit allow/disallow).
- **Sitemap:** Exists at `/sitemap.xml` but uses `NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'`; must set production URL before launch.
- **Canonicals:** Use relative paths (e.g. `/${category.slug}`); ensure they resolve to absolute in production (Next.js typically does).

### Must-fix before launch
1. **robots.txt:** Production: allow all + `Sitemap: https://yourdomain.com/sitemap.xml`. Dev/staging: disallow all or noindex (see implementation below).
2. **noindex in dev:** Set `<meta name="robots" content="noindex, nofollow">` when `NODE_ENV === 'development'` (or a custom env).
3. **NEXT_PUBLIC_BASE_URL:** Set to production origin in production env.
4. **Sitemap:** Add `/ads`; consider ad detail URLs if you want them indexed.

---

## Code-Level Recommendations (Summary)

| Priority | Item | Location / Action |
|----------|------|-------------------|
| P0 | Add robots.txt route (dev block, prod allow + sitemap) | `app/robots.ts` or `app/robots.txt/route.ts` |
| P0 | Noindex in development | `app/layout.tsx` metadata: `robots: process.env.NODE_ENV === 'development' ? 'noindex,nofollow' : 'index,follow'` |
| P0 | Dynamic metadata for /ads/[id] | Server wrapper or layout that fetches ad and exports `generateMetadata`; or move to server component with client children |
| P0 | Fix empty image alt on ad detail | `app/ads/[id]/page.tsx` thumbnail `alt=""` → descriptive alt |
| P1 | Twitter card + default OG image | Root `metadata` in `app/layout.tsx` |
| P1 | Canonical for /ads/[id] | When adding metadata for ads, set `alternates.canonical` |
| P1 | WebSite + Organization JSON-LD | Homepage or layout |
| P1 | Product/Offer JSON-LD on ad and product pages | Server-rendered script tag |
| P2 | Add /ads to sitemap | `app/sitemap.xml/route.ts` |
| P2 | BreadcrumbList schema | Category, product, ad pages |
| P2 | Consider SSR/hybrid for /ads/[id] | Improve first-byte content for crawlers |

---

## Dev → Production Transition Checklist

- [ ] **Environment**
  - [ ] Set `NEXT_PUBLIC_BASE_URL` to production domain (e.g. `https://sellit.example.com`).
  - [ ] Set `NODE_ENV=production` (or ensure build uses production).
  - [ ] Remove or restrict any `NEXT_PUBLIC_*` keys that point to localhost/Staging in production.

- [ ] **Indexing**
  - [ ] Ensure robots.txt in production allows crawling and references sitemap.
  - [ ] Remove or never enable noindex for production (conditional noindex only when `NODE_ENV === 'development'` or `NEXT_PUBLIC_SEO_INDEXABLE === 'false'`).
  - [ ] Submit sitemap in Google Search Console (and Bing if needed).

- [ ] **Meta & SEO**
  - [ ] Unique title/description/OG for /ads/[id] (and Twitter card).
  - [ ] Default OG image and Twitter card at site level.
  - [ ] Canonical set for all important templates (including /ads/[id]).

- [ ] **Structured data**
  - [ ] Add WebSite (and optionally Organization) on homepage/layout.
  - [ ] Add Product/Offer JSON-LD on ad and product detail pages.
  - [ ] Validate with Rich Results Test.

- [ ] **Performance**
  - [ ] Run Lighthouse on production build (Performance, SEO, Accessibility).
  - [ ] Fix any P0 issues (e.g. blocking resources, missing meta).
  - [ ] Verify Core Web Vitals on real devices or CrUX.

- [ ] **Content & UX**
  - [ ] Replace empty image alts.
  - [ ] Confirm single H1 and sensible heading order on key pages.
  - [ ] Test internal links (no broken links to /ads, /user, categories).

- [ ] **Security & compliance**
  - [ ] HTTPS only; no mixed content.
  - [ ] Privacy/terms/cookie pages linked and accurate.

---

## Page-Wise Improvement Plan

| Page / Route | Priority | Actions |
|--------------|----------|--------|
| **/** (Home) | P1 | Add WebSite + Organization JSON-LD; consider server-rendered hero or meta from API. |
| **/ads** | P1 | Add static or dynamic meta (title/description); add to sitemap. |
| **/ads/[id]** | P0 | Server metadata (title, description, OG, canonical); Product JSON-LD; fix thumbnail alt. |
| **/[categorySlug]** | P2 | Add BreadcrumbList; already has metadata + canonical. |
| **/[categorySlug]/[subcategorySlug]** | P2 | BreadcrumbList; already has metadata. |
| **/[categorySlug]/[subcategorySlug]/[productSlug]** | P1 | Add Product JSON-LD; breadcrumbs. |
| **/lists/[slug]** | P2 | BreadcrumbList; consider adding list to sitemap. |
| **/user/[userId]** | P2 | Add metadata + canonical; optional Person/Profile schema. |
| **/login, /register, /post-ad, /edit-ad/[id]** | P2 | noindex in metadata (or leave indexable per product decision). |
| **/admin/** | P0 | Ensure not in sitemap; consider robots disallow or auth-only. |
| **Static (about, terms, privacy, help)** | P2 | Canonical + OG if not set; ensure linked in footer. |

---

## Summary

- **Biggest gaps:** No robots control or noindex for dev; no metadata or structured data for `/ads/[id]`; no JSON-LD; sitemap missing `/ads` and ad URLs; one empty image alt.
- **Quick wins:** Add `app/robots.txt/route.ts`, conditional noindex in layout, Twitter + default OG image, fix thumbnail alt, add `/ads` to sitemap.
- **Larger effort:** Server-side metadata and JSON-LD for `/ads/[id]`, and optional SSR/hybrid for that route to improve crawlability and view-source content.

Implementing the P0 and P1 items above will bring the project to a **production-ready SEO baseline**; the rest will improve visibility and rich results post-launch.
