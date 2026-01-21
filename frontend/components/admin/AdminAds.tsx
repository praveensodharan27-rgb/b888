'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import ImageWithFallback from '../ImageWithFallback';

type AdminAdsResponse = {
  ads: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export default function AdminAds() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedAd, setSelectedAd] = useState<any | null>(null);
  const [specDraft, setSpecDraft] = useState<Record<string, string>>({});
  const [editingBrandFor, setEditingBrandFor] = useState<string | null>(null);
  const [brandValue, setBrandValue] = useState<string>('');
  const [showBulkBrandUpdate, setShowBulkBrandUpdate] = useState(false);
  const [bulkBrandValue, setBulkBrandValue] = useState<string>('');

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AdminAdsResponse>({
    queryKey: ['admin', 'ads', statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      const response = await api.get(`/admin/ads?${params.toString()}`);
      return response.data;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const response = await api.get('/admin/categories');
      return response.data.categories;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const response = await api.put(`/admin/ads/${id}/status`, { status, reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] });
      toast.success('Ad status updated');
    },
  });

  const updateAttributesMutation = useMutation({
    mutationFn: async ({ id, attributes }: { id: string; attributes: Record<string, string> }) => {
      // Use the same bulk-spec-update endpoint but scoped to a single ad via where.id
      const response = await api.put('/admin/products/bulk-spec-update', {
        categoryId: selectedAd?.category?.id,
        updates: attributes,
        where: { id },
        previewOnly: false,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Specifications updated');
      setSelectedAd(null);
      setSpecDraft({});
      queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update specifications');
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: async ({ id, brand }: { id: string; brand: string }) => {
      const ad = data?.ads.find((a: any) => a.id === id);
      const currentAttrs = (ad?.attributes || {}) as Record<string, string>;
      const response = await api.put('/admin/products/bulk-spec-update', {
        categoryId: ad?.category?.id,
        updates: { ...currentAttrs, brand },
        where: { id },
        previewOnly: false,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Brand updated');
      setEditingBrandFor(null);
      setBrandValue('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update brand');
    },
  });

  const bulkUpdateBrandMutation = useMutation({
    mutationFn: async ({ brand, categoryId }: { brand: string; categoryId?: string }) => {
      const response = await api.put('/admin/products/bulk-spec-update', {
        categoryId: categoryFilter || categoryId,
        updates: { brand },
        where: {}, // Empty where = all products in category
        previewOnly: false,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Brand updated for ${data.updatedCount || 0} products`);
      setShowBulkBrandUpdate(false);
      setBulkBrandValue('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update brand');
    },
  });

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const openSpecsEditor = (ad: any) => {
    const attrs = (ad.attributes || {}) as Record<string, string>;
    setSelectedAd(ad);
    setSpecDraft(attrs);
  };

  const handleSpecChange = (key: string, value: string) => {
    setSpecDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSpecs = () => {
    if (!selectedAd) return;
    updateAttributesMutation.mutate({ id: selectedAd.id, attributes: specDraft });
  };

  const handleAddSpecField = () => {
    const newKey = prompt('Enter new specification key (e.g. brand, model, storage):');
    if (!newKey) return;
    if (specDraft[newKey]) {
      toast.error('This spec key already exists');
      return;
    }
    setSpecDraft((prev) => ({ ...prev, [newKey]: '' }));
  };

  const openBrandEditor = (ad: any) => {
    const attrs = (ad.attributes || {}) as Record<string, string>;
    setEditingBrandFor(ad.id);
    setBrandValue(attrs.brand || '');
  };

  const handleSaveBrand = () => {
    if (!editingBrandFor || !brandValue.trim()) {
      toast.error('Please enter a brand name');
      return;
    }
    updateBrandMutation.mutate({ id: editingBrandFor, brand: brandValue.trim() });
  };

  const handleBulkUpdateBrand = () => {
    if (!bulkBrandValue.trim()) {
      toast.error('Please enter a brand name');
      return;
    }
    if (!categoryFilter) {
      toast.error('Please select a category first');
      return;
    }
    if (confirm(`This will update brand to "${bulkBrandValue.trim()}" for ALL products in the selected category. Are you sure?`)) {
      bulkUpdateBrandMutation.mutate({ brand: bulkBrandValue.trim(), categoryId: categoryFilter });
    }
  };

  if (isLoading) {
    return <div>Loading ads...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Categories</option>
          {categoriesData?.map((cat: any) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <span className="text-sm text-gray-600">
          Total ads: <span className="font-semibold">{data?.pagination?.total ?? 0}</span>
        </span>

        {categoryFilter && (
          <button
            onClick={() => setShowBulkBrandUpdate(!showBulkBrandUpdate)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
          >
            {showBulkBrandUpdate ? 'Cancel Bulk Update' : 'Bulk Update Brand'}
          </button>
        )}
      </div>

      {/* Bulk Brand Update Section */}
      {showBulkBrandUpdate && categoryFilter && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-orange-900">Bulk Update Brand for All Products</h3>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={bulkBrandValue}
              onChange={(e) => setBulkBrandValue(e.target.value)}
              placeholder="Enter new brand name (e.g., Xiaomi, Samsung)"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={handleBulkUpdateBrand}
              disabled={bulkUpdateBrandMutation.isPending}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {bulkUpdateBrandMutation.isPending ? 'Updating...' : 'Update All Products'}
            </button>
          </div>
          <p className="text-xs text-orange-700">
            This will update the brand for ALL {data?.pagination?.total ?? 0} products in the selected category.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.ads.map((ad: any) => (
              <tr key={ad.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    {ad.images && ad.images.length > 0 && (
                      <ImageWithFallback
                        src={ad.images[0]}
                        alt={ad.title}
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{ad.title}</p>
                      <p className="text-sm text-gray-500">₹{ad.price.toLocaleString()}</p>
                      {ad.category && (
                        <p className="text-xs text-gray-400">
                          {ad.category.name}
                          {ad.subcategory ? ` / ${ad.subcategory.name}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Link 
                    href={`/user/${ad.user.id}`}
                    className="hover:text-primary-600 transition-colors"
                  >
                    <p className="font-medium">{ad.user.name}</p>
                  </Link>
                  <p className="text-sm text-gray-500">{ad.user.email || ad.user.phone}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    ad.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    ad.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {ad.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {ad.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(ad.id, 'APPROVED')}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(ad.id, 'REJECTED')}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => openBrandEditor(ad)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                      title="Quick edit brand"
                    >
                      Edit Brand
                    </button>
                    <button
                      type="button"
                      onClick={() => openSpecsEditor(ad)}
                      className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                    >
                      Edit Specs
                    </button>
                    <a
                      href={`/ads/${ad.id}`}
                      target="_blank"
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      View
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-product specifications editor */}
      {selectedAd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Edit Specifications</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedAd.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedAd(null);
                  setSpecDraft({});
                }}
                className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              {Object.keys(specDraft).length === 0 && (
                <p className="text-sm text-gray-500">
                  No specifications yet. Click &quot;Add Specification Field&quot; to start.
                </p>
              )}

              {Object.entries(specDraft).map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Key</label>
                    <input
                      type="text"
                      value={key}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-50 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Value</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleSpecChange(key, e.target.value)}
                      className="w-full px-3 py-2 border rounded text-sm"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddSpecField}
                className="px-3 py-1 text-sm bg-gray-100 border rounded hover:bg-gray-200"
              >
                Add Specification Field
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedAd(null);
                  setSpecDraft({});
                }}
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSpecs}
                disabled={updateAttributesMutation.isPending}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
              >
                {updateAttributesMutation.isPending ? 'Saving...' : 'Save Specifications'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Brand Editor Modal */}
      {editingBrandFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Brand</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingBrandFor(null);
                  setBrandValue('');
                }}
                className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Name
              </label>
              <input
                type="text"
                value={brandValue}
                onChange={(e) => setBrandValue(e.target.value)}
                placeholder="Enter brand name (e.g., Xiaomi, Samsung, Apple)"
                className="w-full px-4 py-2 border rounded-lg"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingBrandFor(null);
                  setBrandValue('');
                }}
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBrand}
                disabled={updateBrandMutation.isPending || !brandValue.trim()}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateBrandMutation.isPending ? 'Saving...' : 'Save Brand'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

