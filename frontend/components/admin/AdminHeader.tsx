'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FiSearch, FiBell, FiSettings, FiLogOut, FiUser, FiHome, FiClock } from 'react-icons/fi';
import Link from 'next/link';
import ImageWithFallback from '../ImageWithFallback';

export default function AdminHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  
  // Get current page title
  const getPageTitle = () => {
    if (pathname === '/admin/moderation') return 'Content Moderation';
    if (pathname === '/admin/orders') return 'Orders Management';
    if (pathname === '/admin/search-alerts') return 'Search Alerts';
    
    const titles: { [key: string]: string } = {
      'dashboard': 'Dashboard Overview',
      'ads': 'Manage Ads',
      'users': 'User Management',
      'banners': 'Banner Management',
      'categories': 'Categories',
      'premium': 'Premium Ads',
      'offers': 'Special Offers',
      'interstitial': 'Interstitial Ads',
      'business-packages': 'Business Packages',
    };
    return titles[currentTab] || 'Dashboard';
  };
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-16 px-6 lg:pl-72">
        {/* Left - Page Title & Time */}
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{getPageTitle()}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <FiClock className="w-3 h-3" />
                <span>{currentTime.toLocaleString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Stats */}
          <div className="hidden xl:flex items-center gap-4 mr-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">Live</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
              <span className="text-xs text-gray-500">Today:</span>
              <span className="text-xs font-bold text-blue-700">24 new ads</span>
            </div>
          </div>

          {/* Back to Site */}
          <Link
            href="/"
            className="hidden md:flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <FiHome className="w-4 h-4" />
            <span>Back to Site</span>
          </Link>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <FiBell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Notifications</h3>
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">3 New</span>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-l-4 border-blue-500">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">📝</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">New ad pending approval</p>
                        <p className="text-xs text-gray-600 mt-1">iPhone 13 Pro Max listing requires review</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">2 minutes ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 hover:bg-yellow-50 cursor-pointer transition-colors border-l-4 border-yellow-500">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">⚠️</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">User reported content</p>
                        <p className="text-xs text-gray-600 mt-1">Suspicious listing flagged by user</p>
                        <p className="text-xs text-yellow-600 font-medium mt-1">1 hour ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 hover:bg-green-50 cursor-pointer transition-colors border-l-4 border-green-500">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">👤</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">New user registered</p>
                        <p className="text-xs text-gray-600 mt-1">Welcome John Doe to the platform</p>
                        <p className="text-xs text-green-600 font-medium mt-1">3 hours ago</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                  <button className="text-sm text-gray-600 hover:text-gray-800 font-medium">
                    Mark all as read
                  </button>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
                    View all →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
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
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                {/* User Info */}
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    {user?.avatar ? (
                      <ImageWithFallback
                        src={user.avatar}
                        alt={user.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-600">{user?.email}</p>
                      <span className="inline-block mt-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        Admin Access
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="py-2">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FiUser className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">My Profile</p>
                      <p className="text-xs text-gray-500">View & edit profile</p>
                    </div>
                  </Link>
                  <Link
                    href="/admin?tab=settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                      <FiSettings className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Settings</p>
                      <p className="text-xs text-gray-500">Admin preferences</p>
                    </div>
                  </Link>
                </div>

                {/* Session Info */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 border-b">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Session Status</span>
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-gray-600">Last Login</span>
                    <span className="text-gray-700 font-medium">Today, 09:30 AM</span>
                  </div>
                </div>

                {/* Logout */}
                <div className="py-2">
                  <button
                    onClick={() => {
                      logout();
                      setProfileMenuOpen(false);
                      router.push('/');
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                      <FiLogOut className="w-4 h-4 text-red-600" />
                    </div>
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

