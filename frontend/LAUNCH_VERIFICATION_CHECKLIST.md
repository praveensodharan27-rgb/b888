# Launch Verification Checklist

Complete these checks before and after production launch.

---

## 1. Environment Variables (Pre-Launch)

Verify in production `.env`:

```
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SEO_INDEXABLE=true
NODE_ENV=production
```

- [ ] No `localhost` or staging URLs in production
- [ ] `NEXT_PUBLIC_*` set at **build time** (not runtime for static output)

---

## 2. Sitemap Verification

- [ ] Visit `https://yourdomain.com/sitemap.xml`
- [ ] Confirm XML is valid (no errors in browser/validator)
- [ ] Check URLs use production domain (no localhost)
- [ ] Verify homepage, `/ads`, categories, and recent ad URLs are present
- [ ] Submit sitemap in [Google Search Console](https://search.google.com/search-console) → Sitemaps
- [ ] Submit in Bing Webmaster Tools (optional)

---

## 3. Robots.txt Verification

- [ ] Visit `https://yourdomain.com/robots.txt`
- [ ] In **production**: `Allow: /` and `Sitemap: https://yourdomain.com/sitemap.xml`
- [ ] Confirm `Disallow: /admin/`, `/api/`, `/auth/callback`
- [ ] In **development/staging**: `Disallow: /` (noindex)

---

## 4. Lighthouse Audit

Run in Chrome DevTools (F12 → Lighthouse tab) on **production** URL:

- [ ] **Performance** – Target: ≥ 90
- [ ] **Accessibility** – Target: ≥ 90 (check alt text, contrast, ARIA)
- [ ] **Best Practices** – Target: ≥ 90
- [ ] **SEO** – Target: ≥ 90
- [ ] Fix any critical or high-severity issues
- [ ] Re-run in **Incognito** to avoid extension noise

---

## 5. Meta Tags & Social Sharing

- [ ] View page source (Ctrl+U) on homepage: `<title>`, `<meta name="description">`, `og:image` present
- [ ] Test ad detail page: unique title and description per ad
- [ ] Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) – paste homepage URL
- [ ] Use [Twitter Card Validator](https://cards-dev.twitter.com/validator) (if available)
- [ ] Verify `og-default.jpg` (1200×630) displays correctly in shares

---

## 6. Structured Data (JSON-LD)

- [ ] Go to [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Test homepage: WebSite + Organization
- [ ] Test an ad detail page: Product + BreadcrumbList
- [ ] Fix any validation errors

---

## 7. Accessibility

- [ ] Alt text on all meaningful images (Ads, Business, Services, Blog, etc.)
- [ ] Single H1 per page
- [ ] Form labels associated with inputs
- [ ] Keyboard navigation works (Tab through main links)
- [ ] Color contrast passes (use Lighthouse or axe DevTools)

---

## 8. Post-Launch

- [ ] Request indexing for homepage and key category URLs in Google Search Console
- [ ] Monitor Coverage report for crawl errors
- [ ] Monitor Core Web Vitals in Search Console
- [ ] Set up alerts for 404s and server errors
