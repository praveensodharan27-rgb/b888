/**
 * CategorySkeleton Component
 * Loading skeleton for Post Ad page while categories are being fetched
 */

export default function CategorySkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>

        {/* Form Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Category Selection Skeleton */}
          <div className="mb-6">
            <div className="h-5 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>

          {/* Subcategory Selection Skeleton */}
          <div className="mb-6">
            <div className="h-5 bg-gray-200 rounded w-40 mb-3 animate-pulse"></div>
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>

          {/* Title Input Skeleton */}
          <div className="mb-6">
            <div className="h-5 bg-gray-200 rounded w-24 mb-3 animate-pulse"></div>
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>

          {/* Description Textarea Skeleton */}
          <div className="mb-6">
            <div className="h-5 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
            <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>

          {/* Image Upload Skeleton */}
          <div className="mb-6">
            <div className="h-5 bg-gray-200 rounded w-28 mb-3 animate-pulse"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>

          {/* Price Input Skeleton */}
          <div className="mb-6">
            <div className="h-5 bg-gray-200 rounded w-20 mb-3 animate-pulse"></div>
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>

          {/* Location Skeleton */}
          <div className="mb-6">
            <div className="h-5 bg-gray-200 rounded w-28 mb-3 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
              <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Submit Button Skeleton */}
          <div className="flex justify-end gap-4 mt-8">
            <div className="h-12 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
            <div className="h-12 bg-primary-200 rounded-lg w-40 animate-pulse"></div>
          </div>
        </div>

        {/* Sidebar Skeleton (if applicable) */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
