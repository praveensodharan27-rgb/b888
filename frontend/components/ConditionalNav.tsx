'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const Navbar = dynamic(() => import('@/components/Navbar'), {
  loading: () => <div className="h-16 bg-white shadow-md"></div>,
  ssr: true
});

const CategoryNav = dynamic(() => import('@/components/CategoryNav'), {
  loading: () => <div className="h-14 bg-white border-b border-gray-200"></div>,
  ssr: false
});

const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => <div className="h-32 bg-gray-800"></div>,
  ssr: true
});

export function ConditionalNavbar() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  if (isAdminPage) return null;

  return (
    <>
      <Navbar />
      <CategoryNav />
    </>
  );
}

export function ConditionalFooter() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  if (isAdminPage) return null;

  return <Footer />;
}

