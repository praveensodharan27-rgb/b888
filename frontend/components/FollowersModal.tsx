'use client';

import { useEffect, useState, useCallback } from 'react';
import { FiX, FiUser } from 'react-icons/fi';
import Link from 'next/link';
import api from '@/lib/api';
import ImageWithFallback from './ImageWithFallback';

interface User {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  isVerified: boolean;
}

interface FollowersModalProps {
  userId: string;
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
}

export default function FollowersModal({ userId, type, isOpen, onClose }: FollowersModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = type === 'followers' 
        ? `/follow/followers/${userId}?page=${page}`
        : `/follow/following/${userId}?page=${page}`;
      
      const response = await api.get(endpoint);
      
      if (response.data.success) {
        setUsers(response.data[type] || []);
        setHasMore(response.data.pagination.page < response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error(`Fetch ${type} error:`, error);
    } finally {
      setLoading(false);
    }
  }, [userId, type, page]);

  // Reset page and users when modal opens or userId/type changes
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setUsers([]);
    }
  }, [isOpen, userId, type]);

  // Fetch users when modal is open
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-48"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiUser className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600">
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/user/${user.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {user.avatar ? (
                    <ImageWithFallback
                      src={user.avatar}
                      alt={user.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-blue-600">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                    {user.bio && (
                      <p className="text-sm text-gray-600 truncate">{user.bio}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <button
              onClick={() => setPage(p => p + 1)}
              className="w-full mt-4 py-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              Load more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

