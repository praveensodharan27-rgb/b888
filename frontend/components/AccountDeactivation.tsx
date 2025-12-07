'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiAlertTriangle, FiXCircle, FiCheckCircle, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function AccountDeactivation() {
  const { logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const { data: status, isLoading } = useQuery({
    queryKey: ['user', 'deactivation-status'],
    queryFn: async () => {
      const response = await api.get('/user/deactivation-status');
      return response.data;
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/user/deactivate');
      return response.data;
    },
    onSuccess: () => {
      toast.success('Account deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['user', 'deactivation-status'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      setShowConfirm(false);
      setConfirmText('');
      // Logout user after deactivation
      setTimeout(() => {
        logout();
        router.push('/');
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate account');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/user/reactivate');
      return response.data;
    },
    onSuccess: () => {
      toast.success('Account reactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['user', 'deactivation-status'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reactivate account');
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const isDeactivated = status?.isDeactivated || false;
  const daysRemaining = status?.daysRemaining;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-4">
        <FiAlertTriangle className="w-6 h-6 text-red-600" />
        <h3 className="text-lg font-semibold text-gray-900">Account Deactivation</h3>
      </div>

      {isDeactivated ? (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FiClock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900 mb-1">Account Deactivated</p>
                <p className="text-sm text-yellow-800">
                  Your account has been deactivated. It will be permanently deleted after 7 days.
                </p>
                {daysRemaining !== null && daysRemaining > 0 && (
                  <p className="text-sm font-semibold text-yellow-900 mt-2">
                    {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining before permanent deletion
                  </p>
                )}
                {daysRemaining !== null && daysRemaining === 0 && (
                  <p className="text-sm font-semibold text-red-600 mt-2">
                    Account will be deleted today
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <FiCheckCircle className="w-5 h-5" />
            {reactivateMutation.isPending ? 'Reactivating...' : 'Reactivate Account'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 mb-2">
              <strong>Warning:</strong> Deactivating your account will:
            </p>
            <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
              <li>Prevent you from logging in</li>
              <li>Hide all your ads from public view</li>
              <li>Schedule your account for permanent deletion after 7 days</li>
              <li>Allow you to reactivate within the 7-day period</li>
            </ul>
          </div>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <FiXCircle className="w-5 h-5" />
              Deactivate Account
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <strong>DEACTIVATE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DEACTIVATE"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deactivateMutation.mutate()}
                  disabled={confirmText !== 'DEACTIVATE' || deactivateMutation.isPending}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deactivateMutation.isPending ? 'Deactivating...' : 'Confirm Deactivation'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

