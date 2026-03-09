# Business Directory – Production-ready SEO routing

Clean hierarchical URL structure with no query params or ID-based URLs.

---

## URL structure (strict)

| Pattern | Example |
|--------|---------|
| `/{state}` | `/kerala` |
| `/{state}/{city}` | `/kerala/ernakulam` |
| `/{state}/{city}/{category}` | `/kerala/ernakulam/spa` |
| `/{state}/{city}/{category}/{business-slug}` | `/kerala/ernakulam/spa/moksha-ayurvedic-spa` |

All slugs are stored and resolved by: **stateSlug**, **citySlug**, **categorySlug**, **businessSlug**.

---

## Slug system

- **Rules:** lowercase, spaces → hyphens, remove special characters, remove duplicate hyphens, trim hyphens, **max 70 characters** (`SLUG_MAX_LENGTH` in `lib/directory.ts` and `lib/directory/constants.ts`).
- **Uniqueness:** Business slugs are unique per (state, city, category). On duplicate, backend uses `slugifyUnique()` to append city name or a numeric suffix.
- **Storage:** `DirectoryState.slug`, `DirectoryCity.slug`, `DirectoryCategory.slug`, `DirectoryBusiness.slug` in MongoDB.

---

## Dynamic routing

- **Routes:** Next.js App Router under `app/[categorySlug]/...` with branching:
  - **1 segment** → state page (directory) or marketplace category.
  - **2 segments** → city page (directory) or marketplace subcategory.
  - **3 segments** → category listing (directory) or marketplace product.
  - **4 segments** → directory business detail only.
- **Data:** Each directory page fetches by **stateSlug**, **citySlug**, **categorySlug**, **businessSlug** via `lib/directory.ts` (e.g. `getStateBySlug`, `getCityBySlug`, `getBusinesses`, `getBusinessBySlug`).
- **404:** No match → SEO-friendly 404 (`app/not-found.tsx`) with internal links (Home, Browse directory).

---

## Page responsibility

**State page** (`/{state}`)

- All cities in that state.
- Top categories (links to first city’s category pages).
- Featured businesses (from API, with state/city/category/slug).
- SEO content block.

**City page** (`/{state}/{city}`)

- All categories in that city.
- Popular/featured businesses.
- Internal links (breadcrumb, state, categories).

**Category page** (`/{state}/{city}/{category}`)

- **H1:** `Best {Category} in {City}`.
- Business listing with filters, sort, pagination.
- SEO content block.

**Business detail** (`/{state}/{city}/{category}/{business-slug}`)

- Business name, rating, reviews.
- Contact details (phone, WhatsApp, website, address).
- Map (link to Google Maps when lat/lng present).
- Services (description).
- Gallery (multiple images).
- Working hours.

---

## SEO

- **Dynamic:** Title tag, meta description, canonical URL (`alternates.canonical`) on every directory page.
- **Breadcrumb:** Home > State > City > Category > Business; **Schema.org BreadcrumbList** (JSON-LD) on all directory pages.

---

## Sitemap

- **Dynamic sitemap:** `app/sitemap.xml/route.ts` includes directory URLs from `GET /api/directory/sitemap-urls` (states, cities, category listings, businesses).
- **Updates:** Sitemap is regenerated on revalidate; new businesses are included on next run.

---

## Redirect system (slug changes)

- **Model:** `DirectorySlugRedirect` (fromPath, toPath). When a slug is updated, create a row with old path → new path.
- **API:**  
  - `GET /api/directory/redirect?path=/kerala/ernakulam/spa/old-slug` → `{ toPath: "/kerala/ernakulam/spa/new-slug" }`.  
  - `POST /api/directory/redirects` body `{ fromPath, toPath }` to create/update a redirect.
- **Behaviour:** On business detail, if no business is found, the app checks redirect; if found, **301 redirect** to `toPath`.

---

## Performance

- **SSR:** Directory pages are server-rendered (Next.js with `revalidate`).
- **Mobile-first:** Responsive layout and touch-friendly links.
- **Scale:** Designed for 28 states, 700+ cities, unlimited categories and businesses (indexed by slug, pagination on lists).

---

## Folder structure

- **Routes:** `app/[categorySlug]/page.tsx`, `app/[categorySlug]/[subcategorySlug]/page.tsx`, `app/[categorySlug]/[subcategorySlug]/[productSlug]/page.tsx`, `app/[categorySlug]/[subcategorySlug]/[productSlug]/[businessSlug]/page.tsx`.
- **Lib:** `lib/directory.ts` (API helpers, dirUrl, dirPath, normalizeSegment, slugify, getRedirectForPath), `lib/directory/constants.ts` (SLUG_MAX_LENGTH, SLUG_RULES).
- **Components:** `components/directory/DirectoryCategoryClient.tsx`, `components/directory/LeadTrackLink.tsx`.
- **Backend:** `routes/directory.js`, `utils/slug.js` (slugify, slugifyUnique), Prisma models under `directory_*` / `DirectorySlugRedirect`.

---

## Apply schema (redirect table)

```bash
cd backend
npx prisma generate --schema=prisma/schema.mongodb.prisma
```

Then create redirects when you change a business slug (e.g. from admin or API):  
`POST /api/directory/redirects` with `{ fromPath: "/kerala/ernakulam/spa/old-slug", toPath: "/kerala/ernakulam/spa/new-slug" }`.
