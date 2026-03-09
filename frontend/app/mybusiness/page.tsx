'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  FiBriefcase,
  FiPlus,
  FiEdit2,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiMapPin,
  FiPhone,
} from 'react-icons/fi';
import api from '@/lib/api';
import Image from 'next/image';

type Business = {
  id: string;
  businessName: string;
  slug: string;
  category: string;
  city: string;
  logo: string | null;
  coverImage: string | null;
  phone: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
};

export default function MyBusinessPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['business', 'my'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Business | null }>('/business/my');
      return res.data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || (user && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const business = data?.data ?? null;

  // No business – empty state
  if (!business && !isLoading && !error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <FiBriefcase className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900 sm:text-2xl">
              My Business
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Create your business profile to appear in search and category listings. One business per account for now.
            </p>
            <Link
              href="/mybusiness/create"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <FiPlus className="h-4 w-4" />
              Create Your Business
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">Failed to load your business.</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-3 text-sm text-red-600 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Dashboard – business exists
  const publicUrl = `/business/${business!.slug}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-gray-900">My Business</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your business profile</p>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Cover / logo row */}
          <div className="relative h-32 bg-gray-100 sm:h-40">
            {business!.coverImage ? (
              <Image
                src={business!.coverImage}
                alt={`${business!.businessName} cover`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 672px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <FiBriefcase className="h-12 w-12" />
              </div>
            )}
            {business!.logo && (
              <div className="absolute bottom-0 left-4 translate-y-1/2 h-16 w-16 rounded-xl border-2 border-white bg-white shadow overflow-hidden">
                <Image
                  src={business!.logo}
                  alt={`${business!.businessName} logo`}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="p-4 pt-10 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{business!.businessName}</h2>
                <p className="text-sm text-gray-600">{business!.category}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {business!.city && (
                    <span className="flex items-center gap-1">
                      <FiMapPin className="h-4 w-4" />
                      {business!.city}
                    </span>
                  )}
                  {business!.phone && (
                    <span className="flex items-center gap-1">
                      <FiPhone className="h-4 w-4" />
                      {business!.phone}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      business!.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {business!.isActive ? (
                      <>
                        <FiCheckCircle className="h-3.5 w-3.5" /> Active
                      </>
                    ) : (
                      <>
                        <FiXCircle className="h-3.5 w-3.5" /> Inactive
                      </>
                    )}
                  </span>
                  {business!.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      <FiCheckCircle className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <Link
                  href={`/mybusiness/edit/${business!.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <FiEdit2 className="h-4 w-4" />
                  Edit
                </Link>
                <Link
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <FiEye className="h-4 w-4" />
                  Preview
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link
                href={`/mybusiness/edit/${business!.id}`}
                className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-sm font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700"
              >
                Edit business details
              </Link>
              <Link
                href={`/mybusiness/edit/${business!.id}#services`}
                className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-sm font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700"
              >
                Manage services
              </Link>
              <Link
                href={`/mybusiness/edit/${business!.id}#images`}
                className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-sm font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700"
              >
                Upload images
              </Link>
              <Link
                href={`/mybusiness/edit/${business!.id}#hours`}
                className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-sm font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700"
              >
                Working hours
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
