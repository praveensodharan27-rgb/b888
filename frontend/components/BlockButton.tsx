'use client';

import { useState, useEffect } from 'react';
import { FiShield, FiAlertCircle } from 'react-icons/fi';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface BlockButtonProps {
  userId: string;
  userName: string;
  onBlockChange?: (isBlocked: boolean) => void;
  className?: string;
}

export default function BlockButton({ userId, userName, onBlockChange, className = '', variant = 'button' }: BlockButtonProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    checkBlockStatus();
  }, [userId]);

  const checkBlockStatus = async () => {
    try {
      const response = await api.get(`/block/check/${userId}`);
      if (response.data.success) {
        setIsBlocked(response.data.isBlocked);
      }
    } catch (error) {
      console.error('Check block status error:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleBlock = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/block/${userId}`, { reason });
      if (response.data.success) {
        setIsBlocked(true);
        toast.success(`${userName} has been blocked`);
        if (onBlockChange) onBlockChange(true);
        setShowConfirm(false);
        setReason(''); // Clear reason after blocking
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to block user';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    setLoading(true);
    try {
      const response = await api.delete(`/block/${userId}`);
      if (response.data.success) {
        setIsBlocked(false);
        toast.success(`${userName} has been unblocked`);
        if (onBlockChange) onBlockChange(false);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to unblock user';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <button
        disabled
        className={`px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed ${className}`}
      >
        Loading...
      </button>
    );
  }

  if (isBlocked) {
    return (
      <button
        onClick={handleUnblock}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <FiShield className="w-4 h-4" />
        <span>{loading ? 'Unblocking...' : 'Unblock'}</span>
      </button>
    );
  }

  if (variant === 'menu') {
    return (
      <>
        <button
          onClick={() => setShowConfirm(true)}
          className={`flex items-center gap-2 w-full text-left ${className}`}
        >
          <FiShield className="w-4 h-4" />
          <span>Block User</span>
        </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FiAlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Block {userName}?</h3>
                <p className="text-sm text-gray-600">This action will prevent all interactions</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-3">
                When you block this user:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• They won't be able to contact you</li>
                <li>• You won't be able to contact them</li>
                <li>• Pending contact requests will be rejected</li>
                <li>• They won't be notified</li>
              </ul>
            </div>

            <div className="mb-4">
              <label htmlFor="blockReason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                id="blockReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you blocking this user?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBlock}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Blocking...' : 'Block User'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors ${className}`}
      >
        <FiShield className="w-4 h-4" />
        <span>Block</span>
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FiAlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Block {userName}?</h3>
                <p className="text-sm text-gray-600">This action will prevent all interactions</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-3">
                When you block this user:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• They won't be able to contact you</li>
                <li>• You won't be able to contact them</li>
                <li>• Pending contact requests will be rejected</li>
                <li>• They won't be notified</li>
              </ul>
            </div>

            <div className="mb-4">
              <label htmlFor="blockReason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                id="blockReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you blocking this user?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBlock}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Blocking...' : 'Block User'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

