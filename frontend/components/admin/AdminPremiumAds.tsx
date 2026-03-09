'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from '@/lib/toast';
import { FiStar, FiTrendingUp, FiRefreshCw, FiAlertCircle, FiX, FiCalendar, FiSettings } from 'react-icons/fi';
import { format, addDays } from 'date-fns';
import ImageWithFallback from '../ImageWithFallback';
import AdminPremiumSettings from './AdminPremiumSettings';

type PremiumType = 'TOP' | 'FEATURED' | 'BUMP_UP' | 'URGENT' | 'ALL' | 'SETTINGS';

export default function AdminPremiumAds() {
  const [activeTab, setActiveTab] = useState<'TOP' | 'FEATURED' | 'BUMP_UP' | 'URGENT' | 'ALL' | 'SETTINGS'>('ALL');
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [customDays, setCustomDays] = useState<number>(7);
  const [actionType, setActionType] = useState<string>('');
  const queryClient = useQueryClient();

  // Get premium settings
  const { data: settings } = useQuery({
    queryKey: ['admin', 'premium-settings'],
    queryFn: async () => {
      const response = await api.get('/admin/premium/settings');
      return response.data.settings;
    },
  });

  // Get premium ads
  const isSettingsTab = activeTab === 'SETTINGS';
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'premium-ads', activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL' && !isSettingsTab) {
        params.append('type', activeTab);
      }
      const response = await api.get(`/admin/premium/premium-ads?${params.toString()}`);
      return response.data;
    },
    enabled: !isSettingsTab,
  });

  // Get all premium ads for stats (always fetch all to get accurate counts)
  const { data: allAdsData, error: allAdsError } = useQuery({
    queryKey: ['admin', 'premium-ads', 'ALL'],
    queryFn: async () => {
      const response = await api.get('/admin/premium/premium-ads');
      return response.data;
    },
    enabled: !isSettingsTab,
  });

  // Make TOP premium mutation
  const makeTopMutation = useMutation({
    mutationFn: async ({ adId, days }: { adId: string; days?: number }) => {
      const response = await api.post(`/admin/premium/ads/${adId}/make-top`, { days });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'premium-ads'] });
      toast.success('Ad made TOP premium');
      setSelectedAd(null);
    },
  });

  // Make FEATURED premium mutation
  const makeFeaturedMutation = useMutation({
    mutationFn: async ({ adId, days }: { adId: string; days?: number }) => {
      const response = await api.post(`/admin/premium/ads/${adId}/make-featured`, { days });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'premium-ads'] });
      toast.success('Ad made featured');
      setSelectedAd(null);
    },
  });

  // Bump ad mutation
  const bumpAdMutation = useMutation({
    mutationFn: async (adId: string) => {
      const response = await api.post(`/admin/premium/ads/${adId}/bump`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'premium-ads'] });
      toast.success('Ad bumped successfully');
      setSelectedAd(null);
    },
  });

  // Make urgent mutation
  const makeUrgentMutation = useMutation({
    mutationFn: async ({ adId, days }: { adId: string; days?: number }) => {
      const response = await api.post(`/admin/premium/ads/${adId}/make-urgent`, { days });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'premium-ads'] });
      toast.success('Ad marked as urgent');
      setSelectedAd(null);
    },
  });

  // Remove premium mutation
  const removePremiumMutation = useMutation({
    mutationFn: async (adId: string) => {
      const response = await api.post(`/admin/premium/ads/${adId}/remove-premium`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'premium-ads'] });
      toast.success('Premium status removed');
      setSelectedAd(null);
    },
  });

  // Update expiry mutation
  const updateExpiryMutation = useMutation({
    mutationFn: async ({ adId, expiresAt }: { adId: string; expiresAt: string }) => {
      const response = await api.put(`/admin/premium/ads/${adId}/premium-expiry`, { expiresAt });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'premium-ads'] });
      toast.success('Premium expiry updated');
      setShowExpiryModal(false);
      setSelectedAd(null);
    },
  });

  const handleMakeTop = (ad: any) => {
    setSelectedAd(ad);
    setActionType('TOP');
    setCustomDays(settings?.durations?.TOP || 7);
    setShowExpiryModal(true);
  };

  const handleMakeFeatured = (ad: any) => {
    setSelectedAd(ad);
    setActionType('FEATURED');
    setCustomDays(settings?.durations?.FEATURED || 14);
    setShowExpiryModal(true);
  };

  const handleMakeUrgent = (ad: any) => {
    setSelectedAd(ad);
    setActionType('URGENT');
    setCustomDays(settings?.durations?.URGENT || 7);
    setShowExpiryModal(true);
  };

  const handleUpdateExpiry = () => {
    if (!selectedAd) return;
    const expiresAt = addDays(new Date(), customDays).toISOString();
    updateExpiryMutation.mutate({ adId: selectedAd.id, expiresAt });
  };

  const confirmAction = () => {
    if (!selectedAd) return;
    
    switch (actionType) {
      case 'TOP':
        makeTopMutation.mutate({ adId: selectedAd.id, days: customDays });
        break;
      case 'FEATURED':
        makeFeaturedMutation.mutate({ adId: selectedAd.id, days: customDays });
        break;
      case 'URGENT':
        makeUrgentMutation.mutate({ adId: selectedAd.id, days: customDays });
        break;
      case 'UPDATE_EXPIRY':
        handleUpdateExpiry();
        break;
    }
    setShowExpiryModal(false);
    setActionType('');
  };

  if (isLoading && !isSettingsTab) {
    return <div className="text-center py-12">Loading premium ads...</div>;
  }

  if (error) {
    console.error('Error loading premium ads:', error);
    return <div className="text-center py-12 text-red-500">Error loading premium ads. Please try again.</div>;
  }

  const ads = data?.ads || [];
  // Use allAdsData for stats to get accurate total counts
  const allAds = allAdsData?.ads || [];
  const stats = {
    all: allAds.length,
    top: allAds.filter((a: any) => a.premiumType === 'TOP').length,
    featured: allAds.filter((a: any) => a.premiumType === 'FEATURED').length,
    bump: allAds.filter((a: any) => a.premiumType === 'BUMP_UP').length,
    urgent: allAds.filter((a: any) => a.isUrgent).length,
  };

  return (
    <div className="space-y-6">
      {/* Settings Tab Content */}
      {isSettingsTab && <AdminPremiumSettings />}

      {/* Premium Ads Management (for other tabs) */}
      {!isSettingsTab && (
        <>
          {/* Premium Settings Display */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FiSettings className="w-5 h-5" />
                Premium Settings
              </h2>
            </div>
            {settings && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FiStar className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">TOP</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">₹{settings.prices?.TOP || 299}</p>
                  <p className="text-xs text-gray-500">{settings.durations?.TOP || 7} days</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FiTrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">FEATURED</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">₹{settings.prices?.FEATURED || 199}</p>
                  <p className="text-xs text-gray-500">{settings.durations?.FEATURED || 14} days</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FiRefreshCw className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">BUMP UP</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">₹{settings.prices?.BUMP_UP || 99}</p>
                  <p className="text-xs text-gray-500">{settings.durations?.BUMP_UP || 1} days</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FiAlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">URGENT</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">₹{settings.prices?.URGENT || 49}</p>
                  <p className="text-xs text-gray-500">{settings.durations?.URGENT || 7} days</p>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
              <button
                onClick={() => setActiveTab('SETTINGS')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isSettingsTab
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiSettings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'ALL'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Premium ({stats.all})
              </button>
              <button
                onClick={() => setActiveTab('TOP')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === 'TOP'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiStar className="w-4 h-4" />
                Top Ads ({stats.top})
              </button>
              <button
                onClick={() => setActiveTab('FEATURED')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === 'FEATURED'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiTrendingUp className="w-4 h-4" />
                Featured ({stats.featured})
              </button>
              <button
                onClick={() => setActiveTab('BUMP_UP')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === 'BUMP_UP'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiRefreshCw className="w-4 h-4" />
                Bump Ads ({stats.bump})
              </button>
              <button
                onClick={() => setActiveTab('URGENT')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === 'URGENT'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiAlertCircle className="w-4 h-4" />
                Urgent ({stats.urgent})
              </button>
            </div>

            {/* Ads List */}
            <div className="space-y-4">
              {ads.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No {activeTab === 'ALL' ? 'premium' : activeTab.toLowerCase()} ads found
                </div>
              ) : (
                ads.map((ad: any) => (
                  <div
                    key={ad.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {ad.images && ad.images.length > 0 && (
                        <ImageWithFallback
                          src={ad.images[0]}
                          alt={ad.title}
                          width={120}
                          height={120}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{ad.title}</h3>
                            <p className="text-gray-600 mb-2">₹{ad.price.toLocaleString('en-IN')}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {ad.premiumType && (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  ad.premiumType === 'TOP' ? 'bg-yellow-100 text-yellow-800' :
                                  ad.premiumType === 'FEATURED' ? 'bg-blue-100 text-blue-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {ad.premiumType}
                                </span>
                              )}
                              {ad.isUrgent && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                                  URGENT
                                </span>
                              )}
                              {ad.premiumExpiresAt && (
                                <span className="text-xs text-gray-500">
                                  Expires: {format(new Date(ad.premiumExpiresAt), 'MMM dd, yyyy')}
                                </span>
                              )}
                              {/* Payment Information */}
                              {ad.premiumOrders && ad.premiumOrders.length > 0 && (
                                <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-semibold border border-green-200">
                                  💳 Paid: ₹{ad.premiumOrders[0].amount} ({ad.premiumOrders[0].type})
                                </span>
                              )}
                              {ad.adPostingOrders && ad.adPostingOrders.length > 0 && (
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold border border-blue-200">
                                  💰 Posting: ₹{ad.adPostingOrders[0].amount}
                                </span>
                              )}
                              {!ad.isPremium && !ad.isUrgent && 
                               (!ad.premiumOrders || ad.premiumOrders.length === 0) && 
                               (!ad.adPostingOrders || ad.adPostingOrders.length === 0) && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  Free
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {ad.premiumType !== 'TOP' && (
                              <button
                                onClick={() => handleMakeTop(ad)}
                                disabled={makeTopMutation.isPending}
                                className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 disabled:opacity-50"
                              >
                                Make TOP
                              </button>
                            )}
                            {ad.premiumType !== 'FEATURED' && (
                              <button
                                onClick={() => handleMakeFeatured(ad)}
                                disabled={makeFeaturedMutation.isPending}
                                className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                              >
                                Make Featured
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedAd(ad);
                                bumpAdMutation.mutate(ad.id);
                              }}
                              disabled={bumpAdMutation.isPending}
                              className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
                            >
                              Bump/Refresh
                            </button>
                            {!ad.isUrgent && (
                              <button
                                onClick={() => handleMakeUrgent(ad)}
                                disabled={makeUrgentMutation.isPending}
                                className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
                              >
                                Mark Urgent
                              </button>
                            )}
                            {(ad.isPremium || ad.isUrgent) && (
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to remove premium status?')) {
                                    removePremiumMutation.mutate(ad.id);
                                  }
                                }}
                                disabled={removePremiumMutation.isPending}
                                className="px-3 py-1.5 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:opacity-50"
                              >
                                Remove Premium
                              </button>
                            )}
                            {ad.premiumExpiresAt && (
                              <button
                                onClick={() => {
                                  setSelectedAd(ad);
                                  setActionType('UPDATE_EXPIRY');
                                  const daysLeft = Math.ceil((new Date(ad.premiumExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                  setCustomDays(daysLeft > 0 ? daysLeft : 7);
                                  setShowExpiryModal(true);
                                }}
                                className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                              >
                                <FiCalendar className="w-4 h-4 inline mr-1" />
                                Update Expiry
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Expiry Modal */}
      {showExpiryModal && selectedAd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Set Premium Duration</h3>
              <button
                onClick={() => {
                  setShowExpiryModal(false);
                  setSelectedAd(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Duration (days)</label>
                <input
                  type="number"
                  min="1"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Expires on: {format(addDays(new Date(), customDays), 'MMM dd, yyyy')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={confirmAction}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                >
                  {actionType === 'TOP'
                    ? 'Make TOP'
                    : actionType === 'FEATURED'
                    ? 'Make Featured'
                    : actionType === 'URGENT'
                    ? 'Mark Urgent'
                    : 'Update Expiry'}
                </button>
                <button
                  onClick={() => {
                    setShowExpiryModal(false);
                    setSelectedAd(null);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
