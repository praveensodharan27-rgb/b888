'use client';

import { useState, useEffect } from 'react';
import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Select, { ActionMeta, SingleValue } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import api from '@/lib/api';
import { FiPlus, FiEdit, FiTrash2, FiChevronDown, FiChevronRight, FiX, FiCopy } from 'react-icons/fi';
import toast from '@/lib/toast';

interface Specification {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  required: boolean;
  placeholder?: string;
  order: number;
  options?: SpecificationOption[];
  customValues?: string[];
}

interface SpecificationOption {
  id: string;
  value: string;
  label?: string;
}

interface ProductSpecificationsProps {
  adId?: string; // For editing existing ad
  categorySlug?: string;
  subcategorySlug?: string;
  /** When editing, pass ad's current attributes so spec fields show current values */
  initialAttributes?: Record<string, unknown>;
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors<any>;
}

export default function ProductSpecifications({
  adId,
  categorySlug,
  subcategorySlug,
  initialAttributes,
  register,
  watch,
  setValue,
  errors
}: ProductSpecificationsProps) {
  const queryClient = useQueryClient();
  const [showSpecForm, setShowSpecForm] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specification | null>(null);
  const [expandedSpecs, setExpandedSpecs] = useState<Set<string>>(new Set());
  const [editingOption, setEditingOption] = useState<{ specId: string; option?: SpecificationOption } | null>(null);

  // Fetch product-specific specifications (edit mode): use /categories/specifications?adId= (backend supports adId)
  const { data: productSpecs, isLoading: loadingProductSpecs } = useQuery({
    queryKey: ['specifications', 'product', adId],
    queryFn: async () => {
      if (!adId) return { specifications: [] };
      try {
        const response = await api.get(`/categories/specifications?adId=${encodeURIComponent(adId)}`);
        return { specifications: response.data?.specifications || [] };
      } catch {
        return { specifications: [] };
      }
    },
    enabled: !!adId
  });

  // Fetch category defaults (spec definitions for this category/subcategory)
  const { data: categoryDefaults, isLoading: loadingDefaults } = useQuery({
    queryKey: ['specifications', 'category', categorySlug, subcategorySlug],
    queryFn: async () => {
      if (!categorySlug && !subcategorySlug) return [];
      try {
        const params = new URLSearchParams();
        if (categorySlug) params.append('categorySlug', categorySlug);
        if (subcategorySlug) params.append('subcategorySlug', subcategorySlug);
        const response = await api.get(`/categories/specifications?${params.toString()}`);
        return (response.data?.specifications || []) as Specification[];
      } catch (error) {
        return [];
      }
    },
    enabled: !!categorySlug
  });

  const formSpecs = watch('_specifications') || [];
  const defaults = (categoryDefaults || []) as Specification[];
  const specifications = adId
    ? ((productSpecs?.specifications?.length ? productSpecs.specifications : defaults) as Specification[])
    : (formSpecs as Specification[]);

  // When editing: load current values from productSpecs (API) or initialAttributes (ad.attributes from edit page)
  useEffect(() => {
    if (!adId || !specifications.length) return;
    const attrs = initialAttributes || {};
    specifications.forEach((spec: any) => {
      const fieldName = `attributes.${spec.name}`;
      const fromApi = spec.type === 'multiselect' ? spec.currentValues : spec.currentValue;
      const fromAd = attrs[spec.name];
      if (spec.type === 'multiselect') {
        const val = Array.isArray(fromApi) && fromApi.length ? fromApi : (Array.isArray(fromAd) ? fromAd : []);
        if (val.length) setValue(fieldName, val);
      } else if (fromApi !== null && fromApi !== undefined && fromApi !== '') {
        setValue(fieldName, fromApi);
      } else if (fromAd !== null && fromAd !== undefined && fromAd !== '') {
        setValue(fieldName, fromAd);
      }
    });
  }, [adId, specifications.length, setValue]);

  // Create specification mutation
  const createSpec = useMutation({
    mutationFn: async (data: any) => {
      if (adId) {
        const response = await api.post(`/ads/${adId}/specifications`, data);
        return response.data;
      } else {
        // For new ads, store in form state (will be saved when ad is created)
        const newSpec = { id: `temp-${Date.now()}`, ...data, options: [] };
        const currentSpecs = watch('_specifications') || [];
        setValue('_specifications', [...currentSpecs, newSpec]);
        return { specification: newSpec };
      }
    },
    onSuccess: (data) => {
      if (adId) {
        queryClient.invalidateQueries({ queryKey: ['specifications', 'product', adId] });
      } else {
        // Trigger re-render to show new spec
        queryClient.invalidateQueries({ queryKey: ['specifications', 'product', 'new'] });
      }
      toast.success('Specification added');
      setShowSpecForm(false);
      setEditingSpec(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add specification');
    },
  });

  // Update specification mutation
  const updateSpec = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (adId && !id.startsWith('temp-')) {
        const response = await api.put(`/ads/${adId}/specifications/${id}`, data);
        return response.data;
      }
      // For new ads, update in form state
      const currentSpecs = watch('_specifications') || [];
      const updatedSpecs = currentSpecs.map((spec: Specification) => 
        spec.id === id ? { ...spec, ...data } : spec
      );
      setValue('_specifications', updatedSpecs);
      return { specification: { id, ...data } };
    },
    onSuccess: () => {
      if (adId) {
        queryClient.invalidateQueries({ queryKey: ['specifications', 'product', adId] });
      }
      toast.success('Specification updated');
      setEditingSpec(null);
      setShowSpecForm(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update specification');
    },
  });

  // Delete specification mutation
  const deleteSpec = useMutation({
    mutationFn: async (id: string) => {
      if (adId && !id.startsWith('temp-')) {
        const response = await api.delete(`/ads/${adId}/specifications/${id}`);
        return response.data;
      }
      // For new ads, remove from form state
      const currentSpecs = watch('_specifications') || [];
      const updatedSpecs = currentSpecs.filter((spec: Specification) => spec.id !== id);
      setValue('_specifications', updatedSpecs);
      return { success: true };
    },
    onSuccess: () => {
      if (adId) {
        queryClient.invalidateQueries({ queryKey: ['specifications', 'product', adId] });
      }
      toast.success('Specification deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete specification');
    },
  });

  // Copy defaults mutation
  const copyDefaults = useMutation({
    mutationFn: async () => {
      if (adId) {
        const response = await api.post(`/ads/${adId}/specifications/copy-defaults`);
        return response.data;
      }
      // For new ads, add to form state
      const currentSpecs = watch('_specifications') || [];
      const existingNames = new Set(currentSpecs.map((s: Specification) => s.name));
      const newSpecs = defaults
        .filter(spec => !existingNames.has(spec.name))
        .map(spec => ({
          ...spec,
          id: `temp-${Date.now()}-${Math.random()}`,
          options: spec.options || []
        }));
      setValue('_specifications', [...currentSpecs, ...newSpecs]);
      return { specifications: newSpecs };
    },
    onSuccess: (data) => {
      if (adId) {
        queryClient.invalidateQueries({ queryKey: ['specifications', 'product', adId] });
        toast.success(`Copied ${data.specifications?.length || 0} specifications from category defaults`);
      } else {
        toast.success(`Added ${data.specifications?.length || 0} specifications from category defaults`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to copy defaults');
    },
  });

  // Create option mutation
  const createOption = useMutation({
    mutationFn: async ({ specId, data }: { specId: string; data: any }) => {
      if (adId && !specId.startsWith('temp-')) {
        const response = await api.post(`/ads/${adId}/specifications/${specId}/options`, data);
        return response.data;
      }
      // For new ads, add to form state
      const currentSpecs = watch('_specifications') || [];
      const updatedSpecs = currentSpecs.map((spec: Specification) => {
        if (spec.id === specId) {
          return {
            ...spec,
            options: [...(spec.options || []), { id: `temp-opt-${Date.now()}`, ...data }]
          };
        }
        return spec;
      });
      setValue('_specifications', updatedSpecs);
      return { option: { id: `temp-opt-${Date.now()}`, ...data } };
    },
    onSuccess: () => {
      if (adId) {
        queryClient.invalidateQueries({ queryKey: ['specifications', 'product', adId] });
      }
      toast.success('Option added');
      setEditingOption(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add option');
    },
  });

  // Update option mutation
  const updateOption = useMutation({
    mutationFn: async ({ specId, optionId, data }: { specId: string; optionId: string; data: any }) => {
      if (adId && !specId.startsWith('temp-') && !optionId.startsWith('temp-')) {
        const response = await api.put(`/ads/${adId}/specifications/${specId}/options/${optionId}`, data);
        return response.data;
      }
      // For new ads, update in form state
      const currentSpecs = watch('_specifications') || [];
      const updatedSpecs = currentSpecs.map((spec: Specification) => {
        if (spec.id === specId) {
          return {
            ...spec,
            options: (spec.options || []).map((opt: SpecificationOption) =>
              opt.id === optionId ? { ...opt, ...data } : opt
            )
          };
        }
        return spec;
      });
      setValue('_specifications', updatedSpecs);
      return { option: { id: optionId, ...data } };
    },
    onSuccess: () => {
      if (adId) {
        queryClient.invalidateQueries({ queryKey: ['specifications', 'product', adId] });
      }
      toast.success('Option updated');
      setEditingOption(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update option');
    },
  });

  // Delete option mutation
  const deleteOption = useMutation({
    mutationFn: async ({ specId, optionId }: { specId: string; optionId: string }) => {
      if (adId && !specId.startsWith('temp-') && !optionId.startsWith('temp-')) {
        const response = await api.delete(`/ads/${adId}/specifications/${specId}/options/${optionId}`);
        return response.data;
      }
      // For new ads, remove from form state
      const currentSpecs = watch('_specifications') || [];
      const updatedSpecs = currentSpecs.map((spec: Specification) => {
        if (spec.id === specId) {
          return {
            ...spec,
            options: (spec.options || []).filter((opt: SpecificationOption) => opt.id !== optionId)
          };
        }
        return spec;
      });
      setValue('_specifications', updatedSpecs);
      return { success: true };
    },
    onSuccess: () => {
      if (adId) {
        queryClient.invalidateQueries({ queryKey: ['specifications', 'product', adId] });
      }
      toast.success('Option deleted');
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

    if (editingOption?.option && editingOption.specId) {
      updateOption.mutate({ 
        specId: editingOption.specId, 
        optionId: editingOption.option.id, 
        data 
      });
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

  const handleSelectChange = (
    spec: Specification,
    selectedOption: SingleValue<{ value: string; label: string }> | null,
    actionMeta: ActionMeta<{ value: string; label: string }>
  ) => {
    const fieldName = `attributes.${spec.name}`;
    const value = selectedOption?.value || '';
    
    setValue(fieldName, value);
    
    // Save custom value if new
    if (actionMeta.action === 'create-option' && value) {
      api.post('/categories/specifications/values', {
        specificationId: spec.id,
        value: value.trim()
      }).catch(() => {}); // Silent fail
    }
  };

  const handleMultiSelectChange = (
    spec: Specification,
    selectedOptions: readonly { value: string; label: string }[],
    actionMeta: ActionMeta<{ value: string; label: string }>
  ) => {
    const fieldName = `attributes.${spec.name}`;
    const values = selectedOptions.map(opt => opt.value);
    
    setValue(fieldName, values);
    
    // Save custom values if new
    if (actionMeta.action === 'create-option' && actionMeta.option) {
      api.post('/categories/specifications/values', {
        specificationId: spec.id,
        value: actionMeta.option.value.trim()
      }).catch(() => {}); // Silent fail
    }
  };

  if (!categorySlug) {
    return null;
  }

  const isLoading = loadingProductSpecs || loadingDefaults;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Product Specifications</h3>
          <p className="text-sm text-gray-500">
            Specification details (read-only)
          </p>
        </div>
      </div>

      {/* Specification Form - Removed */}
      {false && showSpecForm && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">
              {editingSpec ? 'Edit Specification' : 'Add Specification'}
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
                  placeholder="e.g., brand, model"
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
                  placeholder="e.g., Brand, Model"
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
                disabled={createSpec.isPending || updateSpec.isPending}
              >
                {editingSpec ? 'Update' : 'Add'} Specification
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
            {isLoading ? (
              <div className="text-center py-4">Loading specifications...</div>
            ) : specifications.length === 0 ? (
              (() => {
                const formAttributes = watch('attributes') as Record<string, any> | undefined;
                const attrs = formAttributes && typeof formAttributes === 'object' ? formAttributes : {};
                const attrEntries = Object.entries(attrs).filter(([k, v]) => k !== 'price' && v != null && v !== '');
                if (attrEntries.length > 0) {
                  return (
                    <div className="space-y-2">
                      {attrEntries.map(([key, value]) => (
                        <div key={key} className="bg-white rounded-lg shadow border border-gray-200 p-4">
                          <h4 className="font-semibold text-gray-900 capitalize">{key.replace(/_/g, ' ')}</h4>
                          <p className="text-gray-700 mt-1">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                    <p>No specifications yet.</p>
                    <p className="text-sm mt-2">
                      {defaults.length > 0 
                        ? 'Click "Copy Category Defaults" to add suggested specifications, or add your own.'
                        : 'Add your first specification to get started.'}
                    </p>
                  </div>
                );
              })()
            ) : (
              <div className="space-y-2">
                {[...specifications]
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((spec) => {
            const fieldName = `attributes.${spec.name}`;
            const error = (errors.attributes as any)?.[spec.name];
            const currentValue = watch(fieldName);

            return (
              <div key={spec.id} className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{spec.label}</h4>
                      <p className="text-sm text-gray-500">
                        {spec.name} • {spec.type} {spec.required && '• Required'}
                      </p>
                    </div>
                    {/* Edit/Delete buttons removed */}
                  </div>

                  {/* Specification Input Field */}
                  {spec.type === 'select' && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-2">
                        {spec.label} {spec.required && <span className="text-red-500">*</span>}
                      </label>
                      <CreatableSelect
                        options={[
                          ...(spec.options || []).map(opt => ({
                            value: opt.value,
                            label: opt.label || opt.value
                          })),
                          ...(spec.customValues || []).map(val => ({
                            value: val,
                            label: val
                          }))
                        ]}
                        value={currentValue || (spec as any).currentValue 
                          ? { value: currentValue || (spec as any).currentValue, label: currentValue || (spec as any).currentValue } 
                          : null}
                        onChange={() => {}} // Disabled - read-only
                        placeholder={spec.placeholder || `Select or type ${spec.label.toLowerCase()}`}
                        isClearable={false}
                        isSearchable={false}
                        isDisabled={true}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                      <input
                        type="hidden"
                        {...register(fieldName, { required: spec.required })}
                      />
                      {error && (
                        <div className="text-red-500 text-sm mt-1">{error.message as string}</div>
                      )}
                    </div>
                  )}

                  {spec.type === 'multiselect' && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-2">
                        {spec.label} {spec.required && <span className="text-red-500">*</span>}
                      </label>
                      <CreatableSelect
                        isMulti
                        options={[
                          ...(spec.options || []).map(opt => ({
                            value: opt.value,
                            label: opt.label || opt.value
                          })),
                          ...(spec.customValues || []).map(val => ({
                            value: val,
                            label: val
                          }))
                        ]}
                        value={(Array.isArray(currentValue) ? currentValue : ((spec as any).currentValues || []))
                          .map((val: string) => ({ value: val, label: val }))}
                        onChange={() => {}} // Disabled - read-only
                        placeholder={spec.placeholder || `Select or type ${spec.label.toLowerCase()}`}
                        isClearable={false}
                        isSearchable={false}
                        isDisabled={true}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                      <input
                        type="hidden"
                        {...register(fieldName, { required: spec.required })}
                      />
                      {error && (
                        <div className="text-red-500 text-sm mt-1">{error.message as string}</div>
                      )}
                    </div>
                  )}

                  {(spec.type === 'text' || spec.type === 'number') && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-2">
                        {spec.label} {spec.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type={spec.type}
                        {...register(fieldName, { 
                          required: spec.required,
                          valueAsNumber: spec.type === 'number'
                        })}
                        defaultValue={(spec as any).currentValue || ''}
                        placeholder={spec.placeholder}
                        disabled={true}
                        readOnly={true}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                      />
                      {error && (
                        <div className="text-red-500 text-sm mt-1">{error.message as string}</div>
                      )}
                    </div>
                  )}

                  {/* Options Management - Completely removed */}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
