'use client';

import { usePathname } from 'next/navigation';
import { memo, Suspense } from 'react';
import dynamic from 'next/dynamic';

const Navbar = dynamic(
  () =>
    import('@/components/Navbar')
      .then((m) => m?.default ?? (() => <div className="h-[72px] bg-white border-b border-gray-200" />))
      .catch(() => ({ default: () => <div className="h-[72px] bg-white border-b border-gray-200" /> })),
  { loading: () => <div className="h-[72px] bg-white border-b border-gray-200" />, ssr: true }
);

const CategoryNav = dynamic(
  () =>
    import('@/components/CategoryNav')
      .then((m) => m?.default ?? (() => null))
      .catch(() => ({ default: () => null })),
  {
    loading: () => <div className="h-14 bg-white border-b border-gray-200" />,
    ssr: false,
  }
);

const Footer = dynamic(
  () =>
    import('@/components/Footer')
      .then((m) => m?.default ?? (() => null))
      .catch(() => ({ default: () => null })),
  { loading: () => <div className="h-32 bg-gray-800" />, ssr: true }
);

const HIDE_NAV_PATHS = ['/admin', '/mybusiness'];

export function ConditionalNavbar() {
  const pathname = usePathname();
  const hideNav = pathname && HIDE_NAV_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (hideNav) return null;

  // Show same Navbar on all pages (like home page)
  // Wrap in Suspense since Navbar uses useSearchParams
  return (
    <Suspense fallback={<div className="h-[72px] bg-white border-b border-gray-200" />}>
      <Navbar />
    </Suspense>
  );
}

export function ConditionalFooter() {
  const pathname = usePathname();
  const hideFooter = pathname && HIDE_NAV_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (hideFooter) return null;

  return <Footer />;
}

