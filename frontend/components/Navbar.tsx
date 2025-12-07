'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { FiMenu, FiX, FiUser, FiLogOut, FiHeart, FiPlus, FiSettings, FiShoppingBag, FiMessageCircle, FiGrid, FiBriefcase, FiGlobe, FiBarChart2, FiMapPin } from 'react-icons/fi';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useTranslation } from '@/hooks/useTranslation';
import { useComparison } from '@/hooks/useComparison';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import NotificationIcon from './NotificationIcon';
import ImageWithFallback from './ImageWithFallback';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';
import dynamic from 'next/dynamic';

// Dynamically import Translator with SSR disabled to prevent hydration errors
const Translator = dynamic(() => import('./Translator'), {
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
});

// Logo component with fallback - only renders if logo exists
function LogoImage() {
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
  
  if (!showLogo) {
    return null; // Don't render Image component if logo doesn't exist
  }
  
  return (
    <Link href="/" className="relative flex-shrink-0 hover:opacity-80 transition-opacity">
      <Image
        src="/logo.png"
        alt="SellIt Logo"
        width={120}
        height={40}
        className="object-contain h-10 w-auto"
        priority
      />
    </Link>
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useChatNotifications();
  const { t } = useTranslation();
  const { count: comparisonCount, mounted: comparisonMounted } = useComparison();
  const router = useRouter();
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
    <div className="bg-white shadow-md sticky top-0 z-50" role="navigation">
      <div className="container mx-auto px-4">
        {/* Top Bar - Logo and User Actions */}
        <div className="flex items-center justify-between h-16">
          {/* Left Side - Logo and Location */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity group">
              <LogoImage />
              <span className="text-2xl font-bold text-primary-600 group-hover:text-primary-700 transition-colors">
                SellIt
              </span>
            </Link>

            {/* Location Selector */}
            <div className="hidden lg:block relative">
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:border-primary-500 transition-colors bg-white">
                <FiMapPin className="w-4 h-4 text-primary-600 flex-shrink-0" />
                <select
                  value={selectedLocation}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="text-sm text-gray-700 bg-transparent border-none focus:outline-none cursor-pointer pr-2 max-w-[150px]"
                >
                  <option value="">All Locations</option>
                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.slug}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* User Actions - Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Translator */}
            <Translator />
            
            {!mounted ? (
              // Show default (not authenticated) state during SSR and initial render
              // Use English text during SSR to prevent hydration mismatch
              <>
                <button 
                  onClick={() => setLoginModalOpen(true)}
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => setSignupModalOpen(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Sign Up
                </button>
              </>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/ads"
                  className="text-gray-700 hover:text-primary-600 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <FiGrid className="text-blue-600" /> {t('nav.browse')}
                </Link>
                <Link
                  href="/post-ad"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                  <FiPlus className="text-white" /> {t('nav.post')}
                </Link>
                <NotificationIcon />
                <Link
                  href="/chat"
                  className="relative text-gray-700 hover:text-primary-600"
                >
                  <FiMessageCircle className="w-6 h-6 text-blue-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
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
                <Link
                  href="/ads"
                  className="text-gray-700 hover:text-primary-600 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <FiGrid className="text-blue-600" /> {t('nav.browse')}
                </Link>
                <button 
                  onClick={() => setLoginModalOpen(true)}
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => setSignupModalOpen(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {t('nav.signUp')}
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FiX className="w-6 h-6 text-blue-600" /> : <FiMenu className="w-6 h-6 text-blue-600" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
                    {/* Translator - Mobile */}
                    <div className="px-4 py-2 border-b border-gray-200">
                      <Translator />
                    </div>
            
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
                  href="/ads"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiGrid className="text-blue-600" /> {t('nav.browse')}
                </Link>
                <Link
                  href="/post-ad"
                  className="block px-4 py-2 bg-primary-600 text-white rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.post')}
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
                <Link
                  href="/ads"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiGrid className="text-blue-600" /> {t('nav.browse')}
                </Link>
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
              </>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
}

