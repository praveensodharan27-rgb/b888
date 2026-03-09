'use client';

import Link from 'next/link';
import { FiFacebook, FiTwitter, FiLinkedin } from 'react-icons/fi';

export default function FooterOLX() {
  const popularLocations = ['Kolkata', 'Mumbai', 'Chennai', 'Pune'];
  const trendingLocations = ['Bhubaneshwar', 'Hyderabad', 'Chandigarh', 'Nashik'];

  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-8">
          {/* Popular Locations */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase mb-4">Popular Locations</h3>
            <ul className="space-y-2">
              {popularLocations.map((location) => (
                <li key={location}>
                  <Link
                    href={`/ads?location=${location.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {location}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trending Locations */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase mb-4">Trending Locations</h3>
            <ul className="space-y-2">
              {trendingLocations.map((location) => (
                <li key={location}>
                  <Link
                    href={`/ads?location=${location.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {location}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About Us + CTA */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase mb-4">About Us</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>

            <div className="mt-4">
              <a
                href="/mybusiness"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                List your business
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left - Brand and Links */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                  S
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <Link href="/help" className="hover:text-blue-600 transition-colors">
                  Help
                </Link>
                <Link href="/sitemap" className="hover:text-blue-600 transition-colors">
                  Sitemap
                </Link>
                <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                  Legal & Privacy information
                </Link>
                <Link href="/blog" className="hover:text-blue-600 transition-colors">
                  Blog
                </Link>
              </div>
            </div>

            {/* Right - Social Links */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-gray-900 uppercase">Follow Us</span>
              <div className="flex gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors"
                  aria-label="Facebook"
                >
                  <FiFacebook className="w-5 h-5" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors"
                  aria-label="LinkedIn"
                >
                  <FiLinkedin className="w-5 h-5" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors"
                  aria-label="Twitter"
                >
                  <FiTwitter className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <p className="text-sm text-gray-600">
              All rights reserved © 2006-2024
            </p>
            <div className="flex gap-4 text-sm text-gray-600">
              <Link href="/help" className="hover:text-blue-600 transition-colors">
                Help - Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

