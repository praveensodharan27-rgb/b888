'use client';

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Back Button Skeleton */}
        <div className="mb-6">
          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          {/* Decorative Background */}
          <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse"></div>

          {/* Profile Content */}
          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row gap-6 -mt-16">
              {/* Avatar Skeleton */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-white shadow-xl animate-pulse"></div>
              </div>

              {/* Info Skeleton */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                </div>

                {/* Stats Skeleton */}
                <div className="flex gap-6 mb-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>

                {/* Tags Skeleton */}
                <div className="flex gap-3">
                  <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About Section Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Listings Section Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

