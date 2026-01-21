'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FiSearch, FiUser, FiLogOut, FiSettings, FiHeart, FiPackage, FiMenu, FiX, FiMapPin, FiChevronDown, FiGrid } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';
import ImageWithFallback from './ImageWithFallback';
import CategoryNav from './CategoryNav';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);

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

  // Get current location from localStorage
  const [currentLocation, setCurrentLocation] = useState<{ name: string; city?: string; state?: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('selected_location');
      if (stored) {
        const locationData = JSON.parse(stored);
        setCurrentLocation({
          name: locationData.name || locationData.city || 'Select Location',
          city: locationData.city,
          state: locationData.state,
        });
        } else {
        // Default to first location or Mumbai
        const defaultLoc = locations.find((loc: any) => loc.name?.toLowerCase().includes('mumbai')) || locations[0];
        if (defaultLoc) {
          setCurrentLocation({
            name: defaultLoc.name || 'Mumbai, India',
            city: defaultLoc.city,
            state: defaultLoc.state,
          });
        } else {
          setCurrentLocation({ name: 'Mumbai, India' });
        }
      }
    } catch {
      setCurrentLocation({ name: 'Mumbai, India' });
    }
  }, [locations]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
      if (locationMenuRef.current && !locationMenuRef.current.contains(event.target as Node)) {
        setShowLocationMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
  };

  const handleLocationSelect = (location: any) => {
                    const locationData = {
                      slug: location.slug,
                      name: location.name,
                      city: location.city,
                      state: location.state,
                    };
                    localStorage.setItem('selected_location', JSON.stringify(locationData));
    setCurrentLocation({
      name: location.name || `${location.city || ''}, ${location.state || ''}`.trim() || 'Select Location',
                city: location.city,
                state: location.state,
    });
    setShowLocationMenu(false);
    // Refresh page to apply location filter
    window.location.reload();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/ads?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isActive = (href: string) => pathname === href;

  const displayLocation = currentLocation?.state 
    ? `${currentLocation.name?.split(',')[0] || currentLocation.city || 'Mumbai'}, ${currentLocation.state}`
    : currentLocation?.name || 'Mumbai, India';

  return (
    <>
      <header className="w-full bg-[#f5f5f5] z-50 sticky top-0">
        {/* Top Header Bar - with border and shadow */}
        <div className="border-b border-gray-200 shadow-sm bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            {/* Left Section: Logo + Category Nav */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 bg-black text-white text-base font-bold">
                  M
                </div>
                <span className="text-xl font-bold text-gray-900">Marketplace</span>
              </Link>
              
              {/* Category Navigation Bar - inline */}
              <div className="hidden lg:flex items-center flex-1 min-w-0">
                <CategoryNav />
              </div>
            </div>
              
            {/* Middle Section: Location + Search */}
            <div className="flex items-center gap-3 flex-1 max-w-2xl">
              {/* Location Selector */}
              <div className="relative flex-shrink-0" ref={locationMenuRef}>
                <button
                  onClick={() => setShowLocationMenu(!showLocationMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <FiMapPin className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-sm font-medium text-gray-800">{displayLocation}</span>
                  <FiChevronDown className={`w-3 h-3 text-gray-600 transition-transform ${showLocationMenu ? 'rotate-180' : ''}`} />
                  </button>
                  
                {/* Location Dropdown */}
                {showLocationMenu && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
                    {locations.slice(0, 20).map((location: any) => (
                      <button
                        key={location.id}
                        onClick={() => handleLocationSelect(location)}
                        className="w-full text-left px-4 py-2 hover:bg-green-50 transition-colors text-sm text-gray-700"
                      >
                        {location.name || `${location.city || ''}, ${location.state || ''}`.trim()}
                      </button>
                    ))}
                    </div>
                  )}
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="hidden md:flex flex-1">
                <div className="flex w-full rounded-full overflow-hidden">
                  <div className="relative flex-1 bg-white">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                  <input
                    type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Find Cars, Mobile Phones and more..."
                      className="w-full pl-11 pr-4 py-2.5 border-0 focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-400 text-sm rounded-l-full"
                  />
                </div>
                <button
                    type="submit"
                    className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center justify-center rounded-r-full"
                >
                  <FiSearch className="w-4 h-4" />
                </button>
              </div>
              </form>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Login / User Menu */}
              {isAuthenticated ? (
                <>
                  {/* SELL Button */}
              <Link
                href="/post-ad"
                    className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
                  >
                    <span className="text-base">+</span>
                <span>SELL</span>
              </Link>

                  {/* Profile Avatar */}
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center gap-2"
                    >
                      {user?.avatar ? (
                        <ImageWithFallback
                          src={user.avatar}
                          alt={user.name || 'User'}
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-semibold text-sm">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </button>

                    {/* Profile Dropdown */}
                    {showProfileMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                        <Link
                          href={`/profile/${user?.id}`}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                        >
                          <FiUser className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">My Profile</span>
                        </Link>
                        <Link
                          href="/my-ads"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                        >
                          <FiPackage className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">My Ads</span>
                        </Link>
                        <Link
                          href="/favorites"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                        >
                          <FiHeart className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">Favorites</span>
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                        >
                          <FiSettings className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">Settings</span>
                        </Link>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left"
                        >
                          <FiLogOut className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-600">Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium text-gray-900 hover:text-green-600 transition-colors"
                  >
                    Login
                  </button>
                          <Link
                    href="/post-ad"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
                          >
                    <span className="text-base">+</span>
                    <span>SELL</span>
                          </Link>
                </div>
                        )}

              {/* Mobile Menu Button */}
                        <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {showMobileMenu ? (
                  <FiX className="w-6 h-6 text-gray-700" />
                ) : (
                  <FiMenu className="w-6 h-6 text-gray-700" />
                )}
                        </button>
                      </div>
              </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-3">
            <form onSubmit={handleSearch} className="flex w-full">
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find Cars, Mobile Phones and more..."
                  className="w-full pl-12 pr-4 py-3 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 text-gray-800 placeholder-gray-500"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-r-lg transition-colors flex items-center gap-2 font-medium"
              >
                <FiSearch className="w-5 h-5" />
              </button>
            </form>
            </div>
          </div>
          
          {/* Category Navigation Bar - Mobile/Tablet view below */}
          <div className="lg:hidden border-t border-gray-100">
            <CategoryNav />
          </div>
        </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
          <div
            ref={mobileMenuRef}
            className="md:hidden border-t border-gray-200 bg-white"
          >
            <nav className="px-4 py-3 space-y-1">
            <Link
              href="/"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/') ? 'text-green-600 bg-green-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              Home
            </Link>
              <Link
                href="/ads"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/ads') ? 'text-green-600 bg-green-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Browse Ads
              </Link>
                <Link
                  href="/post-ad"
                onClick={() => setShowMobileMenu(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-green-600 bg-green-50"
                >
                + Post Your Ad
                </Link>
              {isAuthenticated && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                <Link
                    href={`/profile/${user?.id}`}
                    onClick={() => setShowMobileMenu(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    My Profile
                </Link>
                <Link
                    href="/my-ads"
                    onClick={() => setShowMobileMenu(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    My Ads
                </Link>
                <Link
                  href="/favorites"
                    onClick={() => setShowMobileMenu(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Favorites
                </Link>
                  <Link
                    href="/settings"
                    onClick={() => setShowMobileMenu(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Settings
                  </Link>
                <button
                  onClick={() => {
                      handleLogout();
                      setShowMobileMenu(false);
                  }}
                    className="w-full text-left block px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                >
                    Logout
                </button>
              </>
              )}
              {!isAuthenticated && (
              <>
                  <div className="border-t border-gray-200 my-2"></div>
                <button
                  onClick={() => {
                      setShowLoginModal(true);
                      setShowMobileMenu(false);
                  }}
                    className="w-full text-left block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Login
                </button>
              </>
            )}
            </nav>
          </div>
        )}
      </header>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToSignup={() => {
          setShowLoginModal(false);
          setShowSignupModal(true);
        }}
      />

      {/* Signup Modal */}
      <SignupModal 
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSwitchToLogin={() => {
          setShowSignupModal(false);
          setShowLoginModal(true);
        }}
      />
    </>
  );
}
