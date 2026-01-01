'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { FiMenu, FiX, FiUser, FiLogOut, FiHeart, FiPlus, FiSettings, FiShoppingBag, FiMessageCircle, FiGrid, FiBriefcase, FiGlobe, FiBarChart2, FiMapPin, FiSearch } from 'react-icons/fi';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useTranslation } from '@/hooks/useTranslation';
import { useComparison } from '@/hooks/useComparison';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import NotificationIcon from './NotificationIcon';
import ImageWithFallback from './ImageWithFallback';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';
import dynamic from 'next/dynamic';

// Dynamically import Translator with SSR disabled to prevent hydration errors
const Translator = dynamic(
  () => {
    return import('./Translator').catch((error) => {
      console.error('Failed to load Translator component:', error);
      // Return a no-op component as fallback
      return { default: () => null };
    });
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 text-gray-700 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          title="Translate Page"
          disabled
        >
          <FiGlobe className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Translate</span>
        </button>
      </div>
    )
  }
);

// Logo component - using logo image
function LogoImage() {
  return (
    <Image
      src="/logo.png"
      alt="SellIt Logo"
      width={120}
      height={40}
      className="h-8 w-auto object-contain"
      priority
    />
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useChatNotifications();
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
  
  // Prevent hydration mismatch by only rendering auth-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle location change
  const handleLocationChange = (locationSlug: string) => {
    setSelectedLocation(locationSlug);
    if (locationSlug) {
      router.push(`/ads?location=${locationSlug}`);
    } else {
      router.push('/ads');
    }
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <>
      <nav 
        className="sticky top-0 z-50 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm" 
        style={{ position: 'sticky', top: 0, zIndex: 50 }}
        role="navigation"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 cursor-pointer flex-shrink-0">
            <LogoImage />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              <span className="hidden sm:inline">SellIt</span>
              <span className="sm:hidden">SellIt</span>
            </h1>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex flex-1 items-center justify-end gap-4 ml-6">
            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <Link href="/my-ads" className="text-sm font-semibold text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary transition-colors">
                  My Ads
                </Link>
              )}
              {isAuthenticated && (
                <Link href="/chat" className="flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary transition-colors relative">
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                  <span>Chat</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}
            </div>
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-2"></div>
            <div className="flex items-center gap-3">
              {mounted && isAuthenticated ? (
                <>
                  <div className="relative">
                    <NotificationIcon />
                  </div>
                  <Link
                    href="/post-ad"
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-primary text-white text-sm font-bold py-2.5 px-5 rounded-full shadow-md hover:shadow-lg hover:opacity-90 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Post Ad</span>
                  </Link>
                {comparisonMounted && comparisonCount > 0 && (
                  <Link
                    href="/compare"
                    className="relative text-gray-700 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    title="Compare Products"
                  >
                    <FiBarChart2 className="w-6 h-6 text-blue-600" />
                    <span className="hidden sm:inline">Compare</span>
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {comparisonCount}
                    </span>
                  </Link>
                )}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
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
                    <span>{user?.name}</span>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FiUser className="text-blue-600" /> {t('nav.profile')}
                      </Link>
                      <Link
                        href="/my-ads"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FiGrid className="text-blue-600" /> {t('nav.myAds')}
                      </Link>
                      <Link
                        href="/favorites"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FiHeart className="text-blue-600" /> {t('nav.favorites')}
                      </Link>
                      <Link
                        href="/orders"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FiShoppingBag className="text-blue-600" /> {t('nav.orders')}
                      </Link>
                      <Link
                        href="/business-package"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FiBriefcase className="text-blue-600" /> {t('nav.businessPackage')}
                      </Link>
                      <Link
                        href="/chat"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FiMessageCircle className="text-blue-600" /> {t('nav.messages')}
                      </Link>
                      {user?.role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <FiSettings className="text-blue-600" /> {t('nav.admin')}
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FiLogOut className="text-blue-600" /> {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
              ) : (
                <>
                  <button 
                    onClick={() => setLoginModalOpen(true)}
                    className="text-sm font-bold text-slate-900 dark:text-white hover:underline"
                  >
                    Login
                  </button>
                  <Link
                    href="/post-ad"
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-primary text-white text-sm font-bold py-2.5 px-5 rounded-full shadow-md hover:shadow-lg hover:opacity-90 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Post Ad</span>
                  </Link>
                </>
              )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <FiX className="w-6 h-6 text-teal-600" /> : <FiMenu className="w-6 h-6 text-teal-600" />}
          </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-gray-200 bg-white dark:bg-slate-800">
              {/* Mobile Search - Show on mobile */}
            <div className="px-4 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
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
                  className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
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
              // Show default (not authenticated) state during SSR and initial render
              // Use English text during SSR to prevent hydration mismatch
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
                  className="block w-full text-left px-4 py-2 bg-primary-600 text-white rounded-lg transition-colors"
                >
                  Sign Up
                </button>
              </>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/post-ad"
                  className="block px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiPlus className="inline w-4 h-4 mr-1" /> + Post Ad
                </Link>
                <div className="px-4 py-2 flex items-center">
                  <span className="mr-2 text-gray-700">{t('nav.messages')}</span>
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
                  href="/my-ads"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.myAds')}
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
                    <span className="ml-auto bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {comparisonCount}
                    </span>
                  </Link>
                )}
                <Link
                  href="/chat"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 relative"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    {t('nav.messages')}
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </span>
                </Link>
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
                  className="block w-full text-left px-4 py-2 bg-primary-600 text-white rounded-lg transition-colors"
                >
                  {t('nav.signUp')}
                </button>
                <Link
                  href="/post-ad"
                  className="block px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold text-center mt-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiPlus className="inline w-4 h-4 mr-1" /> Post Ad
                </Link>
              </>
            )}
            </div>
          )}
        </div>
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

