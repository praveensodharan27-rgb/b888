'use client';

import AdCard from './AdCard';

/**
 * ListingsCard - A wrapper around AdCard specifically for listing pages
 * Ensures Product Specifications are prominently displayed
 */
interface ListingsCardProps {
  ad: Parameters<typeof AdCard>[0]['ad'];
  priority?: boolean;
}

export default function ListingsCard({ ad, priority = false }: ListingsCardProps) {
  // Pass through to AdCard - Product Specifications are already handled there
  return <AdCard ad={ad} priority={priority} />;
}

