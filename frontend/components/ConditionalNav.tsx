'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const Navbar = dynamic(
  () => {
    return import('@/components/Navbar').catch((error) => {
      console.error('Failed to load Navbar component:', error);
      return { default: () => <div className="h-16 bg-white shadow-md"></div> };
    });
  },
  {
    loading: () => <div className="h-16 bg-white shadow-md"></div>,
    ssr: true
  }
);

const CategoryNav = dynamic(
  () => {
    return import('@/components/CategoryNav').catch((error) => {
      console.error('Failed to load CategoryNav component:', error);
      return { default: () => null };
    });
  },
  {
    loading: () => <div className="h-14 bg-white border-b border-gray-200"></div>,
    ssr: false
  }
);

const Footer = dynamic(
  () => {
    return import('@/components/Footer').catch((error) => {
      console.error('Failed to load Footer component:', error);
      return { default: () => null };
    });
  },
  {
    loading: () => <div className="h-32 bg-gray-800"></div>,
    ssr: true
  }
);

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

