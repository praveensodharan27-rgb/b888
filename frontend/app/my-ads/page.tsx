'use client';

import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import MyAdsAdCard from '@/components/MyAdsAdCard';
import Link from 'next/link';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { useDeleteAd, useUpdateAd } from '@/hooks/useAds';
import { useState, useEffect, useMemo } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

const TABS = [
  { key: '', label: 'All' },
  { key: 'APPROVED', label: 'Active' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'SOLD', label: 'Sold' },
  { key: 'EXPIRED', label: 'Expired' },
];

export default function MyAdsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    ad: any | null;
    action?: 'delete' | 'sold';
  }>({
    isOpen: false,
    ad: null,
  });
  const deleteAd = useDeleteAd();
  const updateAd = useUpdateAd();

  const handleDeleteClick = (ad: any) => {
    setConfirmModal({ isOpen: true, ad, action: 'delete' });
  };

  const handleMarkSoldClick = (ad: any) => {
    setConfirmModal({ isOpen: true, ad, action: 'sold' });
  };

  const handleConfirmAction = () => {
    if (!confirmModal.ad) return;
    const adId = confirmModal.ad.id;

    if (confirmModal.action === 'delete') {
      setDeletingAdId(adId);
      deleteAd.mutate(adId, {
        onSuccess: () => {
          setDeletingAdId(null);
          setConfirmModal({ isOpen: false, ad: null });
        },
        onError: () => setDeletingAdId(null),
      });
    } else if (confirmModal.action === 'sold') {
      updateAd.mutate(
        { id: adId, data: { status: 'SOLD' } },
        {
          onSuccess: () => setConfirmModal({ isOpen: false, ad: null }),
        }
      );
    }
  };

  const handleCloseModal = () => {
    if (!deleteAd.isPending && !updateAd.isPending) {
      setConfirmModal({ isOpen: false, ad: null });
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, refetch: refetchAds } = useQuery({
    queryKey: ['user', 'ads', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (statusFilter) params.append('status', statusFilter);
      const response = await api.get(`/user/ads?${params.toString()}`);
      return response.data;
    },
    enabled: isAuthenticated && mounted,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const { data: premiumSettings } = useQuery({
    queryKey: ['premium-offers'],
    queryFn: async () => {
      const response = await api.get('/premium/offers');
      return response.data.offers;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Compute counts from all ads (fetch without status filter for counts)
  const { data: allAdsData } = useQuery({
    queryKey: ['user', 'ads', 'all'],
    queryFn: async () => {
      const response = await api.get('/user/ads?limit=200');
      return response.data;
    },
    enabled: isAuthenticated && mounted,
    staleTime: 30 * 1000,
  });

  const tabCounts = useMemo(() => {
    const ads = allAdsData?.ads || [];
    return {
      all: ads.length,
      active: ads.filter((a: any) => a.status === 'APPROVED').length,
      pending: ads.filter((a: any) => a.status === 'PENDING').length,
      sold: ads.filter((a: any) => a.status === 'SOLD').length,
      expired: ads.filter((a: any) => a.status === 'EXPIRED').length,
    };
  }, [allAdsData]);

  const filteredAds = useMemo(() => {
    const ads = data?.ads || [];
    if (!searchQuery.trim()) return ads;
    const q = searchQuery.toLowerCase().trim();
    return ads.filter(
      (ad: any) =>
        ad.title?.toLowerCase().includes(q) ||
        ad.id?.toLowerCase().includes(q) ||
        ad.category?.name?.toLowerCase().includes(q) ||
        ad.subcategory?.name?.toLowerCase().includes(q)
    );
  }, [data?.ads, searchQuery]);

  if (!mounted || authLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-gray-600 mb-4">Please login to view your ads</p>
        <Link href="/login" className="text-green-600 hover:text-green-700 font-medium">
          Login
        </Link>
      </div>
    );
  }

  const getCountForTab = (key: string) => {
    if (key === '') return tabCounts.all;
    if (key === 'APPROVED') return tabCounts.active;
    if (key === 'PENDING') return tabCounts.pending;
    if (key === 'SOLD') return tabCounts.sold;
    if (key === 'EXPIRED') return tabCounts.expired;
    return 0;
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Advertisements</h1>
        <Link
          href="/post-ad"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors shadow-sm"
        >
          <FiPlus className="w-5 h-5" />
          Post New Ad
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search your listings by title, category or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1 sm:gap-2 mb-6 border-b border-gray-200">
        {TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          const count = getCountForTab(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'text-green-600 border-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-semibold ${
                  isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ad List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-green-500 border-t-transparent mb-4" />
          <p className="text-gray-500">Loading your ads...</p>
        </div>
      ) : (
        <>
          {filteredAds.length > 0 ? (
            <div className="space-y-4">
              {filteredAds.map((ad: any) => (
                <MyAdsAdCard
                  key={ad.id}
                  ad={ad}
                  premiumPrices={premiumSettings}
                  onDelete={handleDeleteClick}
                  onMarkSold={handleMarkSoldClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
              <p className="text-gray-600 mb-2 text-lg font-medium">No ads found</p>
              <p className="text-gray-500 mb-6 text-sm">
                {searchQuery
                  ? 'Try a different search term or clear the search.'
                  : 'Start by posting your first ad, or refresh to check again.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Clear Search
                  </button>
                )}
                <button
                  onClick={() => refetchAds()}
                  className="px-6 py-3 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 font-medium"
                >
                  Refresh
                </button>
                <Link
                  href="/post-ad"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  <FiPlus className="w-5 h-5" />
                  Post Your First Ad
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmAction}
        title={confirmModal.action === 'sold' ? 'Mark as Sold' : 'Delete Ad'}
        message={
          confirmModal.action === 'sold'
            ? `Mark "${confirmModal.ad?.title}" as sold? This will update the ad status.`
            : `Are you sure you want to delete "${confirmModal.ad?.title}"?\n\nThis action cannot be undone.`
        }
        confirmText={confirmModal.action === 'sold' ? 'Mark Sold' : 'Delete'}
        cancelText="Cancel"
        type={confirmModal.action === 'sold' ? 'info' : 'danger'}
        isLoading={deleteAd.isPending || updateAd.isPending}
      />
    </div>
  );
}
