'use client';

import Link from 'next/link';
import Image from 'next/image';

// Logo component (same as Navbar)
function LogoImage() {
  return (
    <Image
      src="/logo.png"
      alt="SellIt Logo"
      width={180}
      height={50}
      className="h-12 md:h-14 w-auto object-contain"
      priority
    />
  );
}

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-gray-200 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 items-start gap-x-12 gap-y-10 md:grid-cols-4">
          {/* Brand */}
          <div className="w-full min-w-0">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <LogoImage />
            </Link>
            <p className="mt-4 text-sm leading-6 text-gray-600">
              Buy smart. Sell fast. Right near you.
              <br />
              Find everything you need in your city.
              <br />
              Every ad you post helps plant a tree 🌱
            </p>
            <div className="mt-4 flex items-center gap-4">
              <Link href="/post-ad" className="flex items-center gap-1 bg-blue-600 text-white text-sm font-semibold py-2 px-4 hover:bg-blue-700 transition-colors rounded">
                <span>+ Post Ad</span>
              </Link>
            </div>
          </div>

          {/* QUICK LINKS */}
          <div className="w-full min-w-0">
            <h4 className="flex h-9 items-center text-sm font-bold uppercase tracking-wide text-gray-900">QUICK LINKS</h4>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-600">
              <li><Link href="/ads" className="hover:text-blue-600 transition-colors">Browse Ads</Link></li>
              <li><Link href="/post-ad" className="hover:text-blue-600 transition-colors">Post an Ad</Link></li>
              <li><Link href="/my-ads" className="hover:text-blue-600 transition-colors">My Ads</Link></li>
              <li><Link href="/favorites" className="hover:text-blue-600 transition-colors">Favorites</Link></li>
              <li><Link href="/chat" className="hover:text-blue-600 transition-colors">Messages</Link></li>
            </ul>
          </div>

          {/* COMPANY */}
          <div className="w-full min-w-0">
            <h4 className="flex h-9 items-center text-sm font-bold uppercase tracking-wide text-gray-900">COMPANY</h4>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-600">
              <li><Link href="/about" className="hover:text-blue-600 transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link></li>
              <li><Link href="/help" className="hover:text-blue-600 transition-colors">Help & Support</Link></li>
              <li><Link href="/careers" className="hover:text-blue-600 transition-colors">Careers</Link></li>
            </ul>
          </div>

          {/* LEGAL */}
          <div className="w-full min-w-0">
            <h4 className="flex h-9 items-center text-sm font-bold uppercase tracking-wide text-gray-900">LEGAL</h4>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-600">
              <li><Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link></li>
              <li><Link href="/safety" className="hover:text-blue-600 transition-colors">Safety Tips</Link></li>
              <li><Link href="/faq" className="hover:text-blue-600 transition-colors">FAQ</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">© {new Date().getFullYear()} SellIt. All rights reserved.</p>
            <div className="flex items-center gap-6 text-xs text-gray-500">
              <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
              <Link href="/sitemap" className="hover:text-blue-600 transition-colors">Sitemap</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

