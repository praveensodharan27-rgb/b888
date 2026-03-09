'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiCopy, FiShare2, FiUsers, FiDollarSign, FiCheck } from 'react-icons/fi';
import { useState } from 'react';
import toast from '@/lib/toast';

export default function ReferralDashboard() {
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['referral', 'my-referral'],
    queryFn: async () => {
      try {
        const response = await api.get('/referral/my-referral');
        if (response.data.success) {
          return response.data;
        }
        throw new Error(response.data.message || 'Failed to fetch referral info');
      } catch (err: any) {
        console.error('Referral API error:', err);
        throw err;
      }
    },
    retry: 1,
  });

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <p>Failed to load referral information. Please try again later.</p>
        </div>
      </div>
    );
  }

  const copyReferralLink = () => {
    if (data?.referralLink) {
      navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareReferralLink = async () => {
    if (data?.referralLink) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Join and Get Rewards!',
            text: `Sign up using my referral code and we both get rewards! Use code: ${data.referralCode}`,
            url: data.referralLink
          });
        } catch (error) {
          // User cancelled or error occurred
          console.log('Share cancelled');
        }
      } else {
        copyReferralLink();
      }
    }
  };

  // Debug logging
  if (process.env.NODE_ENV === 'development' && data) {
    console.log('Referral data:', data);
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Referral Program</h2>
        <p className="text-gray-600">
          Share your referral code and earn ₹{data?.rewardAmount || 50} for each friend who signs up!
        </p>
      </div>

      {/* Referral Code Card */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-90 mb-1">Your Referral Code</p>
            <p className="text-3xl font-bold font-mono">{data?.referralCode || 'LOADING'}</p>
          </div>
          <div className="bg-white/20 rounded-full p-3">
            <FiUsers className="w-8 h-8" />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyReferralLink}
            className="flex-1 bg-white text-primary-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            {copied ? <FiCheck className="w-5 h-5" /> : <FiCopy className="w-5 h-5" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={shareReferralLink}
            className="flex-1 bg-white/20 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
          >
            <FiShare2 className="w-5 h-5" />
            Share
          </button>
        </div>
      </div>

      {/* Referral Link */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Referral Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={data?.referralLink || ''}
            readOnly
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
          />
          <button
            onClick={copyReferralLink}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FiCopy className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <FiUsers className="w-5 h-5" />
            <p className="text-sm">Total Referrals</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data?.stats?.totalReferrals || 0}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <FiDollarSign className="w-5 h-5" />
            <p className="text-sm">Total Earnings</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{data?.stats?.totalEarnings || 0}</p>
        </div>
        <div className="bg-primary-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-primary-600 mb-1">
            <FiCheck className="w-5 h-5" />
            <p className="text-sm">Completed</p>
          </div>
          <p className="text-2xl font-bold text-primary-600">{data?.stats?.completedReferrals || 0}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <FiDollarSign className="w-5 h-5" />
            <p className="text-sm">Wallet Balance</p>
          </div>
          <p className="text-2xl font-bold text-green-600">₹{data?.stats?.walletBalance || 0}</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Share your referral code or link with friends</li>
          <li>When they sign up using your code, you both get rewarded</li>
          <li>Earn ₹{data?.rewardAmount || 50} for each successful referral</li>
          <li>Rewards are credited directly to your wallet</li>
        </ol>
      </div>
    </div>
  );
}

