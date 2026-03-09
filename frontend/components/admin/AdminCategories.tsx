'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiPlus, FiEdit, FiTrash2, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import toast from '@/lib/toast';

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const response = await api.get('/admin/categories');
      return response.data.categories;
    },
  });

  const createCategory = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/admin/categories', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
      setShowCategoryForm(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create category');
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/admin/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully');
      setEditingCategory(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update category');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    },
  });

  const createSubcategory = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/admin/subcategories', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Subcategory created successfully');
      setShowSubcategoryForm(false);
      setSelectedCategoryId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create subcategory');
    },
  });

  const updateSubcategory = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/admin/subcategories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Subcategory updated successfully');
      setEditingSubcategory(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update subcategory');
    },
  });

  const deleteSubcategory = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/subcategories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Subcategory deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete subcategory');
    },
  });


  const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string || undefined,
      description: formData.get('description') as string || undefined,
      order: formData.get('order') ? parseInt(formData.get('order') as string) : undefined,
      isActive: formData.get('isActive') === 'true',
    };

    if (editingCategory) {
      updateCategory.mutate({ id: editingCategory.id, data });
    } else {
      createCategory.mutate(data);
    }
    e.currentTarget.reset();
  };


  const handleSubcategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      categoryId: formData.get('categoryId') as string,
      slug: formData.get('slug') as string || undefined,
      description: formData.get('description') as string || undefined,
      isActive: formData.get('isActive') === 'true',
    };

    if (editingSubcategory) {
      updateSubcategory.mutate({ id: editingSubcategory.id, data });
    } else {
      createSubcategory.mutate(data);
    }
    e.currentTarget.reset();
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Categories & Subcategories</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingCategory(null);
              setShowCategoryForm(!showCategoryForm);
              setShowSubcategoryForm(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <FiPlus /> Add Category
          </button>
        </div>
      </div>


      {/* Category Form */}
      {showCategoryForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingCategory ? 'Edit Category' : 'Create Category'}
          </h3>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                name="name"
                defaultValue={editingCategory?.name || ''}
                required
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Category name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Slug (auto-generated if empty)</label>
              <input
                type="text"
                name="slug"
                defaultValue={editingCategory?.slug || ''}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="category-slug"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                defaultValue={editingCategory?.description || ''}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Category description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Order</label>
                <input
                  type="number"
                  name="order"
                  defaultValue={editingCategory?.order || 0}
                  min="0"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  name="isActive"
                  defaultValue={editingCategory?.isActive !== false ? 'true' : 'false'}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {editingCategory ? 'Update' : 'Create'} Category
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryForm(false);
                  setEditingCategory(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-4">
        {categories?.map((category: any) => (
          <div key={category.id} className="bg-white rounded-lg shadow">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {expandedCategories.has(category.id) ? (
                    <FiChevronDown className="w-5 h-5" />
                  ) : (
                    <FiChevronRight className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  <p className="text-sm text-gray-500">
                    Slug: {category.slug} | Ads: {category._count?.ads || 0} | 
                    Subcategories: {category.subcategories?.length || 0}
                  </p>
                  {!category.isActive && (
                    <span className="text-xs text-red-500">(Inactive)</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingCategory(category);
                    setShowCategoryForm(true);
                    setShowSubcategoryForm(false);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <FiEdit />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete category "${category.name}"? This will also delete all subcategories.`)) {
                      deleteCategory.mutate(category.id);
                    }
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <FiTrash2 />
                </button>
                <button
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setEditingSubcategory(null);
                    setShowSubcategoryForm(true);
                    setShowCategoryForm(false);
                    if (!expandedCategories.has(category.id)) {
                      toggleCategory(category.id);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <FiPlus className="w-4 h-4" /> Add Subcategory
                </button>
              </div>
            </div>

            {/* Subcategories */}
            {expandedCategories.has(category.id) && (
              <div className="border-t bg-gray-50">
                {/* Subcategory Form */}
                {showSubcategoryForm && selectedCategoryId === category.id && (
                  <div className="p-4 border-b">
                    <h4 className="font-semibold mb-3">
                      {editingSubcategory ? 'Edit Subcategory' : 'Create Subcategory'}
                    </h4>
                    <form onSubmit={handleSubcategorySubmit} className="space-y-3">
                      <input type="hidden" name="categoryId" value={category.id} />
                      <div>
                        <label className="block text-sm font-medium mb-1">Name *</label>
                        <input
                          type="text"
                          name="name"
                          defaultValue={editingSubcategory?.name || ''}
                          required
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="Subcategory name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Slug (auto-generated if empty)</label>
                        <input
                          type="text"
                          name="slug"
                          defaultValue={editingSubcategory?.slug || ''}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="subcategory-slug"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                          name="description"
                          defaultValue={editingSubcategory?.description || ''}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="Subcategory description"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                          name="isActive"
                          defaultValue={editingSubcategory?.isActive !== false ? 'true' : 'false'}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                        >
                          {editingSubcategory ? 'Update' : 'Create'} Subcategory
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSubcategoryForm(false);
                            setSelectedCategoryId(null);
                            setEditingSubcategory(null);
                          }}
                          className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Subcategories List */}
                <div className="p-4 space-y-2">
                  {category.subcategories?.length > 0 ? (
                    category.subcategories.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 bg-white rounded border"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-xs text-gray-500">
                            Slug: {sub.slug} | Ads: {sub._count?.ads || 0}
                          </p>
                          {!sub.isActive && (
                            <span className="text-xs text-red-500">(Inactive)</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingSubcategory(sub);
                              setSelectedCategoryId(category.id);
                              setShowSubcategoryForm(true);
                              if (!expandedCategories.has(category.id)) {
                                toggleCategory(category.id);
                              }
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete subcategory "${sub.name}"?`)) {
                                deleteSubcategory.mutate(sub.id);
                              }
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No subcategories. Click "Add Subcategory" to create one.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {(!categories || categories.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          No categories yet. Create your first category!
        </div>
      )}

    </div>
  );
}

