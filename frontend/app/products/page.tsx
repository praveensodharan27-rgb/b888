'use client';

import { useState, useMemo } from 'react';
import { FiEdit, FiUser, FiMail, FiHash, FiDollarSign, FiTag, FiInfo, FiSettings } from 'react-icons/fi';
import { useAds } from '@/hooks/useAds';
import ImageWithFallback from '@/components/ImageWithFallback';
import Link from 'next/link';

export default function ProductsPage() {
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const { data, isLoading, isError } = useAds({ limit: 20 });

  const products = data?.ads || [];

  const handleEdit = (productId: string) => {
    setEditingProduct(productId);
    // Navigate to edit page or open edit modal
    window.location.href = `/edit-ad/${productId}`;
  };

  // Helper function to format and get product specifications
  const getSpecifications = (attributes: any) => {
    if (!attributes || typeof attributes !== 'object') return [];
    
    const attrs = attributes as Record<string, any>;
    const priorityKeys = ['brand', 'model', 'make', 'storage_gb', 'ram_gb', 'year', 'kms_driven', 'fuel_type', 'transmission', 'bedrooms', 'bathrooms', 'area_sqft', 'breed', 'type', 'color', 'size', 'material', 'warranty'];
    
    // Get priority attributes first
    const priorityAttrs: Array<{ key: string; value: any }> = [];
    const otherAttrs: Array<{ key: string; value: any }> = [];
    
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const attr = { key: formattedKey, value: Array.isArray(value) ? value.join(', ') : String(value) };
        
        if (priorityKeys.includes(key)) {
          priorityAttrs.push(attr);
        } else {
          otherAttrs.push(attr);
        }
      }
    });
    
    // Return all attributes (priority first, then others)
    return [...priorityAttrs, ...otherAttrs];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load products</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Product List</h1>

        <div className="space-y-6">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No products found</p>
            </div>
          ) : (
            products.map((product: any) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Product Details Section */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Product Details</h2>
                    <button
                      onClick={() => handleEdit(product.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <FiEdit className="w-4 h-4" />
                      Edit
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Product Image and Basic Info */}
                    <div className="flex items-start gap-6">
                      {product.images && product.images.length > 0 && (
                        <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          <ImageWithFallback
                            src={product.images[0]}
                            alt={product.title}
                            width={128}
                            height={128}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-3">
                        <div>
                          <span className="text-sm text-gray-500 block mb-1">Title:</span>
                          <p className="text-base font-medium text-gray-900">{product.title}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500 block mb-1">Price:</span>
                          <p className="text-lg font-semibold text-gray-900">
                            ₹{product.price?.toLocaleString('en-IN') || '0'}
                          </p>
                        </div>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <div>
                            <span className="text-sm text-gray-500 block mb-1">Original Price:</span>
                            <p className="text-base text-gray-500 line-through">
                              ₹{product.originalPrice.toLocaleString('en-IN')}
                            </p>
                          </div>
                        )}
                        {product.discount && product.discount > 0 && (
                          <div>
                            <span className="text-sm text-gray-500 block mb-1">Discount:</span>
                            <p className="text-base font-medium text-green-600">
                              {product.discount}% OFF
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      {product.condition && (
                        <div>
                          <span className="text-sm text-gray-500 block mb-1">Condition:</span>
                          <p className="text-base font-medium text-gray-900">
                            {product.condition}
                          </p>
                        </div>
                      )}
                      {product.category && (
                        <div>
                          <span className="text-sm text-gray-500 block mb-1">Category:</span>
                          <p className="text-base font-medium text-gray-900">
                            {product.category.name}
                          </p>
                        </div>
                      )}
                      {product.subcategory && (
                        <div>
                          <span className="text-sm text-gray-500 block mb-1">Subcategory:</span>
                          <p className="text-base font-medium text-gray-900">
                            {product.subcategory.name}
                          </p>
                        </div>
                      )}
                      {product.views !== undefined && (
                        <div>
                          <span className="text-sm text-gray-500 block mb-1">Views:</span>
                          <p className="text-base font-medium text-gray-900">
                            {product.views.toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}
                    </div>

                    {product.description && (
                      <div className="pt-4 border-t border-gray-100">
                        <span className="text-sm text-gray-500 block mb-1">Description:</span>
                        <p className="text-base text-gray-700 line-clamp-3">
                          {product.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Specifications Section */}
                {product.attributes && Object.keys(product.attributes).length > 0 && (
                  <div className="p-6 bg-white border-t border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-gray-900">Specifications</h2>
                      <button
                        onClick={() => handleEdit(product.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <FiEdit className="w-4 h-4" />
                        Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getSpecifications(product.attributes).map((spec, index) => (
                        <div key={index} className="flex flex-col">
                          <span className="text-sm text-gray-500 mb-1">{spec.key}:</span>
                          <p className="text-base font-medium text-gray-900">{spec.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seller Information Section */}
                {product.user && (
                  <div className="p-6 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-gray-900">Seller Information</h2>
                      <button
                        onClick={() => handleEdit(product.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
                      >
                        <FiEdit className="w-4 h-4" />
                        Edit
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        {product.user.avatar ? (
                          <ImageWithFallback
                            src={product.user.avatar}
                            alt={product.user.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center flex-shrink-0">
                            <FiUser className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <div>
                            <span className="text-sm text-gray-500 block mb-1">Name:</span>
                            <p className="text-base font-medium text-gray-900">
                              {product.user.name || 'N/A'}
                            </p>
                          </div>
                          {product.user.email && (
                            <div>
                              <span className="text-sm text-gray-500 block mb-1">Email:</span>
                              <p className="text-base text-gray-700">{product.user.email}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-sm text-gray-500 block mb-1">Product ID:</span>
                            <p className="text-base font-mono text-gray-700">{product.id}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

