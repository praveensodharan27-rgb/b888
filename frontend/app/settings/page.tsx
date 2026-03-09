'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiCheckCircle, FiCalendar, FiFolder, FiVolume2, FiSave, FiMail, FiShield, FiLogOut } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from '@/lib/toast';
import { FiMessageCircle } from 'react-icons/fi';

export default function SettingsPage() {
  const { user, isLoading, updateUser, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    bio: '',
    showProfile: true,
    showOnlineStatus: true,
    showEmailOnListings: false,
    showPhone: true
  });

  // Fetch full profile data
  const { data: profileData } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const response = await api.get('/user/profile');
      return response.data.user;
    },
    enabled: !!user,
    staleTime: 5 * 1000,
  });

  // AI Chat (chatbot) – Business Package: AI replies when seller is offline
  const { data: aiChatData } = useQuery({
    queryKey: ['user', 'ai-chat', user?.id],
    queryFn: async () => {
      const res = await api.get('/user/ai-chat');
      return res.data;
    },
    enabled: !!user,
  });
  const aiChatMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await api.put('/user/ai-chat', { enabled });
      return res.data;
    },
    onSuccess: (_, enabled) => {
      queryClient.setQueryData(['user', 'ai-chat', user?.id], { success: true, aiChatEnabled: enabled });
      toast.success(enabled ? 'AI Chat is on' : 'AI Chat is off');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update AI Chat');
    },
  });
  const aiChatEnabled = aiChatData?.aiChatEnabled ?? false;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || user.email?.split('@')[0] || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        showProfile: user.showProfile !== undefined ? user.showProfile : true,
        showOnlineStatus: user.showOnlineStatus !== undefined ? user.showOnlineStatus : true,
        showEmailOnListings: user.showEmailOnListings !== undefined ? user.showEmailOnListings : false,
        showPhone: user.showPhone !== undefined ? user.showPhone : true
      });
    }
  }, [user, isLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (field: 'showProfile' | 'showOnlineStatus' | 'showEmailOnListings' | 'showPhone') => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? Cookies.get('token') : null;
    if (typeof window !== 'undefined' && !token) {
      toast.error('Session expired. Please log in again.');
      router.push('/login?redirect=/settings');
      return;
    }
    setSaving(true);

    try {
      const response = await api.put('/user/profile', {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        showProfile: formData.showProfile,
        showOnlineStatus: formData.showOnlineStatus,
        showEmailOnListings: formData.showEmailOnListings,
        showPhone: formData.showPhone
      });
      
      if (response.data.success) {
        if (updateUser) {
          updateUser(response.data.user);
        }
        toast.success('Profile updated successfully!');
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      const status = error.response?.status;
      const message = error.response?.data?.message;
      if (status === 401) {
        toast.error('Session expired. Please log in again.');
        router.push('/login?redirect=/settings');
        return;
      }
      toast.error(message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (logout) {
      await logout();
      router.push('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
      <div className="container mx-auto px-4 max-w-[1400px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex flex-col items-center text-center">
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
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    ACTIVE
                  </div>
                  {user.isVerified && (
                    <div className="absolute top-0 right-0 w-8 h-8 bg-primary-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                      <FiCheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h1>
                <p className="text-gray-600 text-sm mb-4">{user.email}</p>
                <div className="flex flex-col gap-2 mb-4">
                  {user.isVerified && (
                    <div className="flex items-center justify-center gap-2 text-primary-600">
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
                <span className="text-2xl font-bold text-gray-900">{freeAdsPercentage}%</span>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${freeAdsPercentage}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {freeAdsUsed} / {freeAdsLimit} ads used this month
              </p>
            </div>

            {/* Business Packages - hidden on profile/settings (kanikaruthu) */}
            {false && profileData?.businessPackage && (profileData.businessPackage.allPackages?.length > 0 || profileData.businessPackage.activePackages?.length > 0) && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FiFolder className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Business Packages</h3>
                </div>
                <div className="space-y-4">
                  {(profileData.businessPackage.allPackages || profileData.businessPackage.activePackages).slice(0, 2).map((pkg: any) => {
                    const remaining = pkg.adsRemaining || 0;
                    const total = pkg.totalAds || pkg.totalAdsAllowed || 0;
                    const packageName = pkg.packageName || pkg.packageType?.replace('_', ' ') || 'Package';
                    const expiresAt = pkg.expiresAt ? new Date(pkg.expiresAt) : null;
                    
                    return (
                      <div key={pkg.id || pkg.packageId} className="border border-gray-200 rounded-lg p-4">
                        <div className="mb-2">
                          <h4 className="font-semibold text-gray-900">{packageName.toUpperCase()}</h4>
                          {pkg.packageType?.includes('PREMIUM') || packageName.includes('Premium') ? (
                            <p className="text-sm text-gray-600 mt-1">{total} Premium Ad Credits</p>
                          ) : (
                            <p className="text-sm text-gray-600 mt-1">Auto-Refresh Boost</p>
                          )}
                          {remaining > 0 && (
                            <p className="text-sm text-primary-600 font-medium mt-1">{remaining} remaining</p>
                          )}
                          {pkg.packageType?.includes('VISIBILITY') || packageName.includes('Visibility') && (
                            <p className="text-sm text-gray-600 mt-1">Active on {pkg.activeItemsCount || 0} items</p>
                          )}
                        </div>
                        {expiresAt && (
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-500">
                              Ends {expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <Link href="/settings" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
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
            <div className="bg-primary-600 rounded-2xl shadow-sm p-6 text-white relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <FiVolume2 className="w-8 h-8 text-white opacity-30" />
              </div>
              <div className="relative z-10">
                <div className="text-4xl font-bold mb-2">{totalAds} Ads</div>
                <p className="text-primary-50 text-sm">
                  Use free and promoted listings to reach more buyers.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Settings Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Settings Content */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-gray-900">Account Settings</h2>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FiSave className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Edit Profile Section */}
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <FiCheckCircle className="w-5 h-5 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                        Public Username
                      </label>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="johndoe__99"
                      />
                    </div>
                    <div>
                      <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={4}
                        maxLength={500}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        placeholder="I've been an active buyer and seller since 2024. My focus is primarily on vintage electronics and high-quality home furniture."
                      />
                    </div>
                  </div>
                </div>

                {/* Change Phone / Email Section */}
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <FiMail className="w-5 h-5 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Change Phone / Email</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-24"
                          placeholder="johndoe@example.com"
                        />
                        {user.isVerified && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-1 rounded">
                            VERIFIED
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="+1 (555) 000-0000"
                        />
                        <button
                          type="button"
                          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Privacy Settings Section */}
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <FiShield className="w-5 h-5 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
                  </div>
                  <div className="space-y-6">
                    {/* Profile Visibility */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">Profile Visibility</h4>
                        <p className="text-sm text-gray-600 mt-1">Allow others to see your profile and history</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggle('showProfile')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                          formData.showProfile ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            formData.showProfile ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Show Online Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">Show Online Status</h4>
                        <p className="text-sm text-gray-600 mt-1">Let buyers know when you are active</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggle('showOnlineStatus')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                          formData.showOnlineStatus ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            formData.showOnlineStatus ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Show Email on Listings */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">Show Email on Listings</h4>
                        <p className="text-sm text-gray-600 mt-1">Allow buyers to see your email address</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggle('showEmailOnListings')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                          formData.showEmailOnListings ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            formData.showEmailOnListings ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Hide Phone Number in Ads */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">Hide Phone Number in Ads</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          When enabled, your phone number will be hidden on ad pages. Buyers can still contact you via chat.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggle('showPhone')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                          formData.showPhone ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            formData.showPhone ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Chat (Chat bot) – Business Package sellers: AI replies when you're offline */}
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <FiMessageCircle className="w-5 h-5 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900">AI Chat (Chat bot)</h3>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">Turn on AI Chat</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        When you're offline or not viewing the chat, AI will reply to buyers in Manglish. Business Package required.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => aiChatMutation.mutate(!aiChatEnabled)}
                      disabled={aiChatMutation.isPending}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 ${
                        aiChatEnabled ? 'bg-primary-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          aiChatEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Log Out Button */}
                <div className="pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <FiLogOut className="w-5 h-5" />
                    <span>Log Out of Account</span>
                  </button>
                </div>
              </form>
          </div>
        </div>
      </div>
    </div>
  );
}
