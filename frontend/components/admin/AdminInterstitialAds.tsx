'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiTrash2, FiEdit, FiPlus, FiX } from 'react-icons/fi';
import ImageWithFallback from '../ImageWithFallback';

export default function AdminInterstitialAds() {
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'interstitial-ads'],
    queryFn: async () => {
      const response = await api.get('/admin/interstitial-ads');
      return response.data.ads;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/interstitial-ads/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'interstitial-ads'] });
      toast.success('Interstitial ad deleted');
    },
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading interstitial ads...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Interstitial Ads</h2>
          <p className="text-gray-500 mt-1">Manage full-screen ads that appear between pages</p>
        </div>
        <button
          onClick={() => {
            setEditingAd(null);
            setShowForm(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <FiPlus /> Create Interstitial Ad
        </button>
      </div>

      {showForm && (
        <InterstitialAdForm
          ad={editingAd}
          onClose={() => {
            setShowForm(false);
            setEditingAd(null);
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.map((ad: any) => (
          <div key={ad.id} className="bg-white rounded-lg shadow p-4">
            <div className="relative mb-4">
              <ImageWithFallback
                src={ad.image}
                alt={ad.title}
                width={400}
                height={300}
                className="w-full h-48 object-cover rounded"
              />
              <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${
                ad.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
              }`}>
                {ad.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h3 className="font-semibold mb-2">{ad.title}</h3>
            <p className="text-sm text-gray-500 mb-1">Position: <span className="font-medium">{ad.position}</span></p>
            <p className="text-sm text-gray-500 mb-1">Frequency: Every {ad.frequency} view(s)</p>
            <p className="text-sm text-gray-500 mb-1">Views: {ad.views} | Clicks: {ad.clicks}</p>
            {ad.link && (
              <p className="text-sm text-blue-600 mb-4 truncate" title={ad.link}>
                Link: {ad.link}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingAd(ad);
                  setShowForm(true);
                }}
                className="flex-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 flex items-center justify-center gap-1"
              >
                <FiEdit /> Edit
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this interstitial ad?')) {
                    deleteMutation.mutate(ad.id);
                  }
                }}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 flex items-center gap-1"
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No interstitial ads created yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InterstitialAdForm({ ad, onClose }: { ad?: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: ad?.title || '',
    link: ad?.link || '',
    position: ad?.position || 'page_load',
    isActive: ad?.isActive !== undefined ? ad.isActive : true,
    frequency: ad?.frequency || 1,
    order: ad?.order || 0,
    width: ad?.width || '',
    height: ad?.height || '',
    startDate: ad?.startDate ? new Date(ad.startDate).toISOString().split('T')[0] : '',
    endDate: ad?.endDate ? new Date(ad.endDate).toISOString().split('T')[0] : '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(ad?.image || null);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = ad
        ? await api.put(`/admin/interstitial-ads/${ad.id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        : await api.post('/admin/interstitial-ads', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'interstitial-ads'] });
      toast.success(ad ? 'Interstitial ad updated' : 'Interstitial ad created');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save interstitial ad');
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== '' && value !== null) {
        data.append(key, String(value));
      }
    });
    if (image) {
      data.append('images', image);
    }
    createMutation.mutate(data);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">{ad ? 'Edit' : 'Create'} Interstitial Ad</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <FiX className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Image *</label>
          {imagePreview && (
            <div className="mb-4">
              <ImageWithFallback
                src={imagePreview}
                alt="Preview"
                width={400}
                height={300}
                className="w-full max-w-md h-64 object-cover rounded-lg border"
              />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required={!ad}
          />
          <p className="text-xs text-gray-500 mt-1">Recommended: 1080x1920px (portrait) or 1920x1080px (landscape)</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Link (Optional)</label>
          <input
            type="url"
            value={formData.link}
            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Position *</label>
          <select
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            <option value="page_load">Page Load</option>
            <option value="page_exit">Page Exit</option>
            <option value="after_action">After Action</option>
            <option value="between_pages">Between Pages</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {formData.position === 'page_load' && 'Shows when user first loads a page'}
            {formData.position === 'page_exit' && 'Shows when user tries to leave the page'}
            {formData.position === 'after_action' && 'Shows after user completes an action (e.g., posting ad)'}
            {formData.position === 'between_pages' && 'Shows when navigating between pages'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Frequency
              <span className="ml-2 text-xs font-normal text-gray-500">(How often to show)</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="mt-1 space-y-1">
              <p className="text-xs text-gray-500">
                Show every <strong>{formData.frequency}</strong> {formData.frequency === 1 ? 'time' : 'times'}
              </p>
              {formData.frequency === 1 && (
                <p className="text-xs text-blue-600">✓ Shows every time (recommended for important ads)</p>
              )}
              {formData.frequency > 1 && formData.frequency <= 5 && (
                <p className="text-xs text-blue-600">✓ Shows every {formData.frequency} times (good for regular promotions)</p>
              )}
              {formData.frequency > 5 && (
                <p className="text-xs text-orange-600">⚠ Shows every {formData.frequency} times (may show rarely)</p>
              )}
              <details className="text-xs text-gray-400 cursor-pointer">
                <summary className="hover:text-gray-600">How it works?</summary>
                <div className="mt-1 p-2 bg-gray-50 rounded text-gray-600">
                  <p className="mb-1">Frequency controls how often the ad appears:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li><strong>1</strong> = Show every time</li>
                    <li><strong>3</strong> = Show every 3rd time (skip 2 times)</li>
                    <li><strong>5</strong> = Show every 5th time (skip 4 times)</li>
                  </ul>
                  <p className="mt-1 text-xs">Uses browser localStorage to track visits.</p>
                </div>
              </details>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Order</label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers show first</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Width (px) - Optional</label>
            <input
              type="number"
              min="100"
              max="1920"
              value={formData.width}
              onChange={(e) => setFormData({ ...formData, width: e.target.value ? parseInt(e.target.value) : '' })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Auto (image width)"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for auto (image width)</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Height (px) - Optional</label>
            <input
              type="number"
              min="100"
              max="1920"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value ? parseInt(e.target.value) : '' })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Auto (image height)"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for auto (image height)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date (Optional)</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Date (Optional)</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="isActive" className="text-sm font-medium">
            Active
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Saving...' : ad ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

