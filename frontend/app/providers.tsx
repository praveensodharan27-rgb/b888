'use client';

import type { ReactNode } from 'react';
import { ClientProviders } from '@/components/ClientProviders';

/**
 * @deprecated Use ClientProviders from '@/components/ClientProviders' instead.
 * Kept for backward compatibility.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}
