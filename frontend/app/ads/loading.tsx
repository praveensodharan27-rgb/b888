/**
 * Loading UI - shows when navigating to ads listing
 */
export default function AdsListingLoading() {
  return (
    <div className="container mx-auto px-4 py-6 animate-pulse">
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-[280px] space-y-4">
          <div className="h-10 bg-gray-200 rounded-lg" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </aside>
        <main className="flex-1">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
