'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiMapPin, FiBriefcase, FiGlobe, FiCheckCircle, FiPackage, FiUsers, FiTrendingUp, FiFileText, FiEdit3, FiUserPlus, FiX } from 'react-icons/fi';
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          {/* Decorative Background Pattern */}
          <div className="h-32 bg-gradient-to-br from-blue-50 to-blue-100 relative overflow-hidden">
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="wave" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path d="M0 50 Q 25 30, 50 50 T 100 50" stroke="#3B82F6" fill="none" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#wave)" />
            </svg>
          </div>

          {/* Profile Content */}
          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row gap-6 -mt-16">
              {/* Profile Image with Status Badge */}
              <div className="flex-shrink-0">
                <div className="relative">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={128}
                      height={128}
                      priority
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-5xl font-bold border-4 border-white shadow-xl">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  {/* Available Badge */}
                  <div className="absolute -bottom-1 -left-1 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    ACTIVE
                  </div>

                  {/* Verification Badge */}
                  {user.isVerified && (
                    <div className="absolute top-0 right-0 w-8 h-8 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                      <FiCheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
                      {user.isVerified && (
                        <FiCheckCircle className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <p className="text-gray-600 mt-2 max-w-2xl">
                      {user.email ? `Active member with ${user.email}` : 'Active SellIt platform member'} • Join our community and start buying and selling today!
                    </p>
                  </div>
                  <Link 
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <FiEdit3 className="w-4 h-4" />
                    <span className="text-sm font-medium">Edit</span>
                  </Link>
                </div>

                {/* Follower/Following Stats */}
                <div className="flex gap-6 mt-4 mb-4">
                  <button 
                    onClick={() => {
                      setFollowModalType('followers');
                      setShowFollowersModal(true);
                    }}
                    className="flex flex-col items-center hover:bg-blue-50 px-6 py-3 rounded-lg transition-colors group"
                  >
                    <span className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {user.followersCount || 0}
                    </span>
                    <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                      Followers
                    </span>
                  </button>
                  <button 
                    onClick={() => {
                      setFollowModalType('following');
                      setShowFollowersModal(true);
                    }}
                    className="flex flex-col items-center hover:bg-blue-50 px-6 py-3 rounded-lg transition-colors group"
                  >
                    <span className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {user.followingCount || 0}
                    </span>
                    <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                      Following
                    </span>
                  </button>
                </div>

                {/* Quick Info Tags */}
                <div className="flex flex-wrap gap-3">
                  {editingLocation ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg w-full md:w-auto">
                      <FiMapPin className="w-4 h-4 text-blue-600" />
                      <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="flex-1 px-3 py-1 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Location</option>
                        {locations.map((loc: any) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} {loc.city ? `, ${loc.city}` : ''} {loc.state ? `, ${loc.state}` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleSaveLocation}
                        disabled={savingLocation || !selectedLocation}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingLocation ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingLocation(false);
                          setSelectedLocation('');
                        }}
                        className="p-1 text-gray-600 hover:text-gray-900"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingLocation(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors group"
                    >
                      <FiMapPin className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700 group-hover:text-blue-600">
                        {selectedLocation 
                          ? locations.find((l: any) => l.id === selectedLocation)?.name || user.location?.name || 'Location Set'
                          : user.location?.name || 'Location: Not Set - Click to Set'}
                      </span>
                      <FiEdit3 className="w-3 h-3 text-gray-500 group-hover:text-blue-600" />
                    </button>
                  )}
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <FiBriefcase className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Member Since: {user.createdAt ? new Date(user.createdAt).getFullYear() : '2024'}</span>
                  </div>
                  {user.phone && user.showPhone && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <FiGlobe className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700">{user.phone}</span>
                    </div>
                  )}
                  {user.phone && !user.showPhone && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <FiGlobe className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700">Phone: Hidden (Privacy)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm mb-6">
          <div className="border-b border-gray-200 px-8">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'reviews'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Activity (0)
              </button>
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="p-8">
              {/* Account Details Section */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Account Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiPackage className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Ads</div>
                      <div className="text-gray-900 font-medium">0 Active Listings</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiUsers className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Account Type</div>
                      <div className="text-gray-900 font-medium">Free Member</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiTrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Status</div>
                      <div className="text-gray-900 font-medium">Active & Verified</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiGlobe className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Region</div>
                      <div className="text-gray-900 font-medium">Worldwide</div>
                    </div>
                  </div>

                  {/* Free Ads Section - Always Visible */}
                  {profileData && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiFileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Free Ads (Monthly)</div>
                        <div className="text-gray-900 font-medium">
                          {isLoadingProfile ? 'Loading...' : (
                            <>
                              <span className={profileData.freeAdsRemaining > 0 ? 'text-blue-600' : 'text-gray-400'}>
                                {profileData.freeAdsRemaining || 0} Remaining
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {profileData.freeAdsUsedThisMonth || 0} / {profileData.freeAdsLimit || 2} used this month
                              </div>
                              {profileData?.nextResetDate && (
                                <div className="text-xs text-gray-400 mt-0.5">
                                  Resets: {new Date(profileData.nextResetDate).toLocaleDateString()}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Business Package Ads - Always Visible if user has any packages */}
                  {profileData?.businessPackage && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiBriefcase className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Business Package Ads</div>
                        <div className="text-gray-900 font-medium">
                          {isLoadingProfile ? 'Loading...' : (
                            <>
                              <span className={profileData.businessPackage.businessAdsRemaining > 0 ? 'text-green-600' : 'text-orange-600'}>
                                {profileData.businessPackage.businessAdsRemaining || 0} Remaining
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {profileData.businessPackage.totalPurchased || 0} Total Purchase{profileData.businessPackage.totalPurchased !== 1 ? 's' : ''} • {profileData.businessPackage.activeCount || 0} Active Package{profileData.businessPackage.activeCount !== 1 ? 's' : ''}
                              </div>
                              {/* Sell Box Style: Show ALL packages (active + exhausted + expired) with full details */}
                              {(profileData.businessPackage.allPackages || profileData.businessPackage.activePackages) && 
                               (profileData.businessPackage.allPackages?.length > 0 || profileData.businessPackage.activePackages?.length > 0) ? (
                                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                                  {(profileData.businessPackage.allPackages || profileData.businessPackage.activePackages).map((pkg: any, index: number) => {
                                    const remaining = pkg.adsRemaining || 0;
                                    const used = pkg.usedAds || pkg.adsUsed || 0;
                                    const total = pkg.totalAds || pkg.totalAdsAllowed || 0;
                                    const isExhausted = pkg.isExhausted || (remaining === 0 && total > 0 && !pkg.isExpired);
                                    const isExpired = pkg.isExpired || pkg.status === 'EXPIRED';
                                    const isActive = !isExhausted && !isExpired && remaining > 0;
                                    const isOldestWithAds = index === 0 && isActive; // First package (oldest) with ads
                                    const packageName = pkg.packageName || pkg.packageType?.replace('_', ' ') || 'Package';
                                    
                                    return (
                                      <div 
                                        key={pkg.id || pkg.packageId} 
                                        className={`text-xs p-2.5 rounded border ${
                                          isActive 
                                            ? 'bg-green-50 border-green-300' 
                                            : isExhausted 
                                              ? 'bg-orange-50 border-orange-300' 
                                              : isExpired
                                                ? 'bg-gray-50 border-gray-300'
                                                : 'bg-blue-50 border-blue-200'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-1.5">
                                          <span className={`font-semibold ${
                                            isActive ? 'text-green-700' : isExhausted ? 'text-orange-700' : isExpired ? 'text-gray-600' : 'text-blue-700'
                                          }`}>
                                            {packageName}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            {isOldestWithAds && (
                                              <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded font-bold">
                                                USING
                                              </span>
                                            )}
                                            {isExhausted && (
                                              <span className="px-1.5 py-0.5 bg-orange-600 text-white text-xs rounded font-bold">
                                                EXHAUSTED
                                              </span>
                                            )}
                                            {isExpired && (
                                              <span className="px-1.5 py-0.5 bg-gray-600 text-white text-xs rounded font-bold">
                                                EXPIRED
                                              </span>
                                            )}
                                            {isActive && !isOldestWithAds && (
                                              <span className="font-bold text-green-600">
                                                {remaining} left
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-1.5">
                                          <div>
                                            <span className="text-gray-500">Ads: </span>
                                            <span className="font-medium">{used}/{total}</span>
                                            {isActive && (
                                              <span className="text-green-600 ml-1 font-semibold">({remaining} remaining)</span>
                                            )}
                                          </div>
                                          {pkg.amount && (
                                            <div>
                                              <span className="text-gray-500">Amount: </span>
                                              <span className="font-medium">₹{pkg.amount}</span>
                                            </div>
                                          )}
                                        </div>
                                        {pkg.purchasedAt && (
                                          <div className="text-gray-500 mb-1">
                                            <span className="text-gray-400">Purchased: </span>
                                            {new Date(pkg.purchasedAt).toLocaleDateString('en-IN', { 
                                              day: 'numeric', 
                                              month: 'short', 
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </div>
                                        )}
                                        {pkg.expiresAt && (
                                          <div className={`text-xs mb-1.5 ${
                                            isExpired ? 'text-gray-500' : 'text-gray-600'
                                          }`}>
                                            <span className="text-gray-400">{isExpired ? 'Expired: ' : 'Expires: '}</span>
                                            {new Date(pkg.expiresAt).toLocaleDateString('en-IN', { 
                                              day: 'numeric', 
                                              month: 'short', 
                                              year: 'numeric'
                                            })}
                                          </div>
                                        )}
                                        {/* Progress bar */}
                                        {total > 0 && (
                                          <div className="mt-1.5">
                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                              <div 
                                                className={`h-1.5 rounded-full transition-all ${
                                                  isActive ? 'bg-green-500' : isExhausted ? 'bg-orange-400' : 'bg-gray-400'
                                                }`}
                                                style={{ width: `${Math.min(100, (used / total) * 100)}%` }}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 italic mt-1">
                                  No business packages purchased
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Total Remaining Ads */}
                  {profileData && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiTrendingUp className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Ads Available</div>
                        <div className="text-gray-900 font-medium text-lg">
                          {isLoadingProfile ? 'Loading...' : (
                            <>
                              {profileData.businessPackage?.totalRemaining || 
                               (profileData.businessPackage?.businessAdsRemaining || 0) + (profileData.freeAdsRemaining || 0) || 
                               0}
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {profileData.businessPackage?.businessAdsRemaining || 0} from packages + {profileData.freeAdsRemaining || 0} free
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiBriefcase className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Membership</div>
                      <div className="text-gray-900 font-medium">Standard</div>
                    </div>
                  </div>
                </div>

                {/* Categories/Tools Tags */}
                <div className="mt-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">Electronics</span>
                    <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">Fashion</span>
                    <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">Home & Garden</span>
                    <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">Vehicles</span>
                    <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">Services</span>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
                <p className="text-gray-600 leading-relaxed">
                  {user.bio || `Welcome to my SellIt profile! I'm an active member of the marketplace community, 
                  passionate about finding great deals and connecting with buyers and sellers. 
                  I believe in honest transactions, clear communication, and building trust within 
                  our community. Feel free to browse my listings and reach out if you have any questions!`}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="p-8 text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Activity Yet</h3>
              <p className="text-gray-600">Your activity history will appear here once you start buying or selling.</p>
            </div>
          )}
        </div>

        {/* Suggested Users to Follow */}
        {suggestedUsers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">People You May Know</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestedUsers.map((suggestedUser) => (
                <div key={suggestedUser.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                  <Link href={`/user/${suggestedUser.id}`} className="flex flex-col items-center text-center mb-4">
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
                    <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                      {suggestedUser.name}
                    </h3>
                    {suggestedUser.isVerified && (
                      <span className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                        <FiCheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </Link>
                  <FollowButton
                    userId={suggestedUser.id}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/my-ads"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all border border-gray-100"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FiPackage className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">My Ads</h3>
            <p className="text-sm text-gray-600">Manage listings</p>
          </Link>

          <Link
            href="/contact-requests"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all border border-gray-100"
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <FiUsers className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Contact Requests</h3>
            <p className="text-sm text-gray-600">Pending requests</p>
          </Link>

          <Link
            href="/favorites"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all border border-gray-100"
          >
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Favorites</h3>
            <p className="text-sm text-gray-600">Saved items</p>
          </Link>

          <Link
            href="/orders"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all border border-gray-100"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Orders</h3>
            <p className="text-sm text-gray-600">Purchase history</p>
          </Link>

          <Link
            href="/settings"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all border border-gray-100"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Settings</h3>
            <p className="text-sm text-gray-600">Account settings</p>
          </Link>
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
