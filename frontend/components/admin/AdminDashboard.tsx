'use client';

import { useSearchParams } from 'next/navigation';
import AdminStats from './AdminStats';
import AdminAds from './AdminAds';
import AdminUsers from './AdminUsers';
import AdminBanners from './AdminBanners';
import AdminCategories from './AdminCategories';
import AdminPremiumAds from './AdminPremiumAds';
import AdminPremiumSettings from './AdminPremiumSettings';
import AdminInterstitialAds from './AdminInterstitialAds';
import AdminBusinessPackages from './AdminBusinessPackages';
import AdminAuthPages from './AdminAuthPages';

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  return (
    <div>
      {activeTab === 'dashboard' && <AdminStats />}
      {activeTab === 'ads' && <AdminAds />}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'banners' && <AdminBanners />}
      {activeTab === 'categories' && <AdminCategories />}
      {activeTab === 'premium' && <AdminPremiumAds />}
      {activeTab === 'offers' && <AdminPremiumSettings />}
      {activeTab === 'interstitial' && <AdminInterstitialAds />}
      {activeTab === 'business-packages' && <AdminBusinessPackages />}
      {activeTab === 'auth-pages' && <AdminAuthPages />}
    </div>
  );
}

