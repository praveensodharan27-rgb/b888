'use client';

/**
 * Client boundary: ClientProviders + AppClientRoot.
 * Used in root layout so pages get Navbar, Footer, and context.
 * Root layout stays a Server Component; this is the single client import.
 */

import { ClientProviders } from '@/components/ClientProviders';
import AppClientRoot from '@/components/AppClientRoot';

type Props = {
  children: React.ReactNode;
  splashImageUrl?: string;
  splashLinkUrl?: string;
  splashDuration?: number;
  splashEnabled?: boolean;
};

export default function AppWithShell({
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
