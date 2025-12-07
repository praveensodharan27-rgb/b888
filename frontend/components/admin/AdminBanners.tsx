'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiTrash2, FiEdit } from 'react-icons/fi';

export default function AdminBanners() {
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: async () => {
      const response = await api.get('/admin/banners');
      return response.data.banners;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/banners/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      toast.success('Banner deleted');
    },
  });

  if (isLoading) {
    return <div>Loading banners...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Banners</h2>
        <button
          onClick={() => {
            setEditingBanner(null);
            setShowForm(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          Create Banner
        </button>
      </div>

      {showForm && (
        <BannerForm
          banner={editingBanner}
          onClose={() => {
            setShowForm(false);
            setEditingBanner(null);
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.map((banner: any) => (
          <div key={banner.id} className="bg-white rounded-lg shadow p-4">
            <img src={banner.image} alt={banner.title} className="w-full h-32 object-cover rounded mb-4" />
            <h3 className="font-semibold mb-2">{banner.title}</h3>
            <p className="text-sm text-gray-500 mb-2">Position: {banner.position}</p>
            <p className="text-sm text-gray-500 mb-4">Clicks: {banner.clicks}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingBanner(banner);
                  setShowForm(true);
                }}
                className="flex-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 flex items-center justify-center gap-1"
              >
                <FiEdit /> Edit
              </button>
              <button
                onClick={() => deleteMutation.mutate(banner.id)}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 flex items-center gap-1"
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BannerForm({ banner, onClose }: { banner?: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: banner?.title || '',
    link: banner?.link || '',
    position: banner?.position || 'homepage',
    categoryId: banner?.categoryId || '',
    locationId: banner?.locationId || '',
    order: banner?.order || 0,
    isActive: banner?.isActive !== undefined ? banner.isActive : true,
    startDate: banner?.startDate || '',
    endDate: banner?.endDate || '',
  });
  const [image, setImage] = useState<File | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = banner
        ? await api.put(`/admin/banners/${banner.id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        : await api.post('/admin/banners', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      toast.success(banner ? 'Banner updated' : 'Banner created');
      onClose();
    },
  });

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{banner ? 'Edit' : 'Create'} Banner</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Link</label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Position *</label>
            <select
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            >
              <option value="homepage">Homepage</option>
              <option value="category">Category</option>
              <option value="search">Search</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Image {!banner && '*'}</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border rounded-lg"
              required={!banner}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Order</label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium">Active</label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              {banner ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

