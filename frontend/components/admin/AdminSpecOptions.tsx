'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiPlus, FiEdit, FiTrash2, FiSave, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminSpecOptions() {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingOldValue, setEditingOldValue] = useState<string>('');
  const [editingParentValue, setEditingParentValue] = useState<string>('');
  const [newOptionValue, setNewOptionValue] = useState<Record<string, string>>({});
  const [newOptionParentValue, setNewOptionParentValue] = useState<Record<string, string>>({});

  const { data: categories } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const response = await api.get('/admin/categories');
      return response.data.categories;
    },
  });

  // Get subcategories for selected category
  const { data: subcategories } = useQuery({
    queryKey: ['admin', 'subcategories', selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      const response = await api.get('/admin/subcategories');
      return response.data.subcategories.filter((sub: any) => sub.categoryId === selectedCategoryId);
    },
    enabled: !!selectedCategoryId,
  });

  const { data: specOptionsData, isLoading: loadingOptions } = useQuery({
    queryKey: ['admin', 'spec-options', selectedCategoryId, selectedSubcategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return null;
      const url = selectedSubcategoryId 
        ? `/admin/spec-options/${selectedCategoryId}?subcategoryId=${selectedSubcategoryId}`
        : `/admin/spec-options/${selectedCategoryId}`;
      const response = await api.get(url);
      return response.data;
    },
    enabled: !!selectedCategoryId,
  });

  const updateSpecOptionMutation = useMutation({
    mutationFn: async ({ action, field, value, oldValue, parentField, parentValue }: any) => {
      if (!selectedCategoryId) {
        throw new Error('Category not selected');
      }
      
      const payload = {
        action,
        field,
        ...(value !== undefined && { value }),
        ...(oldValue !== undefined && { oldValue }),
        ...(parentField && { parentField }),
        ...(parentValue && { parentValue }),
        ...(selectedSubcategoryId && { subcategoryId: selectedSubcategoryId }),
      };

      console.log('Updating spec option:', { categoryId: selectedCategoryId, subcategoryId: selectedSubcategoryId, payload });
      
      const response = await api.put(`/admin/spec-options/${selectedCategoryId}`, payload);
      return response.data;
    },
    onSuccess: async () => {
      // Invalidate admin queries
      await queryClient.invalidateQueries({ queryKey: ['admin', 'spec-options', selectedCategoryId, selectedSubcategoryId] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      
      // Invalidate ALL spec-schema queries (with any categoryId/subcategoryId) so forms refetch updated options
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey[0] === 'spec-schema';
        }
      });
      
      // Dispatch custom event to notify forms to refetch
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('spec-options-updated'));
      }
      
      // Small delay to ensure backend has processed the update
      setTimeout(async () => {
        // Force refetch all active spec-schema queries
        await queryClient.refetchQueries({ 
          predicate: (query) => {
            return query.queryKey[0] === 'spec-schema';
          },
          type: 'active' // Only refetch active queries (currently mounted components)
        });
      }, 100);
      
      toast.success('Option updated successfully');
      setEditingField(null);
      setEditingValue('');
      setEditingOldValue('');
      setEditingParentValue('');
    },
    onError: (error: any) => {
      console.error('Update spec option error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0]?.msg ||
                          error.message || 
                          'Failed to update option';
      toast.error(errorMessage);
    },
  });

  const handleAddOption = (field: string, parentField?: string) => {
    const value = newOptionValue[field]?.trim();
    const parentValue = parentField ? newOptionParentValue[field]?.trim() : undefined;

    if (!value) {
      toast.error('Please enter a value');
      return;
    }

    if (parentField && !parentValue) {
      toast.error('Please select parent value');
      return;
    }

    updateSpecOptionMutation.mutate({
      action: 'add',
      field,
      value,
      parentField,
      parentValue,
    });

    setNewOptionValue((prev) => ({ ...prev, [field]: '' }));
    if (parentField) {
      setNewOptionParentValue((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleEditOption = (field: string, oldValue: string, parentValue?: string) => {
    setEditingField(field);
    setEditingValue(oldValue);
    setEditingOldValue(oldValue);
    setEditingParentValue(parentValue || '');
  };

  const handleSaveEdit = () => {
    if (!editingField || !editingValue.trim()) {
      toast.error('Please enter a value');
      return;
    }

    if (!editingOldValue) {
      toast.error('Old value is missing. Please try again.');
      return;
    }

    // Check if this is a nested field (model depends on brand)
    const isNested = specOptionsData?.specOptions?.[editingField] && 
                     typeof specOptionsData.specOptions[editingField] === 'object' && 
                     !Array.isArray(specOptionsData.specOptions[editingField]);
    
    const parentField = isNested ? 'brand' : undefined;
    const parentValue = isNested && editingParentValue ? editingParentValue : undefined;

    updateSpecOptionMutation.mutate({
      action: 'edit',
      field: editingField,
      value: editingValue.trim(),
      oldValue: editingOldValue,
      parentField,
      parentValue,
    });
  };

  const handleDeleteOption = (field: string, value: string, parentValue?: string) => {
    if (!confirm(`Delete "${value}" from ${field}?`)) return;

    const parentField = specOptionsData?.specOptions?.[field] && typeof specOptionsData.specOptions[field] === 'object' && !Array.isArray(specOptionsData.specOptions[field])
      ? 'brand'
      : undefined;

    updateSpecOptionMutation.mutate({
      action: 'delete',
      field,
      oldValue: value,
      parentField,
      parentValue: parentValue || undefined,
    });
  };

  const specOptions = specOptionsData?.specOptions || {};
  const selectedCategory = categories?.find((c: any) => c.id === selectedCategoryId);
  const selectedSubcategory = subcategories?.find((s: any) => s.id === selectedSubcategoryId);

  // Get spec fields based on category type (same as form uses)
  const getSpecFields = () => {
    if (!selectedCategory) return [];
    
    const key = (selectedSubcategory?.slug || selectedCategory.slug || selectedCategory.name || '').toLowerCase();
    
    // Return only fields that are used in the form (same as spec-schema endpoint)
    if (key.includes('mobile')) {
      return ['brand', 'model', 'storage', 'ram', 'color', 'warranty', 'batteryHealth'];
    } else if (key.includes('laptop')) {
      return ['brand', 'model', 'processor', 'ram', 'storage', 'screenSize', 'color'];
    } else if (key.includes('car') || key.includes('vehicle')) {
      return ['brand', 'model', 'year', 'fuelType', 'color', 'insurance'];
    } else {
      // Generic fallback (same as backend spec-schema)
      return ['brand', 'model', 'year', 'color'];
    }
  };

  const specFields = getSpecFields();

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(''); // Reset subcategory when category changes
    setEditingField(null);
    setNewOptionValue({});
    setNewOptionParentValue({});
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    setSelectedSubcategoryId(subcategoryId);
    setEditingField(null);
    setNewOptionValue({});
    setNewOptionParentValue({});
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Category Specifications Manager</h2>
      </div>

      {/* Category Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium mb-2">Select Main Category</label>
        <select
          value={selectedCategoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="">-- Select Main Category --</option>
          {categories?.map((cat: any) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Subcategory Selector - Only show if category is selected */}
      {selectedCategoryId && (
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium mb-2">
            Select Sub-Category <span className="text-gray-500 text-xs">(Optional - Leave empty to manage category-level specs)</span>
          </label>
          <select
            value={selectedSubcategoryId}
            onChange={(e) => handleSubcategoryChange(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="">-- No Sub-Category (Category Level) --</option>
            {subcategories?.map((sub: any) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
          {selectedSubcategoryId && (
            <p className="mt-2 text-sm text-blue-600">
              Managing specifications for: <strong>{selectedSubcategory?.name}</strong> (under {selectedCategory?.name})
            </p>
          )}
          {!selectedSubcategoryId && selectedCategoryId && (
            <p className="mt-2 text-sm text-gray-600">
              Managing specifications for: <strong>{selectedCategory?.name}</strong> (Category Level)
            </p>
          )}
        </div>
      )}

      {selectedCategoryId && (
        <div className="space-y-4">
          {loadingOptions ? (
            <div className="text-center py-8">Loading spec options...</div>
          ) : (
            specFields.map((field) => {
              const fieldOptions = specOptions[field];
              const isNested = fieldOptions && typeof fieldOptions === 'object' && !Array.isArray(fieldOptions);
              const isModelField = field === 'model';

              return (
                <div key={field} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                    {isModelField && <span className="text-sm text-gray-500 ml-2">(depends on Brand)</span>}
                  </h3>

                  {isNested ? (
                    // Nested options (e.g., model based on brand)
                    <div className="space-y-4">
                      {Object.keys(fieldOptions as Record<string, string[]>).map((parentValue) => (
                        <div key={parentValue} className="border rounded-lg p-4 bg-gray-50">
                          <h4 className="font-medium mb-3 text-gray-700">{parentValue}</h4>
                          <div className="space-y-2">
                            {(fieldOptions as Record<string, string[]>)[parentValue].map((value: string) => (
                              <div key={value} className="flex items-center justify-between bg-white p-2 rounded border">
                                <span>{value}</span>
                                <div className="flex gap-2">
                                  {editingField === field && editingOldValue === value && editingParentValue === parentValue ? (
                                    <>
                                      <input
                                        type="text"
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        className="px-2 py-1 border rounded text-sm"
                                        autoFocus
                                      />
                                      <button
                                        onClick={handleSaveEdit}
                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                      >
                                        <FiSave className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingField(null);
                                          setEditingValue('');
                                          setEditingOldValue('');
                                          setEditingParentValue('');
                                        }}
                                        className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                                      >
                                        <FiX className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleEditOption(field, value, parentValue)}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                      >
                                        <FiEdit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOption(field, value, parentValue)}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                      >
                                        <FiTrash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <input
                              type="text"
                              value={newOptionValue[`${field}-${parentValue}`] || ''}
                              onChange={(e) => setNewOptionValue((prev) => ({ ...prev, [`${field}-${parentValue}`]: e.target.value }))}
                              placeholder={`Add new ${field} for ${parentValue}`}
                              className="flex-1 px-3 py-2 border rounded text-sm"
                            />
                            <button
                              onClick={() => {
                                const value = newOptionValue[`${field}-${parentValue}`]?.trim();
                                if (!value) {
                                  toast.error('Please enter a value');
                                  return;
                                }
                                updateSpecOptionMutation.mutate({
                                  action: 'add',
                                  field,
                                  value,
                                  parentField: 'brand',
                                  parentValue,
                                });
                                setNewOptionValue((prev) => ({ ...prev, [`${field}-${parentValue}`]: '' }));
                              }}
                              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm flex items-center gap-2"
                            >
                              <FiPlus className="w-4 h-4" /> Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Flat options (e.g., brand, storage, ram)
                    <div className="space-y-2">
                      {Array.isArray(fieldOptions) && fieldOptions.length > 0 ? (
                        fieldOptions.map((value: string) => (
                          <div key={value} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                            <span>{value}</span>
                            <div className="flex gap-2">
                              {editingField === field && editingOldValue === value ? (
                                <>
                                  <input
                                    type="text"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    className="px-2 py-1 border rounded text-sm"
                                    autoFocus
                                  />
                                  <button
                                    onClick={handleSaveEdit}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  >
                                    <FiSave className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingField(null);
                                      setEditingValue('');
                                      setEditingOldValue('');
                                    }}
                                    className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                                  >
                                    <FiX className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditOption(field, value)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  >
                                    <FiEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOption(field, value)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 py-2">No options yet. Add your first option below.</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={newOptionValue[field] || ''}
                          onChange={(e) => setNewOptionValue((prev) => ({ ...prev, [field]: e.target.value }))}
                          placeholder={`Add new ${field} option`}
                          className="flex-1 px-3 py-2 border rounded text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddOption(field);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddOption(field)}
                          disabled={updateSpecOptionMutation.isPending}
                          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 text-sm flex items-center gap-2"
                        >
                          <FiPlus className="w-4 h-4" /> Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {!selectedCategoryId && (
        <div className="text-center py-8 text-gray-500">
          Please select a main category to manage specification options
        </div>
      )}
    </div>
  );
}
