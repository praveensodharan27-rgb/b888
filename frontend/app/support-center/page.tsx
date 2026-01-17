'use client';

import Link from 'next/link';
import { FiArrowRight, FiHelpCircle, FiMail, FiMessageCircle, FiShield } from 'react-icons/fi';

export default function SupportCenterPage() {
  const cards = [
    {
      title: 'Go to Help Center',
      desc: 'Browse FAQs, guides, and common answers.',
      href: '/help',
      icon: FiHelpCircle,
      color: 'blue',
    },
    {
      title: 'Security',
      desc: 'Best practices for safe buying and selling.',
      href: '/security',
      icon: FiShield,
      color: 'emerald',
    },
    {
      title: 'Contact Support',
      desc: 'Reach out if you need direct help.',
      href: '/contact',
      icon: FiMail,
      color: 'purple',
    },
    {
      title: 'Live Chat',
      desc: 'Chat with sellers and get help in-app.',
      href: '/chat',
      icon: FiMessageCircle,
      color: 'orange',
    },
  ] as const;

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  } as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <FiHelpCircle className="h-12 w-12" />
              <h1 className="text-5xl font-bold">Support Center</h1>
            </div>
            <p className="text-xl text-blue-100">
              For guides and FAQs, visit our Help Center page.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 -mt-8">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.title}
                  href={c.href}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div
                    className={`w-14 h-14 bg-gradient-to-br ${colorClasses[c.color]} rounded-xl flex items-center justify-center mb-4 shadow-lg`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{c.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{c.desc}</p>
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                    Open <FiArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-12 bg-white rounded-xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900">Looking for FAQs?</h2>
            <p className="mt-3 text-sm text-gray-600">
              Your full help center content is available at <span className="font-semibold">/help</span>.
            </p>
            <div className="mt-6">
              <Link
                href="/help"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-md"
              >
                Go to Help Center <FiArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

