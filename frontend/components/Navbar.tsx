'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { FiMenu, FiX, FiUser, FiLogOut, FiHeart, FiPlus, FiSettings, FiShoppingBag, FiGrid, FiBriefcase, FiGlobe, FiBarChart2, FiMapPin } from 'react-icons/fi';
import { useTranslation } from '@/hooks/useTranslation';
import { useComparison } from '@/hooks/useComparison';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import NotificationIcon from './NotificationIcon';
import ImageWithFallback from './ImageWithFallback';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';
import CategoryChips from './CategoryChips';
import Translator from './Translator';

// Logo component
function LogoImage() {
  return (
    <Image
      src="/logo.png"
      alt="SellIt Logo"
      width={120}
      height={40}
      className="h-10 w-auto object-contain"
      priority
    />
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const { count: comparisonCount, mounted: comparisonMounted } = useComparison();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.get('/locations');
      return response.data.locations || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const locations = locationsData || [];
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLocationChange = (locationSlug: string) => {
    setSelectedLocation(locationSlug);
    if (locationSlug) {
      router.push(`/ads?location=${locationSlug}`);
    } else {
      router.push('/ads');
    }
  };

  // Handle hover for user menu
  const handleMouseEnter = () => {
    setUserMenuOpen(true);
  };

  const handleMouseLeave = () => {
    setUserMenuOpen(false);
  };

  return (
    <>
      <nav 
        className="sticky top-0 z-50 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm" 
        style={{ position: 'sticky', top: 0, zIndex: 50, overflow: 'visible' }}
        role="navigation"
      >
        {/* First Row: Logo + Post Ad Button */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8" style={{ overflow: 'visible', position: 'relative' }}>
          <div className="flex items-center justify-between gap-4 py-3 h-16" style={{ overflow: 'visible', position: 'relative' }}>
            {/* Logo - Left */}
            <Link href="/" className="flex items-center gap-2 cursor-pointer flex-shrink-0">
              <LogoImage />
            </Link>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3 flex-shrink-0" style={{ overflow: 'visible', position: 'relative', zIndex: 1000 }}>
              {/* Desktop Nav Links */}
              <div className="hidden md:flex items-center gap-3" style={{ overflow: 'visible' }}>
                {mounted && isAuthenticated ? (
                  <>
                    {/* Profile Dropdown - First (Top) */}
                    <div 
                      className="relative" 
                      ref={userMenuRef}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                      style={{ zIndex: 1000 }}
                    >
                      <button
                        className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
                      >
                        {user?.avatar ? (
                          <ImageWithFallback
                            src={user.avatar}
                            alt={user.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <FiUser className="w-6 h-6 text-blue-600" />
                        )}
                        <span className="hidden lg:inline">{user?.name}</span>
                      </button>

                      {userMenuOpen && (
                        <div 
                          className="absolute right-0 w-48 bg-white border border-gray-200 shadow-xl py-1 rounded-lg"
                          style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            right: 0,
                            zIndex: 99999,
                            marginTop: 0,
                            paddingTop: 0,
                            marginBottom: 0,
                            display: 'block',
                            visibility: 'visible',
                            opacity: 1
                          }}
                        >
                          <Link
                            href="/profile"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <FiUser className="text-blue-600" /> {t('nav.profile')}
                          </Link>
                          <Link
                            href="/my-ads"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <FiGrid className="text-blue-600" /> {t('nav.myAds')}
                          </Link>
                          <Link
                            href="/favorites"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <FiHeart className="text-blue-600" /> {t('nav.favorites')}
                          </Link>
                          <Link
                            href="/orders"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <FiShoppingBag className="text-blue-600" /> {t('nav.orders')}
                          </Link>
                          <Link
                            href="/business-package"
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <FiBriefcase className="text-blue-600" /> {t('nav.businessPackage')}
                          </Link>
                          {user?.role === 'ADMIN' && (
                            <Link
                              href="/admin"
                              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <FiSettings className="text-blue-600" /> {t('nav.admin')}
                            </Link>
                          )}
                          <button
                            onClick={() => {
                              logout();
                            }}
                            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <FiLogOut className="text-blue-600" /> {t('nav.logout')}
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Notification Icon */}
                    <div className="relative">
                      <NotificationIcon />
                    </div>
                    {/* Compare Link */}
                    {comparisonMounted && comparisonCount > 0 && (
                      <Link
                        href="/compare"
                        className="relative text-gray-700 hover:text-blue-600 px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                        title="Compare Products"
                      >
                        <FiBarChart2 className="w-6 h-6 text-blue-600" />
                        <span className="hidden sm:inline">Compare</span>
                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full">
                          {comparisonCount}
                        </span>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setLoginModalOpen(true)}
                      className="text-sm font-bold text-slate-900 dark:text-white hover:underline"
                    >
                      Login
                    </button>
                  </>
                )}
              </div>

              {/* Post Ad Button - Always visible on right */}
              <Link
                href="/post-ad"
                className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold py-2 px-4 hover:bg-blue-700 transition-colors rounded-lg"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span className="hidden sm:inline">Post Ad</span>
              </Link>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden text-gray-700 p-2 hover:bg-gray-100 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <FiX className="w-6 h-6 text-teal-600" /> : <FiMenu className="w-6 h-6 text-teal-600" />}
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Categories */}
        <div className="border-t border-gray-200">
          <CategoryChips />
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-gray-200 bg-white dark:bg-slate-800">
            {/* Mobile Search */}
            <div className="px-4 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-300 bg-white rounded-lg">
                  <FiMapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <select
                    value={selectedLocation}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    className="text-sm text-gray-700 bg-transparent border-none focus:outline-none cursor-pointer flex-1"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <option value="">All Locations</option>
                    {locations.map((loc: any) => (
                      <option key={loc.id} value={loc.slug}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    router.push('/ads');
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors rounded-lg"
                >
                  <FiSearch className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Translator - Mobile */}
            <div className="px-4 py-2 border-b border-gray-200">
              <Translator />
            </div>

            {/* Home Link - Mobile */}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 transition-colors"
            >
              Home
            </Link>
            
            {!mounted ? (
              <>
                <button
                  onClick={() => {
                    setLoginModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setSignupModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 bg-blue-600 text-white transition-colors"
                >
                  Sign Up
                </button>
              </>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/post-ad"
                  className="block px-4 py-2 bg-blue-600 text-white font-semibold text-center rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiPlus className="inline w-4 h-4 mr-1" /> + Post Ad
                </Link>
                <div className="px-4 py-2">
                  <NotificationIcon />
                </div>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.profile')}
                </Link>
                <Link
                  href="/favorites"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.favorites')}
                </Link>
                {comparisonMounted && comparisonCount > 0 && (
                  <Link
                    href="/compare"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 relative"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FiBarChart2 className="text-blue-600" />
                    <span>Compare</span>
                    <span className="ml-auto bg-blue-600 text-white text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full">
                      {comparisonCount}
                    </span>
                  </Link>
                )}
                {user?.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.admin')}
                  </Link>
                )}
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setLoginModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => {
                    setSignupModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 bg-blue-600 text-white transition-colors"
                >
                  {t('nav.signUp')}
                </button>
                <Link
                  href="/post-ad"
                  className="block px-4 py-2 bg-blue-600 text-white font-semibold text-center mt-2 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiPlus className="inline w-4 h-4 mr-1" /> Post Ad
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Login Modal */}
      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)}
        onSwitchToSignup={() => setSignupModalOpen(true)}
      />

      {/* Signup Modal */}
      <SignupModal 
        isOpen={signupModalOpen} 
        onClose={() => setSignupModalOpen(false)}
        onSwitchToLogin={() => setLoginModalOpen(true)}
      />
    </>
  );
}
