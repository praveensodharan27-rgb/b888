'use client';

/**
 * Wraps page content with ClientProviders + AppShell (Navbar, main, Footer).
 * Use only in pages that need interactivity. NOT used in root layout.
 */

import type { ReactNode } from 'react';
import { ClientProviders } from '@/components/ClientProviders';
import AppClientRoot from '@/components/AppClientRoot';

type Props = {
  children: ReactNode;
  splashImageUrl?: string;
  splashLinkUrl?: string;
  splashDuration?: number;
  splashEnabled?: boolean;
};

export function PageWithShell({
  children,
  splashImageUrl = '',
  splashLinkUrl,
  splashDuration = 0,
  splashEnabled = false,
}: Props) {
  return (
    <ClientProviders>
      <AppClientRoot
        splashImageUrl={splashImageUrl}
        splashLinkUrl={splashLinkUrl}
        splashDuration={splashDuration}
        splashEnabled={splashEnabled}
      >
        {children}
      </AppClientRoot>
    </ClientProviders>
  );
}
