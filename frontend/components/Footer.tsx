'use client';

import Link from 'next/link';
import Image from 'next/image';

function FooterLogo() {
  return (
    <Image
      src="/logo.png"
      alt="SellIt Logo"
      width={100}
      height={33}
      className="h-8 w-auto object-contain"
    />
  );
}

const popularLocations = ['Kolkata', 'Mumbai', 'Chennai', 'Pune', 'Delhi', 'Bangalore'];
const trendingLocations = ['Bhubaneshwar', 'Hyderabad', 'Chandigarh', 'Nashik', 'Jaipur', 'Ahmedabad'];

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-10">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Popular Locations */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4 uppercase text-sm tracking-wider">Popular Locations</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              {popularLocations.map((location) => (
                <li key={location}>
                  <Link href={`/ads?location=${location.toLowerCase()}`} className="hover:underline">
                    {location}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trending Locations */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4 uppercase text-sm tracking-wider">Trending Locations</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              {trendingLocations.map((location) => (
                <li key={location}>
                  <Link href={`/ads?location=${location.toLowerCase()}`} className="hover:underline">
                    {location}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About Us */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4 uppercase text-sm tracking-wider">About Us</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><Link href="/about" className="hover:underline">Tech Group</Link></li>
              <li><Link href="/careers" className="hover:underline">Careers</Link></li>
              <li><Link href="/contact" className="hover:underline">Contact Us</Link></li>
              <li><Link href="/team" className="hover:underline">OLXPeople</Link></li>
            </ul>
          </div>

          {/* OLX Section */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4 uppercase text-sm tracking-wider">OLX</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><Link href="/help" className="hover:underline">Help</Link></li>
              <li><Link href="/sitemap" className="hover:underline">Sitemap</Link></li>
              <li><Link href="/legal" className="hover:underline">Legal & Privacy information</Link></li>
              <li><Link href="/blog" className="hover:underline">Blog</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200 dark:border-slate-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <FooterLogo />
          <p className="text-xs text-slate-500 dark:text-slate-500">© {new Date().getFullYear()} SellIt. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

