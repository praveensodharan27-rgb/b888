'use client';

import Link from 'next/link';
import { FiBarChart2, FiInfo, FiLock, FiSettings, FiTag } from 'react-icons/fi';

export default function CookiesSettingsPage() {
  const sections = [
    {
      title: '1. What Are Cookies?',
      content:
        'Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and understand how the site is used.',
    },
    {
      title: '2. How We Use Cookies',
      content:
        'We use cookies to keep you signed in, remember your settings, improve performance, measure usage, and help prevent fraud and abuse.',
    },
    {
      title: '3. Types of Cookies We Use',
      content:
        'Essential cookies are required for basic site functions. Preference cookies remember settings. Analytics cookies help us understand usage. Marketing cookies may be used to deliver relevant messages (where applicable).',
    },
    {
      title: '4. Managing Cookies',
      content:
        'You can manage or delete cookies in your browser settings. Disabling some cookies may impact site functionality (for example, staying logged in or saving preferences).',
    },
    {
      title: '5. Changes to This Policy',
      content:
        'We may update this Cookies Settings page from time to time. We will post updates here and, where appropriate, provide additional notice.',
    },
  ];

  const cookieTypes = [
    { icon: FiLock, title: 'Essential', desc: 'Login sessions, security, core features' },
    { icon: FiSettings, title: 'Preferences', desc: 'Language, UI preferences, saved settings' },
    { icon: FiBarChart2, title: 'Analytics', desc: 'Usage insights to improve performance' },
    { icon: FiTag, title: 'Marketing', desc: 'Relevant content and messaging (if enabled)' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <FiSettings className="w-12 h-12" />
              <h1 className="text-5xl font-bold">Cookies Settings</h1>
            </div>
            <p className="text-xl text-slate-200 mb-6">Last updated: January 2026</p>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-sm text-slate-100">
                This page explains how cookies are used and how you can manage them on your device.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Cookie Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {cookieTypes.map((t, idx) => {
              const Icon = t.icon;
              return (
                <div key={idx} className="bg-white rounded-xl shadow-md p-6 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6 text-slate-700" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">{t.title}</h3>
                  <p className="text-xs text-gray-600">{t.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <div className="space-y-8">
              {sections.map((s, idx) => (
                <div key={idx} className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{s.title}</h2>
                  <p className="text-gray-700 leading-relaxed">{s.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Related Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/privacy"
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FiInfo className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Privacy Policy</h3>
              <p className="text-sm text-gray-600">Learn how we protect your data</p>
            </Link>

            <Link
              href="/terms"
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                <FiLock className="w-6 h-6 text-slate-700" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Terms of Service</h3>
              <p className="text-sm text-gray-600">Read our terms and conditions</p>
            </Link>

            <Link
              href="/contact"
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <FiSettings className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600">Contact our support team</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

