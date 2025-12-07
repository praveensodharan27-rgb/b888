'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

function FooterLogo() {
  const [showLogo, setShowLogo] = useState(false);
  
  // Check if logo exists on mount (client-side only)
  useEffect(() => {
    // Only check on client side
    if (typeof window !== 'undefined') {
      fetch('/logo.png', { method: 'HEAD' })
        .then((response) => {
          if (response.ok) {
            setShowLogo(true);
          } else {
            setShowLogo(false);
          }
        })
        .catch(() => {
          // Logo doesn't exist, don't show it - silently fail
          setShowLogo(false);
        });
    }
  }, []);
  
  return (
    <Link href="/" className="flex items-center gap-2 mb-4">
      {showLogo && (
        <div className="relative w-8 h-8">
          <Image
            src="/logo.png"
            alt="SellIt Logo"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
      )}
      <h3 className="text-xl font-bold">SellIt</h3>
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <FooterLogo />
            <p className="text-gray-400">
              Buy and sell anything in your local area. Post free classified ads.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/ads" className="hover:text-white">
                  Browse Ads
                </Link>
              </li>
              <li>
                <Link href="/post-ad" className="hover:text-white">
                  Post Ad
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-white">
                  Categories
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/help" className="hover:text-white">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              {/* Add social media links */}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} SellIt. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

