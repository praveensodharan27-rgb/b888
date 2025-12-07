'use client';

import Link from 'next/link';
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
  FiShield
} from 'react-icons/fi';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: FiHome, tab: 'dashboard' },
  { href: '/admin?tab=ads', label: 'Ads', icon: FiLayers, tab: 'ads' },
  { href: '/admin?tab=users', label: 'Users', icon: FiUsers, tab: 'users' },
  { href: '/admin/moderation', label: 'Moderation', icon: FiShield, tab: 'moderation' },
  { href: '/admin?tab=banners', label: 'Banners', icon: FiImage, tab: 'banners' },
  { href: '/admin?tab=categories', label: 'Categories', icon: FiTag, tab: 'categories' },
  { href: '/admin?tab=premium', label: 'Premium Ads', icon: FiStar, tab: 'premium' },
  { href: '/admin/orders', label: 'Orders', icon: FiShoppingBag, tab: 'orders' },
  { href: '/admin?tab=offers', label: 'Offers', icon: FiGift, tab: 'offers' },
  { href: '/admin?tab=business-packages', label: 'Business Packages', icon: FiBriefcase, tab: 'business-packages' },
  { href: '/admin?tab=interstitial', label: 'Interstitial Ads', icon: FiMonitor, tab: 'interstitial' },
  { href: '/admin/search-alerts', label: 'Search Alerts', icon: FiBell, tab: 'search-alerts' },
];

export default function AdminNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-16 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            let isActive = false;
            
            if (item.href === '/admin/orders') {
              isActive = pathname === '/admin/orders';
            } else if (item.href === '/admin/search-alerts') {
              isActive = pathname === '/admin/search-alerts';
            } else if (item.href === '/admin/moderation') {
              isActive = pathname === '/admin/moderation';
            } else {
              isActive = pathname === '/admin' && currentTab === item.tab;
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap
                  ${isActive 
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50' 
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

