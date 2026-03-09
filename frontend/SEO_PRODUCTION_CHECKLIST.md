# SEO Production Launch Checklist

Use this with the full **SEO_AUDIT_REPORT.md** in the project root. Tick items before going live.

## Environment
- [ ] `NEXT_PUBLIC_BASE_URL` set to production URL (e.g. `https://yoursite.com`)
- [ ] No localhost/staging URLs in production env
- [ ] `NODE_ENV=production` for production build

## Indexing (handled in code)
- [ ] **robots.txt**: In production, `/robots.txt` allows crawling and points to sitemap (see `app/robots.ts`)
- [ ] **noindex**: Only applied in development (see `app/layout.tsx` metadata)
- [ ] Submit `https://yoursite.com/sitemap.xml` in Google Search Console (and Bing)

## Meta & content
- [ ] Dynamic metadata for `/ads/[id]` ✓ (layout.tsx)
- [ ] Default OG image: `public/og-default.jpg` (1200×630) – add image if missing; layout uses it
- [ ] Twitter card and root meta are set in layout

## Structured data
- [ ] Add **WebSite** + **Organization** JSON-LD (homepage or layout)
- [ ] Add **Product** / **Offer** JSON-LD on `/ads/[id]` and product slug pages
- [ ] Validate with [Google Rich Results Test](https://search.google.com/test/rich-results)

## Performance & validation
- [ ] Run **Lighthouse** on production URL (Performance, SEO, Accessibility)
- [ ] Fix any critical issues; check Core Web Vitals
- [ ] Confirm no broken internal links (especially to `/ads`, categories)

## Post-launch
- [ ] Request indexing for homepage and key category URLs in GSC
- [ ] Monitor Coverage and Core Web Vitals in Search Console
