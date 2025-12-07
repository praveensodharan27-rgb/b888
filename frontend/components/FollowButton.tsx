'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiUserPlus, FiUserCheck } from 'react-icons/fi';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

export default function FollowButton({ 
  userId, 
  initialIsFollowing = false, 
  onFollowChange,
  className = ''
}: FollowButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkFollowingStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }

    try {
      const response = await api.get(`/follow/check/${userId}`);
      if (response.data.success) {
        setIsFollowing(response.data.isFollowing);
      }
    } catch (error: any) {
      // Handle 401 (unauthorized) gracefully - user is not logged in
      if (error.response?.status === 401) {
        setIsFollowing(false);
      } else {
        console.error('Check following error:', error);
      }
    } finally {
      setChecking(false);
    }
  }, [userId, isAuthenticated]);

  useEffect(() => {
    checkFollowingStatus();
  }, [checkFollowingStatus]);

  const handleFollow = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setLoading(true);
    // Optimistic update
    const previousState = isFollowing;
    setIsFollowing(true);
    if (onFollowChange) onFollowChange(true);

    try {
      const response = await api.post(`/follow/${userId}`);
      if (response.data.success) {
        toast.success('Followed successfully!');
      }
    } catch (error: any) {
      // Revert on error
      setIsFollowing(previousState);
      if (onFollowChange) onFollowChange(previousState);
      
      if (error.response?.status === 401) {
        router.push('/login');
        toast.error('Please login to follow users');
      } else {
        const message = error.response?.data?.message || 'Failed to follow user';
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setLoading(true);
    // Optimistic update
    const previousState = isFollowing;
    setIsFollowing(false);
    if (onFollowChange) onFollowChange(false);

    try {
      const response = await api.delete(`/follow/${userId}`);
      if (response.data.success) {
        toast.success('Unfollowed successfully!');
      }
    } catch (error: any) {
      // Revert on error
      setIsFollowing(previousState);
      if (onFollowChange) onFollowChange(previousState);
      
      if (error.response?.status === 401) {
        router.push('/login');
        toast.error('Please login to unfollow users');
      } else {
        const message = error.response?.data?.message || 'Failed to unfollow user';
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking && isAuthenticated) {
    return (
      <button
        disabled
        className={`px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed ${className}`}
      >
        Loading...
      </button>
    );
  }

  if (isFollowing && isAuthenticated) {
    return (
      <button
        onClick={handleUnfollow}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <FiUserCheck className="w-4 h-4" />
        <span>{loading ? 'Unfollowing...' : 'Following'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <FiUserPlus className="w-4 h-4" />
      <span>{loading ? 'Following...' : 'Follow'}</span>
    </button>
  );
}

