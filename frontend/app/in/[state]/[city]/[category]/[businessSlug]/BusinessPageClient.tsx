'use client';

import { useState } from 'react';

type Props = { businessId: string };

export function BusinessPageClient({ businessId }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const authorName = (form.elements.namedItem('authorName') as HTMLInputElement)?.value?.trim();
    const rating = parseInt((form.elements.namedItem('rating') as HTMLSelectElement)?.value || '0', 10);
    const content = (form.elements.namedItem('content') as HTMLTextAreaElement)?.value?.trim();
    if (!authorName || rating < 1 || rating > 5) return;
    setLoading(true);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${api}/directory/businesses/${businessId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, rating, content }),
      });
      const data = await res.json();
      if (data.success) setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-gray-600">Thank you! Your review has been submitted.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Write a review</h2>
      <form onSubmit={handleReview} className="mt-4 space-y-4">
        <div>
          <label htmlFor="authorName" className="block text-sm font-medium text-gray-700">Your name</label>
          <input
            id="authorName"
            name="authorName"
            type="text"
            required
            maxLength={120}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="rating" className="block text-sm font-medium text-gray-700">Rating (1–5)</label>
          <select id="rating" name="rating" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2">
            <option value="">Select</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} ★</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">Review (optional)</label>
          <textarea id="content" name="content" rows={3} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </div>
        <button type="submit" disabled={loading} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Submitting…' : 'Submit review'}
        </button>
      </form>
    </section>
  );
}
