'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from '@/lib/toast';
import { FiTrash2, FiEdit, FiPlus, FiX } from 'react-icons/fi';
import ImageResizeInput from './ImageResizeInput';
import AreaPlaceAutocomplete from './AreaPlaceAutocomplete';
import { clearPromoCardCache } from '@/hooks/useAdDetailPromoCard';

export interface TargetLocation {
  country?: string;
  state?: string;
  district?: string;
  city?: string;
}

export default function AdminFreePostingPromos() {
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: promos, isLoading } = useQuery({
    queryKey: ['admin', 'free-posting-promos'],
    queryFn: async () => {
      const response = await api.get('/admin/free-posting-promos');
      return response.data.promos;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/free-posting-promos/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'free-posting-promos'] });
      queryClient.invalidateQueries({ queryKey: ['free-posting-promos'] });
      toast.success('Promo card deleted');
    },
  });

  if (isLoading) {
    return <div className="p-4">Loading promo cards...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Free Posting Ads Cards</h2>
        <button
          onClick={() => {
            setEditingPromo(null);
            setShowForm(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <FiPlus /> Create Card
        </button>
      </div>

      {showForm && (
        <PromoForm
          promo={editingPromo}
          onClose={() => {
            setShowForm(false);
            setEditingPromo(null);
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promos?.map((promo: any) => (
          <div key={promo.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
            {promo.image && (
              <img
                src={promo.image}
                alt={promo.title}
                className="w-full h-32 object-cover rounded mb-4"
              />
            )}
            <h3 className="font-semibold mb-2">{promo.title}</h3>
            <p className="text-sm text-gray-500 mb-2 line-clamp-2">{promo.description}</p>
            <div className="flex flex-wrap gap-1 text-xs text-gray-400 mb-4">
              {promo.showForAllLocations ? (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Global</span>
              ) : (
                (promo.targetLocations || []).slice(0, 2).map((t: TargetLocation, i: number) => (
                  <span key={i} className="bg-gray-100 px-2 py-0.5 rounded">
                    {[t.country, t.state, t.city, t.district].filter(Boolean).join(', ')}
                  </span>
                ))
              )}
              {!promo.showForAllLocations && (promo.targetLocations?.length || 0) > 2 && (
                <span>+{(promo.targetLocations?.length || 0) - 2} more</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>Priority: {promo.priority}</span>
              <span className={promo.isActive ? 'text-green-600' : 'text-red-600'}>
                {promo.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingPromo(promo);
                  setShowForm(true);
                }}
                className="flex-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 flex items-center justify-center gap-1"
              >
                <FiEdit /> Edit
              </button>
              <button
                onClick={() => deleteMutation.mutate(promo.id)}
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

function PromoForm({ promo, onClose }: { promo?: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: promo?.title || '',
    description: promo?.description || '',
    ctaText: promo?.ctaText || 'Post Free Ad',
    ctaLink: promo?.ctaLink || '/post-ad',
    priority: promo?.priority ?? 0,
    startDate: promo?.startDate ? promo.startDate.slice(0, 16) : '',
    endDate: promo?.endDate ? promo.endDate.slice(0, 16) : '',
    isActive: promo?.isActive !== undefined ? promo.isActive : true,
    showForAllLocations: promo?.showForAllLocations || false,
  });
  const [image, setImage] = useState<File | null>(null);
  const [targetLocations, setTargetLocations] = useState<TargetLocation[]>(
    Array.isArray(promo?.targetLocations) ? [...promo.targetLocations] : []
  );

  // Cascading location state for adding new target
  const [newTarget, setNewTarget] = useState<{ country: string; state: string; city: string; district: string }>({
    country: 'India',
    state: '',
    city: '',
    district: '',
  });
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<{ name: string; slug?: string }[]>([]);

  useEffect(() => {
    api.get('/locations/states').then((r) => {
      setStates(r.data?.states || []);
    }).catch(() => setStates([]));
  }, []);

  useEffect(() => {
    if (!newTarget.state) {
      setCities([]);
      return;
    }
    api.get(`/locations/states/${encodeURIComponent(newTarget.state)}/cities`)
      .then((r) => {
        const data = r.data?.cities || r.data?.locations || [];
        setCities(Array.isArray(data) ? data.map((c: any) => ({ name: c.name || c.city || c, slug: c.slug })) : []);
      })
      .catch(() => setCities([]));
  }, [newTarget.state]);

  const addTarget = () => {
    const t: TargetLocation = {
      country: newTarget.country || undefined,
      state: newTarget.state || undefined,
      city: newTarget.city || undefined,
      district: newTarget.district || undefined,
    };
    if (!t.state && !t.city && !t.district) return;
    setTargetLocations((prev) => [...prev, t]);
    setNewTarget({ country: 'India', state: '', city: '', district: '' });
  };

  const removeTarget = (idx: number) => {
    setTargetLocations((prev) => prev.filter((_, i) => i !== idx));
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const url = promo ? `/admin/free-posting-promos/${promo.id}` : '/admin/free-posting-promos';
      const response = promo
        ? await api.put(url, data, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post(url, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'free-posting-promos'] });
      queryClient.invalidateQueries({ queryKey: ['free-posting-promos'] });
      clearPromoCardCache();
      toast.success(promo ? 'Promo card updated' : 'Promo card created');
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'showForAllLocations') {
        data.append(key, String(value));
      } else if (value !== '' && value !== null) {
        data.append(key, String(value));
      }
    });
    const locationsToSave = formData.showForAllLocations ? [] : (() => {
      const hasNew = newTarget.state || newTarget.city || newTarget.district;
      if (hasNew) {
        const t: TargetLocation = {
          country: newTarget.country || undefined,
          state: newTarget.state || undefined,
          city: newTarget.city || undefined,
          district: newTarget.district || undefined,
        };
        const exists = targetLocations.some(
          (x) => x.state === t.state && x.city === t.city && x.district === t.district
        );
        return exists ? targetLocations : [...targetLocations, t];
      }
      return targetLocations;
    })();
    data.append('targetLocations', JSON.stringify(locationsToSave));
    if (image) {
      data.append('images', image);
    }
    createMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{promo ? 'Edit' : 'Create'} Free Posting Promo Card</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title (optional)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Leave empty for image-only banner"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">CTA Text</label>
              <input
                type="text"
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CTA Link</label>
              <input
                type="text"
                value={formData.ctaLink}
                onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <ImageResizeInput
              label="Image"
              value={image}
              onChange={setImage}
              previewUrl={promo?.image}
              required={!promo && !formData.title?.trim()}
              maxWidth={800}
              maxHeight={400}
              quality={0.85}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Priority (higher = preferred when multiple match)</label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
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

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={formData.showForAllLocations}
                onChange={(e) => setFormData({ ...formData, showForAllLocations: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium">Show for all locations (global)</label>
            </div>
            {!formData.showForAllLocations && (
              <>
                <label className="block text-sm font-medium mb-2">Target Locations (Country → State → City → District)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <select
                    value={newTarget.state}
                    onChange={(e) => setNewTarget({ ...newTarget, state: e.target.value, city: '', district: '' })}
                    className="px-3 py-1.5 border rounded text-sm"
                  >
                    <option value="">Select State</option>
                    {states.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    value={newTarget.city || ''}
                    onChange={(e) => setNewTarget({ ...newTarget, city: e.target.value, district: '' })}
                    className="px-3 py-1.5 border rounded text-sm"
                  >
                    <option value="">Select City</option>
                    {cities.map((c) => {
                      const cityVal = (c as any).city || c.name;
                      return <option key={cityVal} value={cityVal}>{c.name}</option>;
                    })}
                  </select>
                  <AreaPlaceAutocomplete
                    value={newTarget.district}
                    onChange={(v) => setNewTarget({ ...newTarget, district: v })}
                    placeholder="Type area or locality (Google Places)..."
                    city={newTarget.city}
                    state={newTarget.state}
                  />
                  <button
                    type="button"
                    onClick={addTarget}
                    className="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300 flex items-center gap-1"
                  >
                    <FiPlus /> Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {targetLocations.map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm"
                    >
                      {[t.country, t.state, t.city, t.district].filter(Boolean).join(', ')}
                      <button type="button" onClick={() => removeTarget(i)} className="text-red-500 hover:text-red-700">
                        <FiX className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              {promo ? 'Update' : 'Create'}
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
