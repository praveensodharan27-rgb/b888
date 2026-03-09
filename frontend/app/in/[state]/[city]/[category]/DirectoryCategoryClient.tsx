'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type Business = {
  id: string;
  slug: string;
  name: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  phone?: string;
  category?: { slug: string };
};

type Pagination = { page: number; pages: number; total: number; limit: number };

type Props = {
  stateSlug: string;
  citySlug: string;
  categorySlug: string;
  categoryName: string;
  stateName: string;
  cityName: string;
  initialBusinesses: Business[];
  initialPagination: Pagination;
  sort: string;
};

export function DirectoryCategoryClient({
  stateSlug,
  citySlug,
  categorySlug,
  categoryName,
  initialBusinesses,
  initialPagination,
  sort: initialSort,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sort, setSort] = useState(initialSort);
  const [businesses, setBusinesses] = useState(initialBusinesses);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);

  const handleSort = (newSort: string) => {
    setSort(newSort);
    const u = new URLSearchParams(searchParams.toString());
    u.set('sort', newSort);
    u.delete('page');
    router.push(`/in/${stateSlug}/${citySlug}/${categorySlug}?${u.toString()}`);
    setLoading(true);
    const api = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(
      `${api}/directory/businesses?stateSlug=${encodeURIComponent(stateSlug)}&citySlug=${encodeURIComponent(citySlug)}&categorySlug=${encodeURIComponent(categorySlug)}&page=1&sort=${encodeURIComponent(newSort)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.businesses) setBusinesses(d.businesses);
        if (d.pagination) setPagination(d.pagination);
      })
      .finally(() => setLoading(false));
  };

  const handlePage = (page: number) => {
    const u = new URLSearchParams(searchParams.toString());
    u.set('page', String(page));
    router.push(`/in/${stateSlug}/${citySlug}/${categorySlug}?${u.toString()}`);
    setLoading(true);
    const api = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(
      `${api}/directory/businesses?stateSlug=${encodeURIComponent(stateSlug)}&citySlug=${encodeURIComponent(citySlug)}&categorySlug=${encodeURIComponent(categorySlug)}&page=${page}&limit=20&sort=${encodeURIComponent(sort)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.businesses) setBusinesses(d.businesses);
        if (d.pagination) setPagination(d.pagination);
      })
      .finally(() => setLoading(false));
  };

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Listings</h2>
        <select
          value={sort}
          onChange={(e) => handleSort(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="rating">Sort by rating</option>
          <option value="newest">Newest first</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      {loading && <p className="mt-2 text-sm text-gray-500">Loading…</p>}
      <ul className="mt-4 space-y-4">
        {businesses.map((b) => (
          <li key={b.id}>
            <Link
              href={`/in/${stateSlug}/${citySlug}/${b.category?.slug || categorySlug}/${b.slug}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <span className="font-semibold text-gray-900">{b.name}</span>
              {(b.rating != null || b.reviewCount != null) && (
                <p className="mt-1 text-sm text-gray-500">
                  {b.rating != null && `★ ${b.rating}`}
                  {b.reviewCount != null && ` (${b.reviewCount} reviews)`}
                </p>
              )}
              {b.address && <p className="mt-1 text-sm text-gray-600">{b.address}</p>}
            </Link>
          </li>
        ))}
      </ul>
      {pagination.pages > 1 && (
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Pagination">
          {pagination.page > 1 && (
            <button
              type="button"
              onClick={() => handlePage(pagination.page - 1)}
              className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              Previous
            </button>
          )}
          <span className="flex items-center px-3 py-2 text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          {pagination.page < pagination.pages && (
            <button
              type="button"
              onClick={() => handlePage(pagination.page + 1)}
              className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              Next
            </button>
          )}
        </nav>
      )}
    </section>
  );
}
