'use client';

import Link from 'next/link';
import { FiArrowRight, FiBriefcase, FiCheckCircle, FiGlobe, FiTrendingUp, FiUsers } from 'react-icons/fi';

export default function PartnerProgramPage() {
  const benefits = [
    {
      title: 'More reach',
      desc: 'Co-marketing opportunities and featured placements (where applicable).',
      icon: FiTrendingUp,
    },
    {
      title: 'Trusted collaboration',
      desc: 'Work with a team focused on safe and reliable marketplace experiences.',
      icon: FiCheckCircle,
    },
    {
      title: 'Local-first impact',
      desc: 'Support local communities by enabling easier buying and selling.',
      icon: FiUsers,
    },
    {
      title: 'Flexible partnerships',
      desc: 'Affiliate, integration, and community programs—based on fit.',
      icon: FiGlobe,
    },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <FiBriefcase className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Partner Program</h1>
            </div>
            <p className="text-xl text-purple-100 mb-8">
              Let&apos;s collaborate to build trust, improve local trade, and grow together.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#apply"
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50 transition-colors shadow-lg"
              >
                Become a partner
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              >
                Contact us <FiArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Who is it for */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Who can partner with us?</h2>
            <p className="mt-3 text-sm text-gray-600">
              We&apos;re open to collaborations with communities, brands, and organizations aligned with user safety and local trade.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Communities', desc: 'Local groups and creators helping people trade responsibly.' },
                { title: 'Brands', desc: 'Brands looking to support circular economy and reuse.' },
                { title: 'Integrations', desc: 'Partners building tools and services for buyers & sellers.' },
              ].map((x) => (
                <div key={x.title} className="rounded-xl border border-gray-100 p-6">
                  <div className="font-bold text-gray-900">{x.title}</div>
                  <div className="mt-2 text-sm text-gray-600">{x.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-10">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div className="max-w-3xl">
                <h2 className="text-3xl font-bold text-gray-900">Partner benefits</h2>
                <p className="mt-3 text-sm text-gray-600">
                  A lightweight program designed for real-world collaboration.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 transition-colors shadow-md"
              >
                Start a conversation <FiArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="bg-white rounded-xl shadow-md p-7 hover:shadow-xl transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-purple-700" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{b.title}</h3>
                        <p className="mt-1 text-sm text-gray-600">{b.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Steps */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-10">
            <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
            <p className="mt-3 text-sm text-gray-600">A simple, transparent process.</p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: '1', title: 'Apply', desc: 'Share your details and partnership idea.' },
                { step: '2', title: 'Review', desc: 'We validate alignment with safety and community goals.' },
                { step: '3', title: 'Plan', desc: 'Define scope, responsibilities, and success metrics.' },
                { step: '4', title: 'Launch', desc: 'Go live and iterate based on results.' },
              ].map((s) => (
                <div key={s.step} className="rounded-xl border border-gray-100 p-6">
                  <div className="w-10 h-10 rounded-lg bg-purple-700 text-white flex items-center justify-center font-extrabold">
                    {s.step}
                  </div>
                  <div className="mt-4 font-bold text-gray-900">{s.title}</div>
                  <div className="mt-1 text-sm text-gray-600">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Apply */}
          <div id="apply" className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl shadow-xl p-12 text-center text-white scroll-mt-24">
            <h2 className="text-3xl font-bold mb-3">Apply to the Partner Program</h2>
            <p className="text-lg text-slate-200 mb-8">
              Tell us about your organization and what you want to build together.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/contact"
                className="px-8 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors shadow-lg"
              >
                Apply via Contact <FiArrowRight className="ml-2 inline h-4 w-4" />
              </Link>
              <Link
                href="/sustainability-report"
                className="px-8 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
              >
                Sustainability Report
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

