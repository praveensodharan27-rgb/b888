'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiArrowLeft, FiShield, FiUser } from 'react-icons/fi';
import Link from 'next/link';
import api from '@/lib/api';
import toast from '@/lib/toast';
import ImageWithFallback from '@/components/ImageWithFallback';

interface BlockedUser {
  id: string;
  name: string;
  avatar?: string;
  blockedAt: string;
  reason?: string;
}

export default function BlockedUsersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchBlockedUsers();
    }
  }, [user, isLoading, router]);

  const fetchBlockedUsers = async () => {
    try {
      const response = await api.get('/block/list');
      if (response.data.success) {
        setBlockedUsers(response.data.blockedUsers);
      }
    } catch (error) {
      console.error('Fetch blocked users error:', error);
      toast.error('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to unblock ${userName}?`)) return;

    setUnblocking(userId);
    try {
      const response = await api.delete(`/block/${userId}`);
      if (response.data.success) {
        toast.success(`${userName} has been unblocked`);
        setBlockedUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to unblock user';
      toast.error(message);
    } finally {
      setUnblocking(null);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/profile" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Back to Profile</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Blocked Users</h1>
          <p className="text-gray-600 mt-2">Manage users you've blocked</p>
        </div>

        {/* Blocked Users List */}
        {blockedUsers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiShield className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Blocked Users</h2>
            <p className="text-gray-600">
              Users you block will appear here. You can unblock them anytime.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {blockedUsers.map((blockedUser) => (
              <div key={blockedUser.id} className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* User Avatar */}
                    {blockedUser.avatar ? (
                      <ImageWithFallback
                        src={blockedUser.avatar}
                        alt={blockedUser.name}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                        <FiUser className="w-6 h-6 text-gray-400" />
                      </div>
                    )}

                    {/* User Info */}
                    <div>
                      <h3 className="font-semibold text-gray-900">{blockedUser.name}</h3>
                      <p className="text-sm text-gray-600">
                        Blocked {new Date(blockedUser.blockedAt).toLocaleDateString()}
                      </p>
                      {blockedUser.reason && (
                        <p className="text-xs text-gray-500 mt-1">
                          Reason: {blockedUser.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Unblock Button */}
                  <button
                    onClick={() => handleUnblock(blockedUser.id, blockedUser.name)}
                    disabled={unblocking === blockedUser.id}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FiShield className="w-4 h-4" />
                    <span>{unblocking === blockedUser.id ? 'Unblocking...' : 'Unblock'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

