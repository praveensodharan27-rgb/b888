'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { FiShield, FiAlertTriangle, FiCheck, FiX, FiRefreshCw, FiEye, FiBarChart2 } from 'react-icons/fi';
import Image from 'next/image';
import Link from 'next/link';

interface ModerationStats {
  totalAds: number;
  autoApproved: number;
  autoRejected: number;
  manualPending: number;
  flaggedAds: number;
  autoApprovalRate: string;
  rejectionRate: string;
  rejectionCategories: Record<string, number>;
  recentRejections: any[];
}

interface FlaggedAd {
  id: string;
  title: string;
  description: string;
  images: string[];
  status: string;
  moderationStatus: string;
  autoRejected: boolean;
  rejectionReason: string | null;
  moderationFlags: any;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email?: string;
  };
  category: {
    name: string;
  };
}

export default function ContentModerationAdmin() {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const [statistics, setStatistics] = useState<ModerationStats | null>(null);
  const [flaggedAds, setFlaggedAds] = useState<FlaggedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'statistics' | 'flagged'>('statistics');
  const [filterType, setFilterType] = useState<'all' | 'auto-rejected' | 'flagged'>('all');

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, isLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchStatistics();
      fetchFlaggedAds();
    }
  }, [isAdmin, filterType]);

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/moderation/statistics');
      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlaggedAds = async () => {
    try {
      const response = await api.get(`/moderation/flagged-ads?type=${filterType}&limit=20`);
      if (response.data.success) {
        setFlaggedAds(response.data.ads);
      }
    } catch (error: any) {
      console.error('Error fetching flagged ads:', error);
    }
  };

  const handleRemoderate = async (adId: string) => {
    setProcessing(adId);
    try {
      const response = await api.post(`/moderation/ads/${adId}/remoderate`);
      if (response.data.success) {
        toast.success('Ad re-moderated successfully');
        fetchStatistics();
        fetchFlaggedAds();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to re-moderate ad');
    } finally {
      setProcessing(null);
    }
  };

  const handleApprove = async (adId: string) => {
    setProcessing(adId);
    try {
      const response = await api.put(`/admin/ads/${adId}/status`, {
        status: 'APPROVED'
      });
      if (response.data.success) {
        toast.success('Ad approved successfully');
        fetchStatistics();
        fetchFlaggedAds();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve ad');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (adId: string, reason: string) => {
    setProcessing(adId);
    try {
      const response = await api.put(`/admin/ads/${adId}/status`, {
        status: 'REJECTED',
        reason
      });
      if (response.data.success) {
        toast.success('Ad rejected successfully');
        fetchStatistics();
        fetchFlaggedAds();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject ad');
    } finally {
      setProcessing(null);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <FiShield className="w-8 h-8 text-primary-600" />
          Content Moderation
        </h1>
        <p className="text-gray-600">AI-powered content moderation for ads</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('statistics')}
          className={`pb-4 px-4 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'statistics'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiBarChart2 className="w-5 h-5" />
          Statistics
        </button>
        <button
          onClick={() => setActiveTab('flagged')}
          className={`pb-4 px-4 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'flagged'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiAlertTriangle className="w-5 h-5" />
          Flagged Ads {flaggedAds.length > 0 && `(${flaggedAds.length})`}
        </button>
      </div>

      {/* Statistics Tab */}
      {activeTab === 'statistics' && statistics && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Ads</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totalAds}</p>
                </div>
                <FiShield className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Auto-Approved</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.autoApproved}</p>
                  <p className="text-xs text-gray-500 mt-1">{statistics.autoApprovalRate}</p>
                </div>
                <FiCheck className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Auto-Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{statistics.autoRejected}</p>
                  <p className="text-xs text-gray-500 mt-1">{statistics.rejectionRate}</p>
                </div>
                <FiX className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pending Review</p>
                  <p className="text-2xl font-bold text-orange-600">{statistics.manualPending}</p>
                </div>
                <FiAlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Rejection Categories */}
          {Object.keys(statistics.rejectionCategories).length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Rejection Categories</h2>
              <div className="space-y-3">
                {Object.entries(statistics.rejectionCategories).map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center pb-3 border-b border-gray-100 last:border-0">
                    <span className="font-medium text-gray-900 capitalize">{category.replace(/_/g, ' ')}</span>
                    <span className="text-gray-500 font-medium">{count} ads</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Rejections */}
          {statistics.recentRejections.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Auto-Rejections</h2>
              <div className="space-y-4">
                {statistics.recentRejections.map((ad) => (
                  <div key={ad.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{ad.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">By: {ad.user.name}</p>
                        <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                          <FiAlertTriangle className="w-4 h-4" />
                          {ad.rejectionReason}
                        </p>
                      </div>
                      <Link
                        href={`/ads/${ad.id}`}
                        target="_blank"
                        className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FiEye className="w-4 h-4" />
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Flagged Ads Tab */}
      {activeTab === 'flagged' && (
        <div className="space-y-6">
          {/* Filter */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-64"
            >
              <option value="all">All Flagged</option>
              <option value="auto-rejected">Auto-Rejected</option>
              <option value="flagged">Flagged for Review</option>
            </select>
          </div>

          {/* Flagged Ads List */}
          {flaggedAds.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
              <FiCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Flagged Ads</h3>
              <p className="text-gray-600">All ads are clean! Great job on content quality.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {flaggedAds.map((ad) => (
                <div key={ad.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex gap-4">
                    {/* Image */}
                    {ad.images && ad.images.length > 0 && (
                      <div className="flex-shrink-0 w-32 h-32 relative rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={ad.images[0]}
                          alt={ad.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{ad.title}</h3>
                          <p className="text-sm text-gray-600">By: {ad.user.name} ({ad.user.email || 'No email'})</p>
                          <p className="text-sm text-gray-500">Category: {ad.category.name}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          ad.autoRejected 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {ad.autoRejected ? 'Auto-Rejected' : 'Flagged'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">{ad.description}</p>

                      {/* Rejection Reason */}
                      {ad.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                          <p className="text-sm text-red-800 flex items-center gap-2">
                            <FiAlertTriangle className="w-4 h-4" />
                            <strong>Reason:</strong> {ad.rejectionReason}
                          </p>
                        </div>
                      )}

                      {/* Flagged Categories */}
                      {ad.moderationFlags?.flaggedCategories && ad.moderationFlags.flaggedCategories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {ad.moderationFlags.flaggedCategories.map((category: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {category.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Link
                          href={`/ads/${ad.id}`}
                          target="_blank"
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors text-sm"
                        >
                          <FiEye className="w-4 h-4" />
                          View Ad
                        </Link>

                        <button
                          onClick={() => handleRemoderate(ad.id)}
                          disabled={processing === ad.id}
                          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg flex items-center gap-2 hover:bg-blue-200 transition-colors disabled:bg-gray-100 disabled:text-gray-400 text-sm"
                        >
                          <FiRefreshCw className={`w-4 h-4 ${processing === ad.id ? 'animate-spin' : ''}`} />
                          Re-Moderate
                        </button>

                        <button
                          onClick={() => handleApprove(ad.id)}
                          disabled={processing === ad.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors disabled:bg-gray-400 text-sm"
                        >
                          <FiCheck className="w-4 h-4" />
                          Approve
                        </button>

                        <button
                          onClick={() => {
                            const reason = prompt('Enter rejection reason (optional):');
                            if (reason !== null) {
                              handleReject(ad.id, reason || ad.rejectionReason || 'Content policy violation');
                            }
                          }}
                          disabled={processing === ad.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors disabled:bg-gray-400 text-sm"
                        >
                          <FiX className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

