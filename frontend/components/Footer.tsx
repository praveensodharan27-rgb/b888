'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="mt-8 sm:mt-12 lg:mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-start gap-8 sm:gap-10 lg:gap-12">
          {/* Brand + CTA */}
          <div className="w-full min-w-0">
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png?v=7"
                alt="Sell Box"
                width={160}
                height={45}
                className="h-10 w-auto object-contain"
              />
            </Link>

            <p className="mt-4 text-sm leading-6 text-gray-600">
              Buy and sell anything in your local area. Post free classified ads.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/mybusiness"
                className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 transition-colors"
              >
                List your business
              </Link>
              <Link
                href="/business-package"
                className="inline-flex items-center justify-center rounded-md border border-primary-600 bg-white px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 transition-colors"
              >
                Business Package
              </Link>
            </div>
          </div>

          {/* COMPANY */}
          <div className="w-full min-w-0">
            <h4 className="flex h-9 items-center text-sm font-bold uppercase tracking-wide text-gray-900">COMPANY</h4>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-600">
              <li><Link href="/about" className="hover:text-primary-700 transition-colors">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-primary-700 transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-primary-700 transition-colors">Contact</Link></li>
              <li><Link href="/impact" className="hover:text-primary-700 transition-colors">Our Impact</Link></li>
            </ul>
          </div>

          {/* RESOURCES */}
          <div className="w-full min-w-0">
            <h4 className="flex h-9 items-center text-sm font-bold uppercase tracking-wide text-gray-900">RESOURCES</h4>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-600">
              <li><Link href="/blog" className="hover:text-primary-700 transition-colors">Blog</Link></li>
              <li><Link href="/sustainability-report" className="hover:text-primary-700 transition-colors break-words">Sustainability Report</Link></li>
              <li><Link href="/help" className="hover:text-primary-700 transition-colors">Support Center</Link></li>
              <li><Link href="/partner-program" className="hover:text-primary-700 transition-colors">Partner Program</Link></li>
            </ul>
          </div>

          {/* LEGAL */}
          <div className="w-full min-w-0">
            <h4 className="flex h-9 items-center text-sm font-bold uppercase tracking-wide text-gray-900">LEGAL</h4>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-600">
              <li><Link href="/privacy" className="hover:text-primary-700 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary-700 transition-colors">Terms of Service</Link></li>
              <li><Link href="/cookies" className="hover:text-primary-700 transition-colors">Cookies Settings</Link></li>
              <li><Link href="/security" className="hover:text-primary-700 transition-colors">Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 lg:mt-12 border-t border-gray-200 pt-6 sm:pt-8">
          <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
            © {new Date().getFullYear()} Sell Box. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

