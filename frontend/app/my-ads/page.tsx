'use client';

import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import AdCardOLX from '@/components/AdCardOLX';
import Link from 'next/link';
import { FiEdit, FiTrash2, FiPlus } from 'react-icons/fi';
import { useDeleteAd, useAds } from '@/hooks/useAds';
import { useState, useEffect } from 'react';
import PremiumFeatureButton from '@/components/PremiumFeatureButton';
import ConfirmModal from '@/components/ConfirmModal';

export default function MyAdsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    ad: any | null;
  }>({
    isOpen: false,
    ad: null,
  });
  const deleteAd = useDeleteAd();

  const handleDeleteClick = (ad: any) => {
    setConfirmModal({
      isOpen: true,
      ad: ad,
    });
  };

  const handleConfirmDelete = () => {
    if (confirmModal.ad) {
      const adId = confirmModal.ad.id;
      setDeletingAdId(adId);
      deleteAd.mutate(adId, {
        onSuccess: () => {
          console.log('Ad deleted successfully:', adId);
          setDeletingAdId(null);
          setConfirmModal({ isOpen: false, ad: null });
        },
        onError: (error: any) => {
          console.error('Error deleting ad:', error);
          setDeletingAdId(null);
          // Don't close modal on error so user can see the error message
          // setConfirmModal({ isOpen: false, ad: null });
        }
      });
    }
  };

  const handleCloseModal = () => {
    if (!deleteAd.isPending) {
      setConfirmModal({ isOpen: false, ad: null });
    }
  };

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['user', 'ads', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const response = await api.get(`/user/ads?${params.toString()}`);
      return response.data;
    },
    enabled: isAuthenticated && mounted,
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    refetchOnWindowFocus: false,
  });

  // Get premium prices
  const { data: premiumSettings } = useQuery({
    queryKey: ['premium-offers'],
    queryFn: async () => {
      const response = await api.get('/premium/offers');
      return response.data.offers;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch 5 related ads (excluding user's own ads) - only fetch if user has ads
  const { data: relatedAdsData, isLoading: isLoadingRelatedAds } = useAds({
    limit: 10, // Fetch more to ensure we get 5 after filtering
    sort: 'newest'
  });

  // Filter out user's own ads from related ads
  const userAdIds = data?.ads?.map((ad: any) => ad.id) || [];
  const relatedAds = relatedAdsData?.ads?.filter((ad: any) => !userAdIds.includes(ad.id)).slice(0, 5) || [];

  // Show loading during initial mount to prevent hydration mismatch
  if (!mounted || authLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600 mb-4">Please login to view your ads</p>
        <Link href="/login" className="text-primary-600 hover:text-primary-700">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Ads</h1>
        <Link
          href="/post-ad"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <FiPlus /> Post New Ad
        </Link>
      </div>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SOLD">Sold</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Loading your ads...</p>
        </div>
      ) : (
        <>
          {data?.ads && data.ads.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {data.ads.map((ad: any, index: number) => (
                <div key={ad.id} className="relative">
                  <AdCardOGNOX ad={ad} />
                  <div className="absolute top-2 left-2 flex gap-2 z-10">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        ad.status === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : ad.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : ad.status === 'EXPIRED'
                          ? 'bg-gray-100 text-gray-800'
                          : ad.status === 'SOLD'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {ad.status}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-2 z-10">
                    <Link
                      href={`/edit-ad/${ad.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
                      title="Edit Ad"
                    >
                      <FiEdit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteClick(ad);
                      }}
                      disabled={deletingAdId === ad.id || deleteAd.isPending}
                      className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Ad"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Premium Feature Buttons */}
                  {ad.status === 'APPROVED' && (
                    <div className="absolute bottom-2 left-2 right-2 z-10">
                      <PremiumFeatureButton
                        adId={ad.id}
                        adStatus={ad.status}
                        currentPremiumType={ad.premiumType}
                        premiumPrices={premiumSettings?.prices}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <p className="text-gray-500 mb-4 text-lg">No ads found</p>
              <p className="text-gray-400 mb-6 text-sm">Start by posting your first ad!</p>
              <Link
                href="/post-ad"
                className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Post Your First Ad
              </Link>
            </div>
          )}
        </>
      )}

      {/* Related Ads Section - Show 5 ads after user's ads */}
      {data?.ads && data.ads.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">You Might Also Like</h2>
              <p className="text-gray-500 mt-1">Similar ads you might be interested in</p>
            </div>
            <Link
              href="/ads"
              className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
            >
              View All <span>→</span>
            </Link>
          </div>
          {isLoadingRelatedAds ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-500 text-sm">Loading related ads...</p>
            </div>
          ) : relatedAds.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {relatedAds.map((ad: any) => (
                <AdCardOGNOX key={ad.id} ad={ad} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-lg shadow-sm">
              <p className="text-gray-500">No related ads available at the moment</p>
              <Link
                href="/ads"
                className="text-primary-600 hover:text-primary-700 mt-2 inline-block"
              >
                Browse all ads →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="Delete Ad"
        message={`Are you sure you want to delete "${confirmModal.ad?.title}"?\n\nThis action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteAd.isPending}
      />
    </div>
  );
}

