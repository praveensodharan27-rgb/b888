import { Metadata } from 'next';
import Link from 'next/link';
import api from '@/lib/api';
import { FiChevronRight, FiTag, FiMapPin } from 'react-icons/fi';

export const metadata: Metadata = {
  title: 'Browse Lists | Auto-Generated Collections | Sell Box',
  description: 'Browse our auto-generated lists of products organized by category, location, price, and more. Find the best deals on Sell Box.',
};

async function getLists() {
  try {
    const response = await api.get('/clusters/lists?limit=50&sortBy=priority');
    if (response.data.success) {
      return response.data.lists || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching lists:', error);
    return [];
  }
}

export default async function ListsPage() {
  const lists = await getLists();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Browse Lists</h1>
          <p className="text-gray-600 text-lg">
            Discover curated collections of products organized by category, location, price, and more.
          </p>
        </div>

        {/* Lists Grid */}
        {lists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list: any) => (
              <Link
                key={list.id}
                href={`/lists/${list.slug}`}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                  {list.title}
                </h2>
                
                {list.metaDescription && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {list.metaDescription}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <FiTag className="w-4 h-4" />
                    <span>{list.adCount} {list.adCount === 1 ? 'ad' : 'ads'}</span>
                  </div>
                  {list.cluster?.location && (
                    <div className="flex items-center gap-2">
                      <FiMapPin className="w-4 h-4" />
                      <span className="truncate max-w-[100px]">
                        {list.cluster.location.city || list.cluster.location.state || list.cluster.location.name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center text-orange-500 font-medium text-sm">
                  View List <FiChevronRight className="w-4 h-4 ml-1" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 text-lg">No lists available at the moment</p>
            <Link 
              href="/ads" 
              className="text-orange-500 hover:text-orange-600 font-medium inline-flex items-center gap-1 mt-4"
            >
              Browse all ads <FiChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

