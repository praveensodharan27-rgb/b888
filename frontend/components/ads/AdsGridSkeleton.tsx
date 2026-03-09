'use client';

/** Skeleton loading grid for ads listing - matches AdCardOLX layout, SSR-safe */
export default function AdsGridSkeleton({
  count = 12,
  variant = 'default',
}: {
  count?: number;
  variant?: 'default' | 'service' | 'home';
}) {
  const items = Array.from({ length: count }, (_, i) => i);

  /* Homepage: 4 columns at lg to match Fresh Recommendations grid */
  if (variant === 'home') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 w-full">
        {items.map((i) => (
          <div
            key={i}
            className="h-full flex flex-col bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 animate-pulse"
            aria-hidden
          >
            <div className="w-full aspect-[4/3] flex-shrink-0 bg-gray-200" />
            <div className="p-4 flex-1 flex flex-col min-h-0 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'service') {
    return (
      <div className="grid grid-cols-1 gap-5 mb-8 w-full">
        {items.map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse flex flex-col sm:flex-row min-h-[200px]"
            aria-hidden
          >
            <div className="w-full sm:w-[40%] aspect-[4/3] sm:aspect-auto sm:min-h-[200px] bg-gray-200 flex-shrink-0" />
            <div className="flex-1 p-4 sm:p-5 space-y-3 flex flex-col justify-center min-w-0">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="flex gap-2">
                <div className="h-5 bg-gray-200 rounded w-16" />
                <div className="h-5 bg-gray-200 rounded w-28" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="flex gap-3 mt-2">
                <div className="h-10 flex-1 bg-gray-200 rounded-lg" />
                <div className="h-10 flex-1 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 mb-8 w-full">
      {items.map((i) => (
        <div
          key={i}
          className="h-full flex flex-col bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 animate-pulse"
          aria-hidden
        >
          <div className="w-full aspect-[4/3] flex-shrink-0 bg-gray-200" />
          <div className="p-5 flex-1 flex flex-col min-h-0 space-y-3">
            <div className="h-7 bg-gray-200 rounded w-2/3" />
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
