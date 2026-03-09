'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBusinessWizard } from '@/contexts/BusinessWizardContext';

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

const STEPS = [
  { step: 1, label: 'Category', done: true },
  { step: 2, label: 'Business Details', active: true },
  { step: 3, label: 'Location', done: false },
];

export default function BusinessDetailsPage() {
  const router = useRouter();
  const { state, setDetails, persist } = useBusinessWizard();
  const [legalName, setLegalName] = useState(state.details.legalName);
  const [tradingName, setTradingName] = useState(state.details.tradingName);
  const [website, setWebsite] = useState(state.details.website);
  const [phone, setPhone] = useState(state.details.phone);
  const [email, setEmail] = useState(state.details.email);
  const [touched, setTouched] = useState({
    legalName: false,
    email: false,
  });

  useEffect(() => {
    setDetails({
      legalName,
      tradingName,
      website,
      phone,
      email,
    });
  }, [legalName, tradingName, website, phone, email, setDetails]);

  const valid =
    legalName.trim() !== '' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phone.trim() !== '';

  const handleContinue = () => {
    if (!valid) return;
    persist();
    router.push('/mybusiness/location');
  };

  const handleBack = () => router.push('/mybusiness');

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header: Back left, Help · Support right */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <span aria-hidden>←</span> Back
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/help" className="hover:text-gray-700">
              Help Center
            </Link>
            <span>·</span>
            <Link href="/contact" className="hover:text-gray-700">
              Support
            </Link>
          </div>
        </div>
      </header>

      {/* Progress stepper: 1 ✓ — 2 — 3 */}
      <div className="border-b border-gray-200 bg-white py-6">
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-4 sm:gap-4">
          {STEPS.map((s, i) => (
            <div key={s.step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                    s.done
                      ? 'border-[#2563EB] bg-[#2563EB] text-white'
                      : s.active
                      ? 'border-[#2563EB] bg-[#2563EB] text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {s.done && !s.active ? (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    s.step
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium uppercase tracking-wide ${
                    s.active ? 'text-[#2563EB]' : s.done ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 w-8 sm:mx-4 sm:w-12 ${
                    s.done ? 'bg-[#2563EB]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:p-8">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Business Details
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Please provide your official business information to continue with the
            setup.
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="legalName" className={labelClass}>
                Legal Business Name <span className="text-red-500">*</span>
              </label>
              <input
                id="legalName"
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, legalName: true }))}
                placeholder="e.g. Acme Corporation Ltd."
                className={inputClass}
                aria-required
              />
              {touched.legalName && !legalName.trim() && (
                <p className="mt-1 text-xs text-red-600">Required</p>
              )}
            </div>

            <div>
              <label htmlFor="tradingName" className={labelClass}>
                Trading Name (if different)
              </label>
              <input
                id="tradingName"
                type="text"
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                placeholder="e.g. Acme Tech Solutions"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank if same as legal name.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Contact Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="email@business.com"
                  className={inputClass}
                  autoComplete="email"
                  aria-required
                />
                {touched.email &&
                  email.trim() &&
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
                    <p className="mt-1 text-xs text-red-600">Enter a valid email</p>
                  )}
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>
                  Primary Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className={inputClass}
                  autoComplete="tel"
                  aria-required
                />
              </div>
            </div>

            <div>
              <label htmlFor="website" className={labelClass}>
                Website URL
              </label>
              <div className="flex overflow-hidden rounded-lg border border-gray-200 focus-within:border-[#2563EB] focus-within:ring-1 focus-within:ring-[#2563EB]">
                <span className="flex items-center bg-gray-100 px-3 text-sm text-gray-600">
                  https://
                </span>
                <input
                  id="website"
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="www.example.com"
                  className="min-w-0 flex-1 border-0 bg-white py-2.5 pr-3 text-sm outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Bottom of card: Back + Continue */}
          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <span aria-hidden>←</span> Back
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!valid}
              className="rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
            >
              Continue
            </button>
          </div>
        </div>
      </main>

      {/* Footer: pagination dots + SECURED BY SSL */}
      <footer className="border-t border-gray-200 bg-white py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 sm:px-6">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg
              className="h-3.5 w-3.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>SECURED BY SSL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
