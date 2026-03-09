import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import api from '@/lib/api';
import LazyAdCard from '@/components/LazyAdCard';
import Link from 'next/link';
import { FiChevronRight, FiMapPin, FiTag } from 'react-icons/fi';

interface ListPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function getListData(slug: string) {
  try {
    const response = await api.get(`/clusters/lists/${slug}`);
    if (response.data.success) {
      return response.data.list;
    }
    return null;
  } catch (error) {
    console.error('Error fetching list:', error);
    return null;
  }
}

export async function generateMetadata({ params }: ListPageProps): Promise<Metadata> {
  const { slug } = await params;
  const list = await getListData(slug);

  if (!list) {
    return {
      title: 'List Not Found',
      description: 'The requested list could not be found.'
    };
  }

  return {
    title: list.metaTitle || list.title,
    description: list.metaDescription,
    keywords: list.keywords || [],
    openGraph: {
      title: list.metaTitle || list.title,
      description: list.metaDescription,
      type: 'website',
    },
    alternates: {
      canonical: `/lists/${list.slug}`,
    },
  };
}

export default async function ListPage({ params }: ListPageProps) {
  const { slug } = await params;
  const list = await getListData(slug);

  if (!list) {
    notFound();
  }

  const ads = list.ads || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <nav className="mb-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/lists" className="hover:text-blue-600">Lists</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{list.title}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{list.title}</h1>
          
          {list.description && (
            <p className="text-gray-700 mb-4">{list.description}</p>
          )}

          {/* List Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <FiTag className="w-4 h-4" />
              <span>{list.adCount} {list.adCount === 1 ? 'ad' : 'ads'}</span>
            </div>
            {list.cluster?.location && (
              <div className="flex items-center gap-2">
                <FiMapPin className="w-4 h-4" />
                <span>
                  {list.cluster.location.city || list.cluster.location.state || list.cluster.location.name}
                </span>
              </div>
            )}
            {list.cluster?.category && (
              <div className="flex items-center gap-2">
                <span className="font-medium">{list.cluster.category.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ads Grid */}
        {ads.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 items-stretch mb-6">
              {ads.map((ad: any, index: number) => (
                <LazyAdCard key={ad.id} ad={ad} variant="olx" priority={index < 6} eager={index < 8} />
              ))}
            </div>

            {/* Load More (if needed) */}
            {list.adCount > ads.length && (
              <div className="text-center">
                <button className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors">
                  Load More Ads
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">No ads found in this list</p>
            <Link 
              href="/ads" 
              className="text-orange-500 hover:text-orange-600 font-medium flex items-center justify-center gap-1"
            >
              Browse all ads <FiChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* SEO Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">About This List</h2>
          <div className="prose prose-sm max-w-none text-gray-700">
            <p>
              {list.metaDescription}
            </p>
            {list.cluster?.category && (
              <p className="mt-4">
                Find the best deals on {list.cluster.category.name.toLowerCase()}
                {list.cluster.location && ` in ${list.cluster.location.city || list.cluster.location.state || list.cluster.location.name}`}
                {list.cluster.maxPrice && ` under ₹${Math.round(list.cluster.maxPrice / 100000)} lakh`}
                . Browse verified listings, compare prices, and connect with sellers directly.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

