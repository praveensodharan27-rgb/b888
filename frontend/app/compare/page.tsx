'use client';

import { useEffect } from 'react';
import { useComparison } from '@/hooks/useComparison';
import { useRouter } from 'next/navigation';
import ImageWithFallback from '@/components/ImageWithFallback';
import { FiX, FiMapPin, FiUser, FiEye, FiTag, FiTrash2 } from 'react-icons/fi';
import Link from 'next/link';
import { getAdUrl } from '@/lib/directory';
import { formatDistanceToNow } from 'date-fns';
import toast from '@/lib/toast';

const getConditionLabel = (condition: string | null | undefined) => {
  if (!condition) return 'N/A';
  const conditions: Record<string, string> = {
    NEW: 'New',
    LIKE_NEW: 'Like New',
    USED: 'Used',
    REFURBISHED: 'Refurbished',
  };
  return conditions[condition] || condition;
};

export default function ComparePage() {
  const { comparisonItems, removeFromComparison, clearComparison, mounted } = useComparison();
  const router = useRouter();

  // Debug: Log when comparisonItems changes
  useEffect(() => {
    console.log('Comparison items changed:', comparisonItems.length);
  }, [comparisonItems]);

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (comparisonItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-lg shadow-md p-12">
            <div className="text-6xl mb-4">📊</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">No Items to Compare</h1>
            <p className="text-gray-600 mb-8">
              Add products to comparison to see them side by side. You can compare up to 4 items.
            </p>
            <Link
              href="/ads"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
            >
              Browse Ads
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get all unique attributes across all items for comparison
  const getComparisonFields = () => {
    const fields = [
      { key: 'image', label: 'Image' },
      { key: 'title', label: 'Title' },
      { key: 'price', label: 'Price' },
      { key: 'originalPrice', label: 'Original Price' },
      { key: 'condition', label: 'Condition' },
      { key: 'location', label: 'Location' },
      { key: 'category', label: 'Category' },
      { key: 'views', label: 'Views' },
      { key: 'seller', label: 'Seller' },
      { key: 'posted', label: 'Posted' },
      { key: 'description', label: 'Description' },
    ];
    return fields;
  };

  const fields = getComparisonFields();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Comparison</h1>
          <p className="text-gray-600">
            Compare {comparisonItems.length} {comparisonItems.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="flex gap-3">
          {comparisonItems.length > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const confirmed = window.confirm('Are you sure you want to clear all comparison items?');
                if (confirmed) {
                  clearComparison();
                  toast.success('Comparison cleared');
                }
              }}
              type="button"
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <FiTrash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
          <Link
            href="/ads"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Add More
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                  Feature
                </th>
                {comparisonItems.map((item) => (
                  <th
                    key={item.id}
                    className="px-4 py-4 text-center text-sm font-semibold text-gray-700 min-w-[280px] align-top"
                  >
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => {
                          removeFromComparison(item.id);
                          toast.success('Removed from comparison');
                        }}
                        className="ml-auto mb-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove from comparison"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                      <Link href={getAdUrl(item)} className="block">
                        <div className="relative w-32 h-32 mx-auto mb-3 rounded-lg overflow-hidden bg-gray-100">
                          {item.images && item.images.length > 0 && item.images[0] ? (
                            <ImageWithFallback
                              src={item.images[0]}
                              alt={item.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <FiTag className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-primary-600 transition-colors">
                          {item.title}
                        </h3>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fields.map((field) => (
                <tr key={field.key} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm font-medium text-gray-700 sticky left-0 bg-white z-10">
                    {field.label}
                  </td>
                  {comparisonItems.map((item) => (
                    <td key={item.id} className="px-4 py-4 text-sm text-gray-900 text-center">
                      {field.key === 'price' && (
                        <div>
                          <p className="text-xl font-bold text-primary-600">
                            ₹{item.price.toLocaleString('en-IN')}
                          </p>
                          {item.originalPrice && item.originalPrice > item.price && (
                            <p className="text-sm text-gray-500 line-through">
                              ₹{item.originalPrice.toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                      )}
                      {field.key === 'originalPrice' && (
                        <p className="text-sm text-gray-600">
                          {item.originalPrice && item.originalPrice > item.price
                            ? `₹${item.originalPrice.toLocaleString('en-IN')}`
                            : 'N/A'}
                        </p>
                      )}
                      {field.key === 'condition' && (
                        <p className="text-sm">{getConditionLabel(item.condition)}</p>
                      )}
                      {field.key === 'location' && (
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <FiMapPin className="w-4 h-4 text-gray-400" />
                          <span>{item.location?.name || 'N/A'}</span>
                        </div>
                      )}
                      {field.key === 'category' && (
                        <p className="text-sm">{item.category?.name || 'N/A'}</p>
                      )}
                      {field.key === 'views' && (
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <FiEye className="w-4 h-4 text-gray-400" />
                          <span>{item.views?.toLocaleString('en-IN') || '0'}</span>
                        </div>
                      )}
                      {field.key === 'seller' && (
                        <div className="flex items-center justify-center gap-2">
                          {item.user?.avatar ? (
                            <ImageWithFallback
                              src={item.user.avatar}
                              alt={item.user.name}
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                              <FiUser className="w-3 h-3 text-primary-600" />
                            </div>
                          )}
                          <span className="text-sm">{item.user?.name || 'N/A'}</span>
                        </div>
                      )}
                      {field.key === 'posted' && (
                        <p className="text-sm text-gray-600">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </p>
                      )}
                      {field.key === 'description' && (
                        <p className="text-sm text-gray-600 line-clamp-3 text-left">
                          {item.description || 'No description'}
                        </p>
                      )}
                      {field.key === 'title' && (
                        <Link
                          href={getAdUrl(item)}
                          className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          View Details
                        </Link>
                      )}
                      {field.key === 'image' && null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        {comparisonItems.map((item) => (
          <Link
            key={item.id}
            href={getAdUrl(item)}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            View {item.title.substring(0, 20)}...
          </Link>
        ))}
      </div>
    </div>
  );
}

