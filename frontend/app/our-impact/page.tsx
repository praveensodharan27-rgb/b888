'use client';

import Link from 'next/link';
import { FiArrowRight, FiCheckCircle, FiGlobe, FiShield, FiTarget, FiTrendingUp, FiUsers } from 'react-icons/fi';

export default function OurImpactPage() {
  const stats = [
    { label: 'Active users', value: '10M+', icon: FiUsers },
    { label: 'Items relisted', value: '50M+', icon: FiTrendingUp },
    { label: 'Cities covered', value: '120+', icon: FiGlobe },
    { label: 'Safety actions', value: '24/7', icon: FiShield },
  ] as const;

  const initiatives = [
    {
      title: 'Reuse at scale',
      desc: 'By helping items find a second home, we reduce waste and support more sustainable consumption.',
      icon: FiTrendingUp,
    },
    {
      title: 'Local-first commerce',
      desc: 'Local deals reduce long-distance shipping and strengthen neighborhood economies.',
      icon: FiGlobe,
    },
    {
      title: 'Trust & safety',
      desc: 'Reporting tools and moderation workflows help keep the marketplace reliable for everyone.',
      icon: FiShield,
    },
    {
      title: 'Clear goals',
      desc: 'We track practical indicators and iterate continuously for measurable impact.',
      icon: FiTarget,
    },
  ] as const;

  const milestones = [
    {
      title: 'Build safer trading',
      desc: 'Improve reporting, moderation, and scam prevention to protect users.',
    },
    {
      title: 'Make discovery smarter',
      desc: 'Help people find relevant items faster with better search and ranking.',
    },
    {
      title: 'Support local communities',
      desc: 'Enable local trade experiences that are simpler, faster, and more transparent.',
    },
    {
      title: 'Publish transparent updates',
      desc: 'Share metrics and progress through reports and product notes.',
    },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <FiTarget className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Our Impact</h1>
            </div>
            <p className="text-xl text-emerald-100 mb-6">
              Building a marketplace that promotes reuse, local trade, and safer transactions.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/sustainability-report"
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors shadow-lg"
              >
                View Sustainability Report <FiArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/partner-program"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              >
                Partner with us <FiArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 -mt-8">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white rounded-xl shadow-md p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50">
                    <Icon className="h-6 w-6 text-emerald-700" />
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-700">{s.value}</div>
                  <div className="mt-1 text-xs font-semibold tracking-widest text-gray-500 uppercase">{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Initiatives */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900">What we focus on</h2>
            <p className="mt-3 text-sm text-gray-600">
              Practical initiatives that improve safety, increase reuse, and strengthen local commerce.
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {initiatives.map((i) => {
                const Icon = i.icon;
                return (
                  <div key={i.title} className="flex gap-4 rounded-lg border border-gray-100 p-6">
                    <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{i.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{i.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900">How we deliver impact</h2>
            <p className="mt-3 text-sm text-gray-600">
              A simple roadmap that keeps us aligned on outcomes.
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {milestones.map((m, idx) => (
                <div key={m.title} className="rounded-xl border border-gray-100 p-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white font-extrabold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{m.title}</div>
                      <div className="mt-1 text-sm text-gray-600">{m.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Principles */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Our principles</h2>
            <p className="mt-3 text-sm text-gray-600">
              Impact is strongest when the experience is trusted and easy to use.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                'Safety first for every transaction.',
                'Transparency in policies and updates.',
                'Community-driven improvements.',
              ].map((t) => (
                <div key={t} className="flex items-start gap-3 rounded-xl border border-gray-100 p-6">
                  <FiCheckCircle className="mt-0.5 h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div className="text-sm font-semibold text-gray-900">{t}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl shadow-xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-3">Want to collaborate?</h2>
            <p className="text-lg text-slate-200 mb-8">
              Explore partnerships, read the report, or contact us with ideas.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/partner-program"
                className="px-8 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors shadow-lg"
              >
                Partner Program
              </Link>
              <Link
                href="/sustainability-report"
                className="px-8 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
              >
                Sustainability Report
              </Link>
              <Link
                href="/contact"
                className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

