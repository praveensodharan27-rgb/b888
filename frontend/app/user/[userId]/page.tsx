'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { FiMapPin, FiCheckCircle, FiPackage, FiUsers, FiArrowLeft, FiAlertCircle, FiUserPlus, FiMail, FiEdit3, FiMoreVertical, FiStar, FiHeart, FiCalendar, FiPhone, FiMessageCircle, FiTag, FiX, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import Link from 'next/link';
import FollowButton from '@/components/FollowButton';
import ProfileLoading from '@/components/ProfileLoading';
import FollowersModal from '@/components/FollowersModal';
import BlockButton from '@/components/BlockButton';
import { useProfileCache } from '@/contexts/ProfileCacheContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import ImageWithFallback from '@/components/ImageWithFallback';
import { format } from 'date-fns';
import { useToggleFavorite, useIsFavorite } from '@/hooks/useAds';

interface PublicUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  showPhone?: boolean;
  isVerified: boolean;
  createdAt?: string;
  location?: {
    name: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  tags?: string[];
  _count?: {
    ads: number;
  };
}

type TabType = 'listings' | 'reviews' | 'followers' | 'about';

export default function ProfileViewScreen() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { getProfile, setProfile, updateFollowStats } = useProfileCache();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const [contactRequestStatus, setContactRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected' | 'checking'>('checking');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('listings');
  const [showMenu, setShowMenu] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [savingTags, setSavingTags] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-container')) {
        setShowMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  const fetchUserProfile = useCallback(async (isBackgroundFetch: boolean = false) => {
    try {
      if (!isBackgroundFetch) {
        setLoading(true);
        setError(null);
      }

      const userResponse = await api.get(`/user/public/${userId}`);

      if (userResponse.data.success) {
        const userData = userResponse.data.user;
        const statsData = {
          followers: userData.followersCount || 0,
          following: userData.followingCount || 0
        };

        setUser(userData);
        setStats(statsData);
        setTags(userData.tags || []);

        setProfile(userId, {
          user: userData,
          stats: statsData,
          timestamp: Date.now()
        });
      }
    } catch (error: any) {
      console.error('Fetch user error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      let errorMessage = 'Failed to fetch user profile';
      if (error.response?.status === 404) {
        errorMessage = 'User not found';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (!isBackgroundFetch) {
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      if (!isBackgroundFetch) {
        setLoading(false);
      }
    }
  }, [userId, setProfile]);

  // Check cache first
  useEffect(() => {
    if (!userId) return;

    const cachedProfile = getProfile(userId);
    
    if (cachedProfile) {
      setUser(cachedProfile.user);
      setStats(cachedProfile.stats);
      setTags(cachedProfile.user.tags || []);
      setLoading(false);
      fetchUserProfile(true);
    } else {
      fetchUserProfile(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, fetchUserProfile]);

  // Check contact request status
  useEffect(() => {
    if (!currentUser || !userId || currentUser.id === userId) {
      setContactRequestStatus('none');
      return;
    }

    const checkContactRequest = async () => {
      try {
        const response = await api.get(`/contact-request/check/${userId}`);
        if (response.data.success) {
          setContactRequestStatus(response.data.status || 'none');
        } else {
          setContactRequestStatus('none');
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          setContactRequestStatus('none');
        } else {
          console.error('Check contact request error:', error);
          setContactRequestStatus('none');
        }
      }
    };

    checkContactRequest();
  }, [currentUser, userId]);

  // Fetch user's ads (maximum 10 posts) - always fetch on page load
  const { data: adsData, isLoading: adsLoading, error: adsError } = useQuery({
    queryKey: ['user', 'ads', userId],
    queryFn: async () => {
      try {
        const response = await api.get(`/ads?userId=${userId}&status=APPROVED&limit=10`);
        // Backend returns: { success: true, ads: [...], pagination: {...} }
        if (response.data.success && response.data.ads) {
          return {
            ads: response.data.ads,
            pagination: response.data.pagination || { total: response.data.ads.length }
          };
        }
        // Fallback if structure is different
        return {
          ads: response.data.ads || response.data || [],
          pagination: response.data.pagination || { total: 0 }
        };
      } catch (error: any) {
        console.error('Error fetching user ads:', error);
        if (error.response) {
          console.error('Error response:', error.response.data);
        }
        return { ads: [], pagination: { total: 0 } };
      }
    },
    enabled: !!userId, // Always fetch when userId is available
    retry: 1, // Retry once on failure
  });

  const handleFollowChange = useCallback((isFollowing: boolean) => {
    setStats(prev => ({
      ...prev,
      followers: isFollowing ? prev.followers + 1 : Math.max(0, prev.followers - 1)
    }));
    updateFollowStats(userId, isFollowing);
  }, [userId, updateFollowStats]);

  const handleSaveTags = async () => {
    if (!isOwnProfile) return;
    
    setSavingTags(true);
    try {
      const response = await api.put('/user/profile', { tags });
      if (response.data.success) {
        toast.success('Tags updated successfully');
        setEditingTags(false);
        setUser(prev => prev ? { ...prev, tags } : null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update tags');
    } finally {
      setSavingTags(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleChangePassword = async () => {
    if (!isOwnProfile) return;

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await api.put('/user/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        toast.success('Password changed successfully');
        setShowChangePassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // Extract ads from response - must be before early returns
  const ads = Array.isArray(adsData?.ads) ? adsData.ads : [];

  // Debug: Log ads data when it changes - must be before early returns
  useEffect(() => {
    if (userId) {
      const currentAds = Array.isArray(adsData?.ads) ? adsData.ads : [];
      console.log('User ID:', userId);
      console.log('Ads Data:', adsData);
      console.log('Ads Array:', currentAds);
      console.log('Ads Loading:', adsLoading);
      if (adsError) {
        console.error('Ads Error:', adsError);
      }
    }
  }, [userId, adsData, adsLoading, adsError]);

  // Initialize tags from user data - MUST be before early returns
  useEffect(() => {
    if (user?.tags && Array.isArray(user.tags)) {
      setTags(user.tags);
    } else if (user && !user.tags) {
      setTags([]);
    }
  }, [user?.tags, user]);

  if (loading) {
    return <ProfileLoading />;
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'User not found'}
          </h2>
          <p className="text-gray-600 mb-6">
            The profile you're looking for doesn't exist or has been removed.
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;
  const sellerRating = 4.8; // TODO: Calculate from reviews
  const userCity = user.location?.city || user.location?.name || user.location?.state || 'Location not set';
  const joinedDate = user.createdAt ? format(new Date(user.createdAt), 'MMM yyyy') : 'Recently';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Gradient Background */}
      <div className="bg-gradient-to-b from-[#F2F6FA] to-white pb-8">
        <div className="container mx-auto px-4 max-w-5xl pt-8">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>

          {/* Profile Header Card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-8 pb-8 pt-8">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Profile Image with Verified Ring */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className={`w-28 h-28 rounded-full object-cover border-4 ${
                          user.isVerified ? 'border-blue-600' : 'border-white'
                        } shadow-lg`}
                      />
                    ) : (
                      <div className={`w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold border-4 ${
                        user.isVerified ? 'border-blue-600' : 'border-white'
                      } shadow-lg`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    {user.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                        <FiCheckCircle className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Name + City + Verified Badge */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h1 className="text-[22px] font-bold text-gray-900">{user.name}</h1>
                        {user.isVerified && (
                          <FiCheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                        <span className="text-[14px] text-[#61656A] flex items-center gap-1">
                          <FiMapPin className="w-4 h-4" />
                          {userCity}
                        </span>
                      </div>

                      {/* Short Bio */}
                      <p className="text-[14px] text-[#61656A] mb-4">
                        {user.bio || `Hi, I'm ${user.name.split(' ')[0]}. I sell products and respond quickly.`}
                      </p>

                      {/* Marketplace Stats */}
                      <div className="flex flex-wrap gap-6 mb-4">
                        <div className="flex items-center gap-2">
                          <FiStar className="w-5 h-5 text-yellow-500" />
                          <div>
                            <div className="text-lg font-bold text-gray-900">{sellerRating}</div>
                            <div className="text-xs text-[#61656A]">Seller Rating</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiPackage className="w-5 h-5 text-blue-600" />
                          <div>
                            <div className="text-lg font-bold text-gray-900">{user._count?.ads || 0}</div>
                            <div className="text-xs text-[#61656A]">Total Ads</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiUsers className="w-5 h-5 text-blue-600" />
                          <div>
                            <div className="text-lg font-bold text-gray-900">{stats.followers}</div>
                            <div className="text-xs text-[#61656A]">Followers</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiCalendar className="w-5 h-5 text-blue-600" />
                          <div>
                            <div className="text-lg font-bold text-gray-900">{joinedDate}</div>
                            <div className="text-xs text-[#61656A]">Joined</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isOwnProfile ? (
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 px-4 py-2 bg-[#0B65C2] hover:bg-[#0a5aad] text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          <FiEdit3 className="w-4 h-4" />
                          Edit Profile
                        </Link>
                      ) : (
                        <>
                          <FollowButton
                            userId={userId}
                            onFollowChange={handleFollowChange}
                            className="min-w-[100px]"
                          />
                          {currentUser && (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await api.post('/chat/room', { userId });
                                    if (response.data.success) {
                                      router.push(`/chat?roomId=${response.data.room.id}`);
                                    }
                                  } catch (error: any) {
                                    toast.error(error.response?.data?.message || 'Failed to start conversation');
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2 border border-[#DDE3E8] hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
                              >
                                <FiMessageCircle className="w-4 h-4" />
                                Chat
                              </button>
                              {user.phone && user.showPhone && (
                                <a
                                  href={`tel:${user.phone}`}
                                  className="flex items-center gap-2 px-4 py-2 border border-[#DDE3E8] hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
                                >
                                  <FiPhone className="w-4 h-4" />
                                  Call
                                </a>
                              )}
                              <div className="relative menu-container">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 border border-[#DDE3E8] hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                  <FiMoreVertical className="w-4 h-4" />
                                </button>
                                {showMenu && (
                                  <div 
                                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden menu-container"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => {
                                        toast.info('Report feature coming soon');
                                        setShowMenu(false);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                      <FiAlertCircle className="w-4 h-4" />
                                      Report User
                                    </button>
                                    <div className="border-t border-gray-200">
                                      <BlockButton
                                        userId={userId}
                                        userName={user.name}
                                        variant="menu"
                                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                        onBlockChange={(blocked) => {
                                          if (blocked) {
                                            setShowMenu(false);
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-t border-gray-200">
              <div className="flex gap-8 px-8">
                <button
                  onClick={() => setActiveTab('listings')}
                  className={`py-4 px-2 border-b-2 font-semibold text-base transition-colors ${
                    activeTab === 'listings'
                      ? 'border-[#0B65C2] text-[#0B65C2]'
                      : 'border-transparent text-[#61656A] hover:text-gray-900'
                  }`}
                >
                  Listings
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`py-4 px-2 border-b-2 font-semibold text-base transition-colors ${
                    activeTab === 'reviews'
                      ? 'border-[#0B65C2] text-[#0B65C2]'
                      : 'border-transparent text-[#61656A] hover:text-gray-900'
                  }`}
                >
                  Reviews
                </button>
                <button
                  onClick={() => {
                    setFollowModalType('followers');
                    setShowFollowersModal(true);
                  }}
                  className={`py-4 px-2 border-b-2 font-semibold text-base transition-colors ${
                    activeTab === 'followers'
                      ? 'border-[#0B65C2] text-[#0B65C2]'
                      : 'border-transparent text-[#61656A] hover:text-gray-900'
                  }`}
                >
                  Followers ({stats.followers})
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`py-4 px-2 border-b-2 font-semibold text-base transition-colors ${
                    activeTab === 'about'
                      ? 'border-[#0B65C2] text-[#0B65C2]'
                      : 'border-transparent text-[#61656A] hover:text-gray-900'
                  }`}
                >
                  About
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 max-w-5xl py-8">
        {activeTab === 'listings' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Active Listings {ads.length > 0 && `(${ads.length})`}
                {adsError && (
                  <span className="text-sm text-red-500 ml-2">(Error loading ads)</span>
                )}
              </h2>
            </div>
            {adsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm animate-pulse overflow-hidden">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : adsError ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <FiAlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Listings</h3>
                <p className="text-gray-600 mb-4">Failed to load user listings. Please try refreshing the page.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Refresh Page
                </button>
              </div>
            ) : ads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ads.map((ad: any) => (
                  <ListingCard key={ad.id} ad={ad} isOwnProfile={isOwnProfile} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Listings Yet</h3>
                <p className="text-gray-600">This user hasn't posted any ads yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reviews</h2>
            <div className="text-center py-12">
              <FiStar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No reviews yet</p>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-6">
            {/* Bio Section */}
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">About</h2>
              <div className="space-y-6">
                {user.bio && (
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Bio</h3>
                    <p className="text-[14px] text-[#61656A] leading-relaxed">{user.bio}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Contact Information</h3>
                  <div className="space-y-2 text-[14px] text-[#61656A]">
                    {user.phone && user.showPhone ? (
                      <div className="flex items-center gap-2">
                        <FiPhone className="w-4 h-4" />
                        <span>{user.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <FiPhone className="w-4 h-4" />
                        <span>Phone number hidden (Privacy)</span>
                      </div>
                    )}
                    {user.location && (
                      <div className="flex items-center gap-2">
                        <FiMapPin className="w-4 h-4" />
                        <span>{user.location.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Member Since</h3>
                  <p className="text-[14px] text-[#61656A]">
                    {user.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'Recently'}
                  </p>
                </div>
              </div>
            </div>

            {/* Location Map */}
            {user.location && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FiMapPin className="w-5 h-5" />
                  Location
                </h3>
                {user.location.latitude && user.location.longitude ? (
                  <>
                    <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '300px' }}>
                      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                        <iframe
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${user.location.latitude},${user.location.longitude}&zoom=13`}
                        />
                      ) : (
                        <iframe
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${user.location.longitude - 0.01},${user.location.latitude - 0.01},${user.location.longitude + 0.01},${user.location.latitude + 0.01}&layer=mapnik&marker=${user.location.latitude},${user.location.longitude}`}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-gray-600">{user.location.name}</p>
                      <a
                        href={`https://www.google.com/maps?q=${user.location.latitude},${user.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <FiMapPin className="w-4 h-4" />
                        Open in Maps
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center" style={{ height: '200px' }}>
                    <div className="text-center p-4">
                      <FiMapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-medium">{user.location.name || 'Location not available'}</p>
                      <p className="text-xs text-gray-500 mt-1">Map coordinates not available</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Change Password Section - Only for own profile */}
            {isOwnProfile && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FiLock className="w-5 h-5" />
                    Change Password
                  </h3>
                  <button
                    onClick={() => {
                      setShowChangePassword(!showChangePassword);
                      if (showChangePassword) {
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <FiEdit3 className="w-4 h-4" />
                    {showChangePassword ? 'Cancel' : 'Change Password'}
                  </button>
                </div>

                {showChangePassword && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.current ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter new password (min 6 characters)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.new ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.confirm ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {changingPassword ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tags Section */}
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FiTag className="w-5 h-5" />
                  Tags
                </h3>
                {isOwnProfile && (
                  <button
                    onClick={() => {
                      if (editingTags) {
                        handleSaveTags();
                      } else {
                        setEditingTags(true);
                      }
                    }}
                    disabled={savingTags}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FiEdit3 className="w-4 h-4" />
                    {editingTags ? (savingTags ? 'Saving...' : 'Save') : 'Edit'}
                  </button>
                )}
              </div>
              
              {editingTags && isOwnProfile ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTag();
                        }
                      }}
                      placeholder="Add a tag..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setEditingTags(false);
                      setTags(user.tags && Array.isArray(user.tags) ? user.tags : []);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.length > 0 ? (
                    tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No tags added yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Followers/Following Modal */}
      <FollowersModal
        userId={userId}
        type={followModalType}
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
      />
    </div>
  );
}

// Compact Listing Card Component for 2-column grid
function ListingCard({ ad, isOwnProfile }: { ad: any; isOwnProfile: boolean }) {
  const { isAuthenticated } = useAuth();
  const { data: isFavorite } = useIsFavorite(ad.id, isAuthenticated);
  const toggleFavorite = useToggleFavorite();

  const imageUrl = ad.images && Array.isArray(ad.images) && ad.images.length > 0 
    ? ad.images[0] 
    : null;

  return (
    <Link href={`/ads/${ad.id}`} className="block group">
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden h-full flex flex-col">
        {/* Product Image */}
        <div className="relative h-48 bg-gray-200 overflow-hidden">
          {imageUrl ? (
            <ImageWithFallback
              src={imageUrl}
              alt={ad.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <FiPackage className="w-12 h-12" />
            </div>
          )}
          {/* Heart Icon */}
          {isAuthenticated && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite.mutate(ad.id);
              }}
              className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors z-10"
            >
              <FiHeart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
            </button>
          )}
          {/* Boost Badge */}
          {ad.isPremium && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
              {ad.premiumType || 'PREMIUM'}
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {ad.title}
          </h3>
          <div className="text-lg font-bold text-blue-600 mb-2">
            ₹{ad.price.toLocaleString()}
          </div>
          <div className="flex items-center gap-4 text-sm text-[#61656A] mt-auto">
            {ad.location?.name && (
              <div className="flex items-center gap-1">
                <FiMapPin className="w-4 h-4" />
                <span className="truncate">{ad.location.name}</span>
              </div>
            )}
            {ad.createdAt && (
              <div className="flex items-center gap-1">
                <FiCalendar className="w-4 h-4" />
                <span>{format(new Date(ad.createdAt), 'MMM d')}</span>
              </div>
            )}
          </div>
          {isOwnProfile && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
              <Link
                href={`/edit-ad/${ad.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-center px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // TODO: Boost ad
                }}
                className="flex-1 text-center px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
              >
                Boost
              </button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
