# SSR Architecture for Dynamic Ad Pages

## 1. Pure Root Layout (`app/layout.tsx`)

- **NO** React Query, Firebase, `use client`, `next/dynamic`
- **Only**: html, body, fonts, metadata, `{children}`

```tsx
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Roboto } from 'next/font/google';
import './globals.css';
import JsonLdSite from '@/components/seo/JsonLdSite';
import { getBaseUrl } from '@/lib/seo';

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display', weight: ['200','300','400','500','600','700','800'] });
const roboto = Roboto({ subsets: ['latin'], variable: '--font-roboto', weight: ['400','500','700'] });

export const metadata: Metadata = { /* ... */ };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`light ${plusJakartaSans.variable} ${roboto.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:..." rel="stylesheet" />
      </head>
      <body>
        <JsonLdSite />
        {children}
      </body>
    </html>
  );
}
```

---

## 2. ClientProviders (`components/ClientProviders.tsx`)

- `"use client"`
- QueryClientProvider, FirebaseProvider, ProfileCacheProvider, SpecsLayoutProvider
- **NOT** used in root layout
- Used only inside `PageWithShell` (client components)

---

## 3. PageWithShell (`components/PageWithShell.tsx`)

- Client component
- Wraps `ClientProviders` + `AppClientRoot`
- Use in route group layout `app/(app)/layout.tsx` so pages under `(app)` get Navbar/Footer

---

## 4. Route Group Layout (`app/(app)/layout.tsx`)

- Uses `PageWithShell` so all pages under `(app)` get the interactive shell
- Move routes into `(app)` to use: `app/(app)/page.tsx`, `app/(app)/ads/[id]/page.tsx`, etc.

---

## 5. SSR Ad Page Pattern (`app/ads/[id]/page.tsx`)

- **Server Component** (no `'use client'`)
- Fetches ad in page with cached `getAd(id)`
- `notFound()` if ad is null
- Renders full HTML: h1, price, description, image, seller
- Uses `next/image` with `priority` for LCP
- Includes JSON-LD (Product, Breadcrumb)

---

## 6. Cached API Fetch (`lib/adsApi.ts`)

```ts
import { cache } from 'react';
export async function fetchAdById(id: string) { /* try/catch, return null on 404 */ }
export const getAd = cache(fetchAdById);
```

---

## 7. generateMetadata

- Use same `getAd(id)` (React cache prevents double fetch)
- Return full: title, description, canonical, openGraph, twitter
- Use absolute URLs from `getBaseUrl()`
- `robots: 'noindex, nofollow'` when ad not found

---

## 8. JSON-LD Example

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "...",
  "description": "...",
  "image": ["..."],
  "offers": { "@type": "Offer", "price": 5000, "priceCurrency": "INR" },
  "seller": { "@type": "Person", "name": "..." }
}
```
