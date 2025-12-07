'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiSettings, FiSave, FiDollarSign, FiClock, FiBriefcase, FiUsers } from 'react-icons/fi';

export default function AdminBusinessPackages() {
  const queryClient = useQueryClient();
  const [prices, setPrices] = useState({
    MAX_VISIBILITY: 299,
    SELLER_PLUS: 399,
    SELLER_PRIME: 499,
  });
  const [durations, setDurations] = useState({
    MAX_VISIBILITY: 30,
    SELLER_PLUS: 30,
    SELLER_PRIME: 30,
  });
  const [maxAds, setMaxAds] = useState({
    MAX_VISIBILITY: 5,
    SELLER_PLUS: 7,
    SELLER_PRIME: 12,
  });
  const [descriptions, setDescriptions] = useState({
    MAX_VISIBILITY: 'Maximum visibility for your ads',
    SELLER_PLUS: 'Enhanced features for serious sellers',
    SELLER_PRIME: 'Premium package with all features',
  });
  const [activeTab, setActiveTab] = useState<'settings' | 'orders'>('settings');

  // Get current settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin', 'business-package-settings'],
    queryFn: async () => {
      const response = await api.get('/admin/premium/business-packages');
      return response.data.settings;
    },
  });

  // Get business package orders
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['admin', 'business-package-orders'],
    queryFn: async () => {
      const response = await api.get('/admin/premium/business-packages/orders');
      return response.data;
    },
    enabled: activeTab === 'orders',
  });

  // Update local state when settings data is loaded
  useEffect(() => {
    if (settingsData) {
      setPrices(settingsData.prices || prices);
      setDurations(settingsData.durations || durations);
      setMaxAds(settingsData.maxAds || maxAds);
      setDescriptions(settingsData.descriptions || descriptions);
    }
  }, [settingsData]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put('/admin/premium/business-packages', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'business-package-settings'] });
      queryClient.invalidateQueries({ queryKey: ['business-package', 'info'] });
      toast.success('Business package settings updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({
      prices,
      durations,
      maxAds,
      descriptions,
    });
  };

  const packageNames = {
    MAX_VISIBILITY: 'Max Visibility',
    SELLER_PLUS: 'Seller Plus',
    SELLER_PRIME: 'Seller Prime',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FiBriefcase className="text-primary-600" /> Business Packages
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'settings'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FiSettings className="inline mr-2" /> Settings
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'orders'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FiUsers className="inline mr-2" /> Orders
          </button>
        </div>
      </div>

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-6">
            {/* Max Visibility */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-primary-600">Max Visibility</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiDollarSign className="inline mr-1" /> Price (₹)
                  </label>
                  <input
                    type="number"
                    value={prices.MAX_VISIBILITY}
                    onChange={(e) =>
                      setPrices({ ...prices, MAX_VISIBILITY: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiClock className="inline mr-1" /> Duration (days)
                  </label>
                  <input
                    type="number"
                    value={durations.MAX_VISIBILITY}
                    onChange={(e) =>
                      setDurations({
                        ...durations,
                        MAX_VISIBILITY: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiBriefcase className="inline mr-1" /> Max Ads
                  </label>
                  <input
                    type="number"
                    value={maxAds.MAX_VISIBILITY}
                    onChange={(e) =>
                      setMaxAds({
                        ...maxAds,
                        MAX_VISIBILITY: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="1"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={descriptions.MAX_VISIBILITY}
                  onChange={(e) =>
                    setDescriptions({
                      ...descriptions,
                      MAX_VISIBILITY: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Package description"
                />
              </div>
            </div>

            {/* Seller Plus */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-primary-600">Seller Plus</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiDollarSign className="inline mr-1" /> Price (₹)
                  </label>
                  <input
                    type="number"
                    value={prices.SELLER_PLUS}
                    onChange={(e) =>
                      setPrices({ ...prices, SELLER_PLUS: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiClock className="inline mr-1" /> Duration (days)
                  </label>
                  <input
                    type="number"
                    value={durations.SELLER_PLUS}
                    onChange={(e) =>
                      setDurations({
                        ...durations,
                        SELLER_PLUS: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiBriefcase className="inline mr-1" /> Max Ads
                  </label>
                  <input
                    type="number"
                    value={maxAds.SELLER_PLUS}
                    onChange={(e) =>
                      setMaxAds({
                        ...maxAds,
                        SELLER_PLUS: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="1"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={descriptions.SELLER_PLUS}
                  onChange={(e) =>
                    setDescriptions({
                      ...descriptions,
                      SELLER_PLUS: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Package description"
                />
              </div>
            </div>

            {/* Seller Prime */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-primary-600">Seller Prime</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiDollarSign className="inline mr-1" /> Price (₹)
                  </label>
                  <input
                    type="number"
                    value={prices.SELLER_PRIME}
                    onChange={(e) =>
                      setPrices({ ...prices, SELLER_PRIME: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiClock className="inline mr-1" /> Duration (days)
                  </label>
                  <input
                    type="number"
                    value={durations.SELLER_PRIME}
                    onChange={(e) =>
                      setDurations({
                        ...durations,
                        SELLER_PRIME: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="1"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiBriefcase className="inline mr-1" /> Max Ads
                  </label>
                  <input
                    type="number"
                    value={maxAds.SELLER_PRIME}
                    onChange={(e) =>
                      setMaxAds({
                        ...maxAds,
                        SELLER_PRIME: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    step="1"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={descriptions.SELLER_PRIME}
                  onChange={(e) =>
                    setDescriptions({
                      ...descriptions,
                      SELLER_PRIME: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Package description"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FiSave /> {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          {isLoadingOrders ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Package
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ordersData?.orders?.map((order: any) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.user?.name}</div>
                          <div className="text-sm text-gray-500">{order.user?.email || order.user?.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800">
                          {packageNames[order.packageType as keyof typeof packageNames] || order.packageType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{order.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.startDate ? new Date(order.startDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.expiresAt ? new Date(order.expiresAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!ordersData?.orders || ordersData.orders.length === 0) && (
                <div className="text-center py-8 text-gray-500">No orders found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

