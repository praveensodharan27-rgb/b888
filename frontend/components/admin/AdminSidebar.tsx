'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  FiHome, 
  FiLayers, 
  FiUsers, 
  FiImage, 
  FiTag, 
  FiStar, 
  FiShoppingBag, 
  FiGift,
  FiMonitor,
  FiBriefcase,
  FiBell,
  FiShield,
  FiMenu,
  FiX,
  FiEdit3,
  FiSettings
} from 'react-icons/fi';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: FiHome, tab: 'dashboard' },
  { href: '/admin?tab=ads', label: 'Ads', icon: FiLayers, tab: 'ads' },
  { href: '/admin?tab=users', label: 'Users', icon: FiUsers, tab: 'users' },
  { href: '/admin/moderation', label: 'Moderation', icon: FiShield, tab: 'moderation' },
  { href: '/admin?tab=banners', label: 'Banners', icon: FiImage, tab: 'banners' },
  { href: '/admin?tab=categories', label: 'Categories', icon: FiTag, tab: 'categories' },
  { href: '/admin?tab=spec-options', label: 'Category Specifications Manager', icon: FiSettings, tab: 'spec-options' },
  { href: '/admin?tab=auth-pages', label: 'Login/Signup Pages', icon: FiEdit3, tab: 'auth-pages' },
  { href: '/admin?tab=premium', label: 'Premium Ads', icon: FiStar, tab: 'premium' },
  { href: '/admin/orders', label: 'Orders', icon: FiShoppingBag, tab: 'orders' },
  { href: '/admin?tab=offers', label: 'Offers', icon: FiGift, tab: 'offers' },
  { href: '/admin?tab=business-packages', label: 'Business', icon: FiBriefcase, tab: 'business-packages' },
  { href: '/admin?tab=interstitial', label: 'Interstitial Ads', icon: FiMonitor, tab: 'interstitial' },
  { href: '/admin/search-alerts', label: 'Search Alerts', icon: FiBell, tab: 'search-alerts' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (item: typeof adminNavItems[0]) => {
    if (item.href === '/admin/orders') {
      return pathname === '/admin/orders';
    } else if (item.href === '/admin/search-alerts') {
      return pathname === '/admin/search-alerts';
    } else if (item.href === '/admin/moderation') {
      return pathname === '/admin/moderation';
    } else {
      return pathname === '/admin' && currentTab === item.tab;
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg shadow-lg"
      >
        {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 shadow-lg z-40
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full overflow-y-auto py-6">
          {/* Logo/Title */}
          <div className="px-6 mb-8 border-b border-gray-200 pb-6">
            <Link href="/admin" className="flex items-center gap-3 mb-3">
              <Image
                src="/logo.png"
                alt="Logo"
                width={180}
                height={60}
                className="h-14 w-auto object-contain"
              />
              <div>
                <p className="text-xs text-gray-500">Admin Panel</p>
              </div>
            </Link>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 mt-3">
              <p className="text-xs font-semibold text-blue-900">Platform Status</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-xs text-blue-700">All Systems Operational</p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 px-3">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${active 
                      ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="text-sm">{item.label}</span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section removed per request */}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30 top-16"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

