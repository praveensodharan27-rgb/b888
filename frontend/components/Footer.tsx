'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 items-start gap-x-12 gap-y-10 md:grid-cols-4">
          {/* Brand */}
          <div className="w-full min-w-0">
            <div className="flex h-9 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 2 4.5 10h3.2L6 12.6h3.2L7.8 16H11v6h2v-6h3.2l-1.4-3.4H18l-1.7-2.6h3.2L12 2Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="text-base font-semibold text-gray-900">EcoPlatform</div>
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-600">
              Together, we&apos;re contributing towards 3+ million trees by 2030 for a greener future.
            </p>
          </div>

          {/* COMPANY */}
          <div className="w-full min-w-0">
            <h4 className="flex h-9 items-center text-sm font-bold uppercase tracking-wide text-gray-900">COMPANY</h4>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-600">
              <li><Link href="/about" className="hover:text-emerald-700">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-emerald-700">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-emerald-700">Contact</Link></li>
              <li><Link href="/impact" className="hover:text-emerald-700">Our Impact</Link></li>
            </ul>
          </div>

          {/* RESOURCES */}
          <div className="w-full min-w-0">
            <h4 className="flex h-9 items-center text-sm font-bold uppercase tracking-wide text-gray-900">RESOURCES</h4>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-600">
              <li><Link href="/blog" className="hover:text-emerald-700">Blog</Link></li>
              <li><Link href="/sustainability-report" className="hover:text-emerald-700">Sustainability Report</Link></li>
              <li><Link href="/help" className="hover:text-emerald-700">Support Center</Link></li>
              <li><Link href="/partner-program" className="hover:text-emerald-700">Partner Program</Link></li>
            </ul>
          </div>

          {/* LEGAL */}
          <div className="w-full min-w-0">
            <h4 className="flex h-9 items-center text-sm font-bold uppercase tracking-wide text-gray-900">LEGAL</h4>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-600">
              <li><Link href="/privacy" className="hover:text-emerald-700">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-emerald-700">Terms of Service</Link></li>
              <li><Link href="/cookies" className="hover:text-emerald-700">Cookies Settings</Link></li>
              <li><Link href="/security" className="hover:text-emerald-700">Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-6">
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} ognox Startup. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

