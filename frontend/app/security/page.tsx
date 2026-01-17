'use client';

import Link from 'next/link';
import { FiAlertCircle, FiCheck, FiLock, FiShield } from 'react-icons/fi';

export default function SecurityPage() {
  const sections = [
    {
      title: '1. Account Security',
      content:
        'Use a strong, unique password and keep your login details private. If you suspect unauthorized access, change your password immediately.',
    },
    {
      title: '2. Safe Buying & Selling',
      content:
        'Meet in public places, verify items before payment, avoid sharing OTPs, and be cautious of deals that feel too good to be true.',
    },
    {
      title: '3. Fraud Prevention',
      content:
        'We monitor activity for suspicious behavior, but scams can still happen. Report suspicious users, messages, or listings so we can investigate.',
    },
    {
      title: '4. Data Protection',
      content:
        'We take reasonable technical and organizational measures to protect your data. No online service is 100% secure, but we continuously improve our security controls.',
    },
    {
      title: '5. Reporting a Vulnerability',
      content:
        'If you believe you found a security issue, please report it responsibly. Do not publicly disclose vulnerabilities before we have a chance to address them.',
    },
  ];

  const highlights = [
    { title: 'Secure Sessions', desc: 'Protected login sessions and token-based auth', icon: FiLock },
    { title: 'Privacy Controls', desc: 'Control what you share (like phone visibility)', icon: FiShield },
    { title: 'Fast Reporting', desc: 'Report scams & suspicious activity quickly', icon: FiAlertCircle },
    { title: 'Verified Actions', desc: 'Moderation & safety checks on content', icon: FiCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <FiShield className="w-12 h-12" />
              <h1 className="text-5xl font-bold">Security</h1>
            </div>
            <p className="text-xl text-emerald-100 mb-6">Last updated: January 2026</p>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-sm text-emerald-50">
                Your safety matters. Follow these best practices for secure buying, selling, and account protection.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {highlights.map((h, idx) => {
              const Icon = h.icon;
              return (
                <div key={idx} className="bg-white rounded-xl shadow-md p-6 flex gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{h.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{h.desc}</p>
                  </div>
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

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/privacy"
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FiShield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Privacy Policy</h3>
              <p className="text-sm text-gray-600">Understand how data is handled</p>
            </Link>

            <Link
              href="/terms"
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                <FiLock className="w-6 h-6 text-slate-700" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Terms of Service</h3>
              <p className="text-sm text-gray-600">Read the platform rules</p>
            </Link>

            <Link
              href="/contact"
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <FiAlertCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Report an Issue</h3>
              <p className="text-sm text-gray-600">Contact support for help</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

