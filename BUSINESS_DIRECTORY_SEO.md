# India Business Directory – SEO structure

Production-ready SEO structure for the Business Directory (28+ states, 700+ cities).

## URL structure (root-level, dynamic)

All URLs are **lowercase**, **hyphenated**, no special characters. **No query parameters** for SEO pages; **no numeric IDs** in URLs.

| Pattern | Example |
|--------|---------|
| State | `/kerala` |
| City | `/kerala/ernakulam` |
| Category | `/kerala/ernakulam/spa` |
| Business | `/kerala/ernakulam/spa/moksha-ayurvedic-spa` |
| Blog post | `/blog/best-spa-in-ernakulam` |

**URL rules:** lowercase, spaces → hyphens, remove special characters and duplicate hyphens. Clean readable URLs only.

**Slug from business name:** e.g. `Moksha Ayurvedic Spa & Wellness` → `moksha-ayurvedic-spa-wellness` (max 70 chars; duplicate slugs get city name or unique number on the backend).

## Meta tags (dynamic per page)

- **Title**: ~60 chars (e.g. `Best Spa in Ernakulam | Moksha Ayurvedic Spa`)
- **Meta description**: 150–160 chars
- **Meta keywords**: page-relevant
- **Canonical URL**: one per page
- **Open Graph** and **Twitter Card** tags

## Schema markup (JSON-LD)

- **Homepage / directory home**: `WebSite`
- **State / city / category lists**: `ItemList`
- **Business page**: `LocalBusiness` (name, address, phone, rating, reviews, openingHours, geo)
- **Breadcrumbs**: `BreadcrumbList` on all directory pages
- **Blog post**: `Article`; FAQ block when present → `FAQPage`

## City & category SEO

- **State page**: 500+ words style content, list of cities, internal links to city pages
- **City page**: categories grid, featured businesses, short SEO block
- **Category page**: H1 “Best {Category} in {City}”, 300+ words block, filters, sort by rating, pagination

## Canonical URL system

- Every page includes `<link rel="canonical" href="correct-url" />` via Next.js `alternates.canonical`.
- If a slug changes, **301 redirect** from old URL to new URL (handled by middleware for lowercase; for business slug changes, implement redirect in API or middleware when you store old slug).

## Breadcrumb structure

- **Home > State > City > Category > Business** (e.g. Home > Kerala > Ernakulam > Spa > Moksha Ayurvedic Spa).
- **Schema.org BreadcrumbList** (JSON-LD) on all directory pages.

## Technical SEO

- **XML sitemap**: `/sitemap.xml` includes all root-level state/city/category/business and blog URLs (from `/api/directory/sitemap-urls`).
- **robots.txt**: allows `/`; sitemap and host set.
- **Canonical URLs**: every page has `alternates.canonical`.
- **Single H1** per page; logical H2/H3; image `alt` from business/category name.
- **301 redirects**: `/in` and `/in/*` redirect to root-level URLs; non-lowercase paths redirect to lowercase.

## Internal linking

- Directory home → states → cities → categories → businesses
- Related categories and “Featured in {city}” on city page
- Footer can link top states (add in your layout if needed)

## Reviews & lead tracking

- **Reviews**: submit via form on business page; stored and shown in schema + listing
- **Lead tracking**: Call and WhatsApp links use `LeadTrackLink`; clicks send `POST /api/directory/lead` (type: `call` | `whatsapp`)

## Blog (SEO traffic)

- **URL**: `/blog/{seo-title-slug}` (e.g. `/blog/best-spa-in-ernakulam`)
- **Content**: 1000+ words supported; internal links; FAQ block → FAQ schema
- **Topics**: “Best {category} in {city}”, “Top 10 {services}”, etc.

## Speed & SSR

- Directory and blog pages are **server-rendered** (Next.js App Router)
- Data fetched with `next: { revalidate: 300 }` (ISR)
- Images: Next `Image` with `sizes`; ensure API image domain in `next.config.js` if needed

## Setup

1. **Backend**
   - Prisma schema includes: `DirectoryState`, `DirectoryCity`, `DirectoryCategory`, `DirectoryBusiness`, `DirectoryReview`, `DirectoryBlogPost`
   - Generate client: `npx prisma generate --schema=prisma/schema.mongodb.prisma`
   - Seed: `node scripts/seed-directory.js` (states, cities, categories, sample business + blog post)
   - Set `FRONTEND_URL` (and optionally `NEXT_PUBLIC_BASE_URL`) for sitemap URLs

2. **Frontend**
   - Directory pages under `app/in/[...]`; blog under `app/blog/[slug]`
   - API base: `NEXT_PUBLIC_API_URL`; directory helpers in `lib/directory.ts`

3. **Analytics**
   - Add Google Analytics / Search Console in your root layout or `_document` as needed; directory pages are standard HTML for crawling.

## SEO optimization rules

- **One H1 per page.** URL must match page title keywords.
- **Category page H1:** `Best {Category} in {City}`.
- **Business page H1:** `{Business Name} in {City}`.

## Tech implementation

- **Dynamic routing**: Next.js App Router (`[categorySlug]` = state or marketplace category; same segment branches by checking directory state).
- **Server-side rendering (SSR)** for all directory and blog pages.
- **Sitemap**: auto-generated; directory URLs from `/api/directory/sitemap-urls`. When new business is added, sitemap updates on next revalidate.
- **Middleware**: enforces lowercase (301), and `/in` / `/in/*` → root (301).

## Scaling (all India)

- **States**: 28+ in `backend/data/india-states-cities.json` (expand as needed)
- **Cities**: 700+ across states; add more in the same JSON and re-run seed
- **Categories**: managed in DB; add via admin or seed
- **Businesses**: created via API or future admin; slug from name via `utils/slug.js` (slugify, slugifyUnique for duplicates)
