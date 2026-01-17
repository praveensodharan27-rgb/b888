'use client';

import Link from 'next/link';
import { FiArrowRight, FiCheckCircle, FiGlobe, FiTarget, FiTrendingUp } from 'react-icons/fi';

export default function SustainabilityReportPage() {
  const highlights = [
    {
      title: 'Extending product life',
      desc: 'Second-hand trading keeps items in use longer and reduces overall waste.',
      icon: FiTrendingUp,
    },
    {
      title: 'Local-first community',
      desc: 'Local deals reduce long shipping routes and support neighborhood commerce.',
      icon: FiGlobe,
    },
    {
      title: 'Trust & safety focus',
      desc: 'Moderation and reporting tools help keep the marketplace reliable.',
      icon: FiCheckCircle,
    },
    {
      title: 'Clear goals',
      desc: 'We track practical metrics and iterate continuously for measurable impact.',
      icon: FiTarget,
    },
  ] as const;

  const stats = [
    { label: 'Items relisted', value: '50M+' },
    { label: 'Active users', value: '10M+' },
    { label: 'Cities covered', value: '120+' },
    { label: 'Reports reviewed', value: '24/7' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <FiTarget className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Sustainability Report</h1>
            </div>
            <p className="text-xl text-emerald-100 mb-6">Last updated: January 2026</p>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-sm text-emerald-50">
                A transparent snapshot of how the marketplace supports reuse, local trade, and safer transactions.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 -mt-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-xl shadow-md p-6 text-center">
                <div className="text-2xl font-extrabold text-emerald-700">{s.value}</div>
                <div className="mt-1 text-xs font-semibold tracking-widest text-gray-500 uppercase">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Highlights */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Highlights</h2>
            <p className="mt-3 text-sm text-gray-600">
              We focus on practical improvements that make local trade safer and more sustainable.
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {highlights.map((h) => {
                const Icon = h.icon;
                return (
                  <div key={h.title} className="flex gap-4 rounded-lg border border-gray-100 p-6">
                    <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{h.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{h.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Methodology */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-10">
            <h2 className="text-3xl font-bold text-gray-900">How we measure</h2>
            <div className="mt-4 space-y-4 text-sm text-gray-700 leading-relaxed">
              <p>
                We publish clear, high-level metrics to show direction and progress. Numbers may include platform-wide estimates,
                anonymized aggregates, and operational indicators (like moderation response times).
              </p>
              <p>
                Our approach prioritizes user safety, transparency, and continuous improvement. If you have feedback on what you&apos;d like
                to see in future reports, let us know.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-md"
              >
                Share feedback <FiArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                About us
              </Link>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl shadow-xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-3">Build a better marketplace, together</h2>
            <p className="text-lg text-slate-200 mb-8">
              Explore safety resources and platform policies.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/help"
                className="px-8 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors shadow-lg"
              >
                Support Center
              </Link>
              <Link
                href="/security"
                className="px-8 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
              >
                Security
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

