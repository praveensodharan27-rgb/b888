'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from '@/lib/toast';
import { FiTrash2, FiEdit, FiPlus, FiX, FiBarChart2 } from 'react-icons/fi';
import ImageWithFallback from '../ImageWithFallback';
import CategorySelectDropdown from './CategorySelectDropdown';
import LocationPlacesInput from './LocationPlacesInput';
import ImageResizeInput from './ImageResizeInput';

const AD_SIZES = ['auto', 'all', 'small', 'medium', 'large'] as const;
const CTA_TYPES = ['website', 'call', 'whatsapp'] as const;
const STATUSES = ['active', 'paused', 'expired'] as const;

export default function AdminSponsoredAds() {
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const queryClient = useQueryClient();

  const { data: adsData, isLoading } = useQuery({
    queryKey: ['admin', 'sponsored-ads'],
    queryFn: async () => {
      const response = await api.get('/admin/sponsored-ads');
      return response.data;
    },
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['admin', 'sponsored-ads-analytics'],
    queryFn: async () => {
      const response = await api.get('/admin/sponsored-ads/analytics');
      return response.data;
    },
    enabled: showAnalytics,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/sponsored-ads/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sponsored-ads'] });
      toast.success('Sponsored ad deleted');
    },
  });

  const ads = adsData?.ads || [];

  if (isLoading) {
    return <div className="text-center py-12">Loading sponsored ads...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Sponsored Ads</h2>
          <p className="text-gray-500 mt-1">Location-targeted ads shown on ad detail page (below Seller Info)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <FiBarChart2 /> Analytics
          </button>
          <button
            onClick={() => {
              setEditingAd(null);
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FiPlus /> Create Sponsored Ad
          </button>
        </div>
      </div>

      {showAnalytics && analyticsData?.analytics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Analytics Dashboard</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Impressions</p>
              <p className="text-2xl font-bold text-blue-600">{analyticsData.analytics.totalImpressions}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Clicks</p>
              <p className="text-2xl font-bold text-green-600">{analyticsData.analytics.totalClicks}</p>
            </div>
            <div className="bg-violet-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">CTR</p>
              <p className="text-2xl font-bold text-violet-600">{analyticsData.analytics.ctr}%</p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <SponsoredAdForm
          ad={editingAd}
          onClose={() => {
            setShowForm(false);
            setEditingAd(null);
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ads.map((ad: any) => (
          <div key={ad.id} className="bg-white rounded-lg shadow p-4">
            <div className="relative mb-4">
              {ad.bannerImage ? (
                <ImageWithFallback
                  src={ad.bannerImage.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${ad.bannerImage}` : ad.bannerImage}
                  alt={ad.title}
                  width={400}
                  height={200}
                  className="w-full h-40 object-cover rounded"
                />
              ) : (
                <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}
              <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${
                ad.status === 'active' ? 'bg-green-500 text-white' :
                ad.status === 'paused' ? 'bg-yellow-500 text-white' : 'bg-gray-500 text-white'
              }`}>
                {ad.status}
              </span>
              <span className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white">
                {ad.adSize}
              </span>
            </div>
            <h3 className="font-semibold mb-2">{ad.title}</h3>
            <p className="text-sm text-gray-500 mb-1">Locations: {ad.targetLocations?.length ? ad.targetLocations.join(', ') : 'All'}</p>
            <p className="text-sm text-gray-500 mb-1">Category: {ad.categorySlug || 'Any'}</p>
            <p className="text-sm text-gray-500 mb-1">Impressions: {ad.impressions || 0} | Clicks: {ad.clicks || 0}</p>
            <p className="text-sm text-gray-500 mb-4">Priority: {ad.priority} | Budget: ₹{ad.budget || 0}</p>
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
                  if (confirm('Are you sure you want to delete this sponsored ad?')) {
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
        {ads.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No sponsored ads created yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first sponsored ad
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SponsoredAdForm({ ad, onClose }: { ad?: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: ad?.title || '',
    description: ad?.description || '',
    ctaType: ad?.ctaType || 'website',
    ctaLabel: ad?.ctaLabel || 'Learn More',
    redirectUrl: ad?.redirectUrl || '',
    targetLocations: ad?.targetLocations ? [...ad.targetLocations] : [],
    categorySlug: ad?.categorySlug || '',
    adSize: ad?.adSize || 'auto',
    startDate: ad?.startDate ? new Date(ad.startDate).toISOString().split('T')[0] : '',
    endDate: ad?.endDate ? new Date(ad.endDate).toISOString().split('T')[0] : '',
    budget: ad?.budget ?? 10000,
    priority: ad?.priority || 0,
    status: ad?.status || 'active',
  });
  const [image, setImage] = useState<File | null>(null);
  const imagePreviewUrl = ad?.bannerImage
    ? (ad.bannerImage.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${ad.bannerImage}` : ad.bannerImage)
    : null;

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('description', formData.description);
      payload.append('ctaType', formData.ctaType);
      payload.append('ctaLabel', formData.ctaLabel);
      payload.append('redirectUrl', formData.redirectUrl);
      payload.append('targetLocations', JSON.stringify(formData.targetLocations));
      payload.append('categorySlug', formData.categorySlug);
      payload.append('adSize', formData.adSize);
      payload.append('startDate', formData.startDate);
      payload.append('endDate', formData.endDate);
      payload.append('budget', String(formData.budget));
      payload.append('priority', String(formData.priority));
      payload.append('status', formData.status);
      if (image) payload.append('images', image);

      const response = ad
        ? await api.put(`/admin/sponsored-ads/${ad.id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post('/admin/sponsored-ads', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sponsored-ads'] });
      toast.success(ad ? 'Sponsored ad updated' : 'Sponsored ad created');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">{ad ? 'Edit Sponsored Ad' : 'Create Sponsored Ad'}</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
          <FiX className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ad Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <ImageResizeInput
            label="Banner Image"
            value={image}
            onChange={setImage}
            previewUrl={imagePreviewUrl}
            required={!ad}
            maxWidth={1200}
            maxHeight={600}
            quality={0.85}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">CTA Type</label>
            <select
              value={formData.ctaType}
              onChange={(e) => setFormData({ ...formData, ctaType: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
            >
              {CTA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CTA Label</label>
            <input
              type="text"
              value={formData.ctaLabel}
              onChange={(e) => setFormData({ ...formData, ctaLabel: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Redirect URL</label>
          <input
            type="url"
            value={formData.redirectUrl}
            onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Target Locations</label>
          <LocationPlacesInput
            value={formData.targetLocations}
            onChange={(locations) => setFormData({ ...formData, targetLocations: locations })}
            placeholder="Search cities (e.g. Mumbai, Delhi, Kottayam)..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty or add &quot;All India&quot; to show ad everywhere. Add specific cities to target only those locations.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <CategorySelectDropdown
              value={formData.categorySlug}
              onChange={(slug) => setFormData({ ...formData, categorySlug: slug })}
              placeholder="Select category (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ad Size</label>
            <select
              value={formData.adSize}
              onChange={(e) => setFormData({ ...formData, adSize: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
            >
              {AD_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Budget</label>
            <input
              type="number"
              min={0}
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
              className="w-full border rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">Set 0 for unlimited impressions</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <input
              type="number"
              min={0}
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="w-full border rounded px-3 py-2"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Saving...' : (ad ? 'Update' : 'Create')}
          </button>
          <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
