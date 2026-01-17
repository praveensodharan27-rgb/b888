'use client';

import Link from 'next/link';
import { FiArrowRight, FiBook, FiClock, FiTag } from 'react-icons/fi';

export default function BlogPage() {
  const posts = [
    {
      title: 'Safer local trading: simple habits that prevent scams',
      excerpt:
        'A practical checklist for buyers and sellers—meeting safely, verifying items, and avoiding common fraud patterns.',
      dateLabel: 'Jan 2026',
      tags: ['Safety', 'Community'],
    },
    {
      title: 'How we rank ads: relevance, trust, and fairness',
      excerpt:
        'A high-level overview of how listings are organized so users can find what they need faster—without compromising safety.',
      dateLabel: 'Jan 2026',
      tags: ['Product', 'Search'],
    },
    {
      title: 'Building a cleaner marketplace experience',
      excerpt:
        'From spam reduction to better reporting tools—how we keep the platform useful for everyone.',
      dateLabel: 'Jan 2026',
      tags: ['Trust', 'Updates'],
    },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <FiBook className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Blog</h1>
            </div>
            <p className="text-xl text-blue-100">
              Updates, safety tips, and product notes from the team.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-8">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold text-gray-900">Latest posts</h2>
              <p className="mt-3 text-sm text-gray-600">
                We keep posts short and practical—focused on what helps users buy and sell better.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors shadow-md"
            >
              Suggest a topic <FiArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {posts.map((p) => (
              <div key={p.title} className="bg-white rounded-xl shadow-md p-7 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-xs text-gray-600">
                    <FiClock className="h-4 w-4 text-gray-400" />
                    {p.dateLabel}
                  </div>
                </div>

                <h3 className="mt-4 text-xl font-bold text-gray-900">{p.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{p.excerpt}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      <FiTag className="h-3.5 w-3.5 text-slate-500" />
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-6">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Read more <FiArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-3">Want updates in one place?</h2>
            <p className="text-lg text-blue-100 mb-8">
              Visit our help center for guides, policies, and safety resources.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/help"
                className="px-8 py-3 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              >
                Support Center
              </Link>
              <Link
                href="/about"
                className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors"
              >
                About us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

