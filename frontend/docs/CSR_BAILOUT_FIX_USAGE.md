# CSR Bailout Fix – Usage Guide

## Structure

### Root Layout (pure Server Component)

`app/layout.tsx` – **no `'use client'`**, no Providers import:

```tsx
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Roboto } from 'next/font/google';
import './globals.css';
import AppClientRoot from '@/components/AppClientRoot';
import JsonLdSite from '@/components/seo/JsonLdSite';
import { getBaseUrl } from '@/lib/seo';

export const metadata: Metadata = { /* ... */ };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>...</head>
      <body>
        <JsonLdSite />
        <AppClientRoot splashImageUrl="..." splashLinkUrl="..." splashDuration={0} splashEnabled={false}>
          {children}
        </AppClientRoot>
      </body>
    </html>
  );
}
```

### ClientProviders (client only)

`components/ClientProviders.tsx` – React Query + Firebase + context providers:

```tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import FirebaseProvider from '@/components/FirebaseProvider';
import { ProfileCacheProvider } from '@/contexts/ProfileCacheContext';
import { SpecsLayoutProvider } from '@/contexts/SpecsLayoutContext';
import { queryClient } from '@/lib/queryClient';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ProfileCacheProvider>
        <SpecsLayoutProvider>
          <FirebaseProvider>{children}</FirebaseProvider>
        </SpecsLayoutProvider>
      </ProfileCacheProvider>
    </QueryClientProvider>
  );
}
```

### Usage in AppClientRoot

`ClientProviders` is used only inside `AppClientRoot`, not in the layout:

```tsx
'use client';

import { ClientProviders } from '@/components/ClientProviders';

export default function AppClientRoot(props) {
  return (
    <ClientProviders>
      <AppClientRootInner {...props} />
    </ClientProviders>
  );
}
```

## Rules

1. Root layout is a pure Server Component (no `'use client'`).
2. Layout does not wrap children with Providers.
3. ClientProviders is used only in client components (e.g. AppClientRoot).
4. JSON-LD, metadata, and base HTML are server-rendered for SEO.
5. SSR HTML stays intact; client hydration happens under the ClientProviders boundary.
