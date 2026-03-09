'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiPlus, FiEdit, FiTrash2, FiChevronDown, FiChevronRight, FiX } from 'react-icons/fi';
import toast from '@/lib/toast';

interface Specification {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  required: boolean;
  placeholder?: string;
  order: number;
  isActive: boolean;
  categoryId?: string;
  subcategoryId?: string;
  options?: SpecificationOption[];
}

interface SpecificationOption {
  id: string;
  value: string;
  label?: string;
  order: number;
  isActive: boolean;
}

export default function AdminSpecifications({ 
  categoryId, 
  subcategoryId,
  categoryName,
  subcategoryName 
}: { 
  categoryId?: string; 
  subcategoryId?: string;
  categoryName?: string;
  subcategoryName?: string;
}) {
  const queryClient = useQueryClient();
  const [showSpecForm, setShowSpecForm] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specification | null>(null);
  const [expandedSpecs, setExpandedSpecs] = useState<Set<string>>(new Set());
  const [editingOption, setEditingOption] = useState<{ specId: string; option?: SpecificationOption } | null>(null);

  const { data: specifications, isLoading } = useQuery({
    queryKey: ['admin', 'specifications', categoryId, subcategoryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryId) params.append('categoryId', categoryId);
      if (subcategoryId) params.append('subcategoryId', subcategoryId);
      const response = await api.get(`/admin/specifications?${params.toString()}`);
      return response.data.specifications as Specification[];
    },
    enabled: !!(categoryId || subcategoryId)
  });

  const createSpec = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/admin/specifications', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'specifications'] });
      toast.success('Specification created successfully');
      setShowSpecForm(false);
      setEditingSpec(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create specification');
    },
  });

  const updateSpec = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/admin/specifications/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'specifications'] });
      toast.success('Specification updated successfully');
      setEditingSpec(null);
      setShowSpecForm(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update specification');
    },
  });

  const deleteSpec = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/specifications/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'specifications'] });
      toast.success('Specification deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete specification');
    },
  });

  const createOption = useMutation({
    mutationFn: async ({ specId, data }: { specId: string; data: any }) => {
      const response = await api.post(`/admin/specifications/${specId}/options`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'specifications'] });
      toast.success('Option created successfully');
      setEditingOption(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create option');
    },
  });

  const updateOption = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/admin/specifications/options/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'specifications'] });
      toast.success('Option updated successfully');
      setEditingOption(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update option');
    },
  });

  const deleteOption = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/specifications/options/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'specifications'] });
      toast.success('Option deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete option');
    },
  });

  const handleSpecSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      label: formData.get('label') as string,
      type: formData.get('type') as string,
      required: formData.get('required') === 'true',
      placeholder: formData.get('placeholder') as string || undefined,
      order: formData.get('order') ? parseInt(formData.get('order') as string) : 0,
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
    };

    if (editingSpec) {
      updateSpec.mutate({ id: editingSpec.id, data });
    } else {
      createSpec.mutate(data);
    }
    e.currentTarget.reset();
  };

  const handleOptionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      value: formData.get('value') as string,
      label: formData.get('label') as string || undefined,
      order: formData.get('order') ? parseInt(formData.get('order') as string) : 0,
    };

    if (editingOption?.option) {
      updateOption.mutate({ id: editingOption.option.id, data });
    } else if (editingOption?.specId) {
      createOption.mutate({ specId: editingOption.specId, data });
    }
    e.currentTarget.reset();
  };

  const toggleSpec = (specId: string) => {
    const newExpanded = new Set(expandedSpecs);
    if (newExpanded.has(specId)) {
      newExpanded.delete(specId);
    } else {
      newExpanded.add(specId);
    }
    setExpandedSpecs(newExpanded);
  };

  if (!categoryId && !subcategoryId) {
    return (
      <div className="text-center py-4 text-gray-500">
        Please select a category or subcategory to manage specifications
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-4">Loading specifications...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Specifications</h3>
          <p className="text-sm text-gray-500">
            {categoryName && subcategoryName 
              ? `${categoryName} > ${subcategoryName}`
              : categoryName || subcategoryName}
          </p>
          <p className="text-xs text-gray-400 mt-1">View only - Specifications cannot be modified</p>
        </div>
      </div>

      {/* Specification Form - Removed */}
      {false && showSpecForm && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">
              {editingSpec ? 'Edit Specification' : 'Create Specification'}
            </h4>
            <button
              onClick={() => {
                setShowSpecForm(false);
                setEditingSpec(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSpecSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name (field key) *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingSpec?.name || ''}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., brand, model, color"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Label (display name) *</label>
                <input
                  type="text"
                  name="label"
                  defaultValue={editingSpec?.label || ''}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Brand, Model, Color"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type *</label>
                <select
                  name="type"
                  defaultValue={editingSpec?.type || 'text'}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select (Dropdown)</option>
                  <option value="multiselect">Multi-Select</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Order</label>
                <input
                  type="number"
                  name="order"
                  defaultValue={editingSpec?.order || 0}
                  min="0"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Placeholder</label>
              <input
                type="text"
                name="placeholder"
                defaultValue={editingSpec?.placeholder || ''}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., Enter brand name"
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="required"
                  value="true"
                  defaultChecked={editingSpec?.required || false}
                  className="w-4 h-4"
                />
                <span className="text-sm">Required field</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {editingSpec ? 'Update' : 'Create'} Specification
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSpecForm(false);
                  setEditingSpec(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Specifications List */}
      <div className="space-y-2">
        {specifications && specifications.length > 0 ? (
          specifications.map((spec) => (
            <div key={spec.id} className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => toggleSpec(spec.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {expandedSpecs.has(spec.id) ? (
                      <FiChevronDown className="w-5 h-5" />
                    ) : (
                      <FiChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h4 className="font-semibold">{spec.label}</h4>
                    <p className="text-sm text-gray-500">
                      {spec.name} • {spec.type} {spec.required && '• Required'}
                    </p>
                  </div>
                </div>
                {/* Edit/Delete buttons removed */}
              </div>

              {/* Options Section (for select/multiselect) */}
              {expandedSpecs.has(spec.id) && (
                <div className="border-t bg-gray-50 p-4">
                  {(spec.type === 'select' || spec.type === 'multiselect') && (
                    <>
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-medium">Dropdown Options</h5>
                        {/* Add Option button removed */}
                      </div>

                      {/* Options List */}
                      <div className="space-y-2">
                        {spec.options && spec.options.length > 0 ? (
                          spec.options.map((option) => (
                            <div
                              key={option.id}
                              className="flex items-center justify-between p-2 bg-white rounded border"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{option.label || option.value}</p>
                                <p className="text-xs text-gray-500">Value: {option.value}</p>
                              </div>
                              {/* Edit/Delete buttons removed */}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-2">
                            No options. Click "Add Option" to create one.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  {spec.type !== 'select' && spec.type !== 'multiselect' && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Options are only available for select and multiselect types.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No specifications available.
          </div>
        )}
      </div>
    </div>
  );
}
