'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiMapPin, FiBriefcase, FiGlobe, FiCheckCircle, FiPackage, FiUsers, FiTrendingUp, FiFileText, FiEdit3, FiUserPlus, FiX, FiCalendar, FiFolder, FiVolume2, FiCamera, FiPlus, FiShoppingBag, FiSettings, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import FollowButton from '@/components/FollowButton';
import FollowersModal from '@/components/FollowersModal';
import { userService } from '@/src/application/services/UserService';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

export default function ProfilePage() {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews'>('overview');
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const [editingLocation, setEditingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [savingLocation, setSavingLocation] = useState(false);

  // Fetch suggested users using service
  const { data: suggestedUsers = [] } = useQuery({
    queryKey: ['suggestedUsers', user?.id],
    queryFn: () => userService.getSuggestedUsers(3),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch full profile data with business package and quota info
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const response = await api.get('/user/profile');
      return response.data.user;
    },
    enabled: !!user,
    staleTime: 5 * 1000, // 5 seconds - faster updates
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Refetch when component mounts
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

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

  // Get user's saved location
  useEffect(() => {
    if (user && user.locationId && !selectedLocation) {
      setSelectedLocation(user.locationId);
    }
  }, [user, selectedLocation]);

  const handleSaveLocation = async () => {
    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }

    setSavingLocation(true);
    try {
      await userService.updateProfile({ locationId: selectedLocation });
      toast.success('Location saved successfully!');
      setEditingLocation(false);
      // Refresh user data to get updated location
      window.location.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save location');
    } finally {
      setSavingLocation(false);
    }
  };

  // NOW we can have conditional returns after all hooks are called
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  // Calculate total ads
  const totalAds = profileData 
    ? (profileData.businessPackage?.totalRemaining || 
       (profileData.businessPackage?.businessAdsRemaining || 0) + (profileData.freeAdsRemaining || 0) || 0)
    : 0;

  // Calculate free ads percentage
  const freeAdsUsed = profileData?.freeAdsUsedThisMonth || 0;
  const freeAdsLimit = profileData?.freeAdsLimit || 5;
  const freeAdsPercentage = freeAdsLimit > 0 ? Math.round((freeAdsUsed / freeAdsLimit) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex flex-col items-center text-center">
              {/* Profile Image with Status Badge */}
                <div className="relative mb-4">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={120}
                      height={120}
                      priority
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  {/* ACTIVE Badge */}
                  <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    ACTIVE
                  </div>

                  {/* Verification Badge */}
                  {user.isVerified && (
                    <div className="absolute top-0 right-0 w-8 h-8 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                      <FiCheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* User Name */}
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h1>
                <p className="text-gray-600 text-sm mb-4">{user.email}</p>

                {/* Verified Seller & Member Since */}
                <div className="flex flex-col gap-2 mb-4">
                      {user.isVerified && (
                    <div className="flex items-center justify-center gap-2 text-blue-600">
                      <FiCheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Verified Seller</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <FiCalendar className="w-4 h-4" />
                    <span className="text-sm">Member since {user.createdAt ? new Date(user.createdAt).getFullYear() : '2024'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Free Ads Usage */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Free Ads Usage</h3>
              <div className="mb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-2xl font-bold text-gray-900">{freeAdsPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${freeAdsPercentage}%` }}
                  />
          </div>
        </div>
              <p className="text-sm text-gray-600 mt-2">
                {freeAdsUsed} / {freeAdsLimit} ads used this month
              </p>
          </div>

            {/* Business Packages */}
            {profileData?.businessPackage && (profileData.businessPackage.allPackages?.length > 0 || profileData.businessPackage.activePackages?.length > 0) && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FiFolder className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Business Packages</h3>
                    </div>
                <div className="space-y-4">
                  {(profileData.businessPackage.allPackages || profileData.businessPackage.activePackages).slice(0, 2).map((pkg: any, index: number) => {
                                    const remaining = pkg.adsRemaining || 0;
                                    const total = pkg.totalAds || pkg.totalAdsAllowed || 0;
                                    const isExpired = pkg.isExpired || pkg.status === 'EXPIRED';
                                    const packageName = pkg.packageName || pkg.packageType?.replace('_', ' ') || 'Package';
                    const expiresAt = pkg.expiresAt ? new Date(pkg.expiresAt) : null;
                                    
                                    return (
                      <div key={pkg.id || pkg.packageId} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{packageName.toUpperCase()}</h4>
                            {pkg.packageType?.includes('PREMIUM') || packageName.includes('Premium') ? (
                              <p className="text-sm text-gray-600 mt-1">{total} Premium Ad Credits</p>
                            ) : (
                              <p className="text-sm text-gray-600 mt-1">Auto-Refresh Boost</p>
                            )}
                            {remaining > 0 && (
                              <p className="text-sm text-blue-600 font-medium mt-1">{remaining} remaining</p>
                            )}
                            {pkg.packageType?.includes('VISIBILITY') || packageName.includes('Visibility') && (
                              <p className="text-sm text-gray-600 mt-1">Active on {pkg.activeItemsCount || 0} items</p>
                                            )}
                                          </div>
                                        </div>
                        {expiresAt && (
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-500">
                              Ends {expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <Link href="/settings" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                              Manage
                            </Link>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                      </div>
                    </div>
                  )}

            {/* Total Capacity */}
            <div className="bg-blue-600 rounded-2xl shadow-sm p-6 text-white relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <FiVolume2 className="w-8 h-8 text-white opacity-30" />
              </div>
              <div className="relative z-10">
                <div className="text-4xl font-bold mb-2">{totalAds} Ads</div>
                <p className="text-blue-50 text-sm">
                  Combine free and premium credits to reach more buyers.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Welcome & Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Welcome Section */}
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to my profile</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  {user.bio || `I'm an active buyer and seller since early ${user.createdAt ? new Date(user.createdAt).getFullYear() : '2024'}, specializing in vintage electronics and high-quality home furniture. I pride myself on quick response times and smooth experiences.`}
                </p>
                <p>
                  I'm open to questions, reasonable offers, ship items within 24-48 hours, and only conduct verified transactions for safety.
                </p>
              </div>
        </div>

            {/* People You May Know */}
        {suggestedUsers.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">People You May Know</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestedUsers.map((suggestedUser) => (
                <div key={suggestedUser.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                      <div className="flex flex-col items-center text-center mb-4">
                    {suggestedUser.avatar ? (
                      <img
                        src={suggestedUser.avatar}
                        alt={suggestedUser.name}
                        className="w-16 h-16 rounded-full object-cover mb-3"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold mb-3">
                        {suggestedUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                        <h3 className="font-semibold text-gray-900 mb-1">
                      {suggestedUser.name}
                    </h3>
                    {suggestedUser.isVerified && (
                          <span className="flex items-center justify-center gap-1 text-xs text-blue-600 mb-2">
                        <FiCheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                        <p className="text-xs text-gray-500 mb-3">
                          {suggestedUser.bio || 'Active Seller'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                  <FollowButton
                    userId={suggestedUser.id}
                    className="w-full"
                  />
                        <Link
                          href={`/user/${suggestedUser.id}`}
                          className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-center"
                        >
                          View Profile
                        </Link>
                      </div>
                </div>
              ))}
            </div>
          </div>
        )}

            {/* Quick Actions Section */}
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/my-ads"
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <FiPackage className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">My Ads</h3>
                    <p className="text-sm text-gray-600">Manage your listings</p>
            </div>
          </Link>

          <Link
                  href="/orders"
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <FiShoppingBag className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Orders</h3>
                    <p className="text-sm text-gray-600">View order history</p>
            </div>
          </Link>

          <Link
                  href="/settings"
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <FiSettings className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Settings</h3>
                    <p className="text-sm text-gray-600">Account preferences</p>
            </div>
          </Link>

          <Link
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    const aboutSection = document.getElementById('about-section');
                    aboutSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <FiBriefcase className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">About</h3>
                    <p className="text-sm text-gray-600">Your profile information</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* About Section */}
            <div id="about-section" className="bg-white rounded-2xl shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">About</h2>
          <Link
            href="/settings"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                >
                  <FiEdit3 className="w-4 h-4" />
                  <span className="font-medium">Edit</span>
                </Link>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Bio</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {user.bio || `Welcome to my SellIt profile! I'm an active member of the marketplace community, passionate about finding great deals and connecting with buyers and sellers. I believe in honest transactions, clear communication, and building trust within our community.`}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <FiGlobe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                      {user.phone && user.showPhone && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <FiMapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{user.phone}</span>
                        </div>
                      )}
                      {user.location && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <FiMapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{user.location.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Account Details</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <FiCalendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}
                        </span>
                      </div>
                      {user.isVerified && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <FiCheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Verified Seller</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ready to sell something? */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border-2 border-dashed border-blue-200">
              <div className="flex flex-col items-center text-center">
                <div className="relative w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                  <FiCamera className="w-8 h-8 text-white" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <FiPlus className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">Ready to sell something?</h2>
                <p className="text-gray-600 mb-6 max-w-md">
                  List your first item today and reach thousands of potential buyers in your area.
                </p>
                <Link
                  href="/post-ad"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Create Listing
          </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Followers/Following Modal */}
      {user && (
        <FollowersModal
          userId={user.id}
          type={followModalType}
          isOpen={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
        />
      )}
    </div>
  );
}
