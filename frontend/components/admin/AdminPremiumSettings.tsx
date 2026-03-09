'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from '@/lib/toast';
import { FiSettings, FiSave, FiDollarSign, FiClock, FiUpload, FiX } from 'react-icons/fi';
import ImageWithFallback from '../ImageWithFallback';

export default function AdminPremiumSettings() {
  const queryClient = useQueryClient();
  const [prices, setPrices] = useState({
    TOP: 299,
    FEATURED: 199,
    BUMP_UP: 99,
    URGENT: 49,
  });
  const [offerPrices, setOfferPrices] = useState({
    TOP: null as number | null,
    FEATURED: null as number | null,
    BUMP_UP: null as number | null,
    URGENT: null as number | null,
  });
  const [durations, setDurations] = useState({
    TOP: 7,
    FEATURED: 14,
    BUMP_UP: 1,
    URGENT: 7,
  });
  const [offerImage, setOfferImage] = useState<File | null>(null);
  const [offerImageUrl, setOfferImageUrl] = useState<string | null>(null);
  const [shouldDeleteImage, setShouldDeleteImage] = useState(false);

  // Get current settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin', 'premium-settings'],
    queryFn: async () => {
      const response = await api.get('/admin/premium/settings');
      return response.data.settings;
    },
  });

  // Update local state when settings data is loaded
  useEffect(() => {
    if (settingsData) {
      setPrices(settingsData.prices || prices);
      setOfferPrices(settingsData.offerPrices || offerPrices);
      setDurations(settingsData.durations || durations);
      setOfferImageUrl(settingsData.offerImage || null);
    }
  }, [settingsData]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.put('/admin/premium/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'premium-settings'] });
      queryClient.invalidateQueries({ queryKey: ['premium-settings'] });
      queryClient.invalidateQueries({ queryKey: ['premium-offers'] }); // Invalidate user-facing offers
      toast.success('Premium settings updated successfully! Users will see the new offers.');
      setOfferImage(null); // Clear file after successful upload
      setShouldDeleteImage(false); // Reset delete flag after successful save
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    },
  });

  const handleSave = () => {
    const formData = new FormData();
    formData.append('prices', JSON.stringify(prices));
    formData.append('offerPrices', JSON.stringify(offerPrices));
    formData.append('durations', JSON.stringify(durations));
    
    if (offerImage) {
      formData.append('offerImage', offerImage);
    }
    
    if (shouldDeleteImage) {
      formData.append('deleteOfferImage', 'true');
    }
    
    updateSettingsMutation.mutate(formData);
  };

  const handleImageChange = (file: File | null) => {
    setOfferImage(file);
    setShouldDeleteImage(false); // Reset delete flag when new image is selected
    if (file) {
      const url = URL.createObjectURL(file);
      setOfferImageUrl(url);
    }
  };

  const handleRemoveImage = () => {
    setOfferImage(null);
    setOfferImageUrl(null);
    setShouldDeleteImage(true); // Mark image for deletion
  };

  // Calculate discount percentage
  const getDiscountPercentage = (original: number, offer: number | null) => {
    if (!offer || offer >= original) return 0;
    return Math.round(((original - offer) / original) * 100);
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3 mb-2">
              <FiSettings className="w-8 h-8" />
              Premium Offers Management
            </h2>
            <p className="text-primary-100">
              Configure premium ad pricing and durations. Changes will be visible to users immediately.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="px-6 py-3 bg-white text-primary-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-lg"
          >
            <FiSave className="w-5 h-5" />
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Offers'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">

        {/* Pricing Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiDollarSign className="w-5 h-5 text-green-600" />
            Premium Pricing (₹)
          </h3>
          <div className="space-y-6">
            {/* TOP Ads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div>
                <label className="block text-sm font-medium mb-2">TOP Ads - Original Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={prices.TOP}
                  onChange={(e) => setPrices({ ...prices, TOP: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  TOP Ads - Offer Price (Optional)
                  {offerPrices.TOP && offerPrices.TOP < prices.TOP && (
                    <span className="ml-2 text-red-600 font-bold">
                      {getDiscountPercentage(prices.TOP, offerPrices.TOP)}% OFF
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={offerPrices.TOP || ''}
                  onChange={(e) => setOfferPrices({ ...offerPrices, TOP: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Leave empty for no offer"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Featured Ads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium mb-2">Featured Ads - Original Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={prices.FEATURED}
                  onChange={(e) => setPrices({ ...prices, FEATURED: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Featured Ads - Offer Price (Optional)
                  {offerPrices.FEATURED && offerPrices.FEATURED < prices.FEATURED && (
                    <span className="ml-2 text-red-600 font-bold">
                      {getDiscountPercentage(prices.FEATURED, offerPrices.FEATURED)}% OFF
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={offerPrices.FEATURED || ''}
                  onChange={(e) => setOfferPrices({ ...offerPrices, FEATURED: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Leave empty for no offer"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Bump Up */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <label className="block text-sm font-medium mb-2">Bump Up - Original Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={prices.BUMP_UP}
                  onChange={(e) => setPrices({ ...prices, BUMP_UP: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Bump Up - Offer Price (Optional)
                  {offerPrices.BUMP_UP && offerPrices.BUMP_UP < prices.BUMP_UP && (
                    <span className="ml-2 text-red-600 font-bold">
                      {getDiscountPercentage(prices.BUMP_UP, offerPrices.BUMP_UP)}% OFF
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={offerPrices.BUMP_UP || ''}
                  onChange={(e) => setOfferPrices({ ...offerPrices, BUMP_UP: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Leave empty for no offer"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Urgent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div>
                <label className="block text-sm font-medium mb-2">Urgent Badge - Original Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={prices.URGENT}
                  onChange={(e) => setPrices({ ...prices, URGENT: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Urgent Badge - Offer Price (Optional)
                  {offerPrices.URGENT && offerPrices.URGENT < prices.URGENT && (
                    <span className="ml-2 text-red-600 font-bold">
                      {getDiscountPercentage(prices.URGENT, offerPrices.URGENT)}% OFF
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={offerPrices.URGENT || ''}
                  onChange={(e) => setOfferPrices({ ...offerPrices, URGENT: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Leave empty for no offer"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Offer Image Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiUpload className="w-5 h-5 text-purple-600" />
            Offer Image (Optional)
          </h3>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600 mb-4">
              Upload a promotional image for premium offers. This image will be displayed to users when viewing premium options.
            </p>
            {offerImageUrl ? (
              <div className="relative inline-block">
                <ImageWithFallback
                  src={offerImageUrl}
                  alt="Offer Image"
                  width={300}
                  height={200}
                  className="rounded-lg border-2 border-purple-300 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FiUpload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">Click to upload offer image</p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Duration Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiClock className="w-5 h-5 text-blue-600" />
            Premium Durations (Days)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">TOP Ads Duration</label>
              <input
                type="number"
                min="1"
                value={durations.TOP}
                onChange={(e) => setDurations({ ...durations, TOP: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Featured Ads Duration</label>
              <input
                type="number"
                min="1"
                value={durations.FEATURED}
                onChange={(e) => setDurations({ ...durations, FEATURED: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bump Up Duration</label>
              <input
                type="number"
                min="1"
                value={durations.BUMP_UP}
                onChange={(e) => setDurations({ ...durations, BUMP_UP: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Urgent Badge Duration</label>
              <input
                type="number"
                min="1"
                value={durations.URGENT}
                onChange={(e) => setDurations({ ...durations, URGENT: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Summary & Preview */}
        <div className="mt-8 space-y-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-4 text-lg">Current Offers Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border-2 border-yellow-200">
              <p className="text-gray-600 text-sm mb-1">TOP Ads</p>
              <div className="flex items-baseline gap-2">
                {offerPrices.TOP && offerPrices.TOP < prices.TOP ? (
                  <>
                    <p className="text-lg font-bold text-yellow-600">₹{offerPrices.TOP}</p>
                    <p className="text-sm text-gray-400 line-through">₹{prices.TOP}</p>
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">
                      {getDiscountPercentage(prices.TOP, offerPrices.TOP)}% OFF
                    </span>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-yellow-600">₹{prices.TOP}</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{durations.TOP} days</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
              <p className="text-gray-600 text-sm mb-1">Featured</p>
              <div className="flex items-baseline gap-2">
                {offerPrices.FEATURED && offerPrices.FEATURED < prices.FEATURED ? (
                  <>
                    <p className="text-lg font-bold text-blue-600">₹{offerPrices.FEATURED}</p>
                    <p className="text-sm text-gray-400 line-through">₹{prices.FEATURED}</p>
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">
                      {getDiscountPercentage(prices.FEATURED, offerPrices.FEATURED)}% OFF
                    </span>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-blue-600">₹{prices.FEATURED}</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{durations.FEATURED} days</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-green-200">
              <p className="text-gray-600 text-sm mb-1">Bump Up</p>
              <div className="flex items-baseline gap-2">
                {offerPrices.BUMP_UP && offerPrices.BUMP_UP < prices.BUMP_UP ? (
                  <>
                    <p className="text-lg font-bold text-green-600">₹{offerPrices.BUMP_UP}</p>
                    <p className="text-sm text-gray-400 line-through">₹{prices.BUMP_UP}</p>
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">
                      {getDiscountPercentage(prices.BUMP_UP, offerPrices.BUMP_UP)}% OFF
                    </span>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-green-600">₹{prices.BUMP_UP}</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{durations.BUMP_UP} day(s)</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-red-200">
              <p className="text-gray-600 text-sm mb-1">Urgent</p>
              <div className="flex items-baseline gap-2">
                {offerPrices.URGENT && offerPrices.URGENT < prices.URGENT ? (
                  <>
                    <p className="text-lg font-bold text-red-600">₹{offerPrices.URGENT}</p>
                    <p className="text-sm text-gray-400 line-through">₹{prices.URGENT}</p>
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">
                      {getDiscountPercentage(prices.URGENT, offerPrices.URGENT)}% OFF
                    </span>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-red-600">₹{prices.URGENT}</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{durations.URGENT} days</p>
            </div>
            </div>
          </div>

          {/* User Preview */}
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h4 className="font-semibold mb-3 text-lg text-blue-900">👁️ User Preview</h4>
            <p className="text-sm text-blue-700 mb-3">
              This is how users will see the offers when posting ads:
            </p>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border-2 border-yellow-200 rounded-lg bg-yellow-50">
                  <p className="font-semibold text-sm mb-1">⭐ TOP Ads</p>
                  <p className="text-lg font-bold">₹{prices.TOP}</p>
                  <p className="text-xs text-gray-600">{durations.TOP} days</p>
                </div>
                <div className="p-3 border-2 border-blue-200 rounded-lg bg-blue-50">
                  <p className="font-semibold text-sm mb-1">📈 Featured</p>
                  <p className="text-lg font-bold">₹{prices.FEATURED}</p>
                  <p className="text-xs text-gray-600">{durations.FEATURED} days</p>
                </div>
                <div className="p-3 border-2 border-green-200 rounded-lg bg-green-50">
                  <p className="font-semibold text-sm mb-1">🔄 Bump Up</p>
                  <p className="text-lg font-bold">₹{prices.BUMP_UP}</p>
                  <p className="text-xs text-gray-600">{durations.BUMP_UP} day(s)</p>
                </div>
              </div>
              <div className="mt-3 p-3 border-2 border-red-200 rounded-lg bg-red-50">
                <p className="font-semibold text-sm mb-1">🚨 Urgent Badge</p>
                <p className="text-lg font-bold">₹{prices.URGENT}</p>
                <p className="text-xs text-gray-600">{durations.URGENT} days</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

