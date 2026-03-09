/**
 * Loading UI - shows instantly when clicking ad card (before page loads)
 * Skeleton matching OLX-style product detail layout
 */
export default function AdDetailLoading() {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse">
        <div className="flex gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-200" />
          <div className="flex-1 h-10 bg-gray-200 rounded-lg max-w-xs" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8">
          {/* Left - gallery + content */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="aspect-[4/3] min-h-[280px] bg-gray-200 rounded-xl" />
              <div className="flex gap-2 mt-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg flex-shrink-0" />
                ))}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 w-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded" />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
                <div className="h-4 bg-gray-100 rounded w-4/5" />
              </div>
            </div>
          </div>
          {/* Right - sticky card */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 lg:sticky lg:top-20">
              <div className="h-10 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-6" />
              <div className="h-12 bg-gray-200 rounded-xl mb-3" />
              <div className="h-12 bg-gray-100 rounded-xl" />
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
