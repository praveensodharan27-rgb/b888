'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiArrowLeft, FiCheck, FiX, FiUser, FiCheckCircle } from 'react-icons/fi';
import Link from 'next/link';
import api from '@/lib/api';
import toast from '@/lib/toast';
import ImageWithFallback from '@/components/ImageWithFallback';
import { getAdUrl } from '@/lib/directory';

interface ContactRequest {
  id: string;
  message?: string;
  createdAt: string;
  requester: {
    id: string;
    name: string;
    avatar?: string;
    isVerified: boolean;
  };
  ad?: {
    id: string;
    title: string;
    images: string[];
  };
}

export default function ContactRequestsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchRequests();
    }
  }, [user, isLoading, router]);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/contact-request/pending');
      if (response.data.success) {
        setRequests(response.data.requests);
      }
    } catch (error) {
      console.error('Fetch requests error:', error);
      toast.error('Failed to load contact requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!consentGiven[requestId]) {
      toast.error('Please check the consent box to share your contact information');
      return;
    }

    setProcessingId(requestId);
    try {
      const response = await api.post(`/contact-request/${requestId}/approve`, {
        consentGiven: true
      });
      
      if (response.data.success) {
        toast.success('Contact request approved! Chat message sent.');
        // Remove from list
        setRequests(prev => prev.filter(r => r.id !== requestId));
        
        // Optionally navigate to chat if room was created
        if (response.data.chatRoom?.id) {
          // Could navigate to chat, but let's just show success for now
        }
      } else {
        toast.error(response.data.message || 'Failed to approve request');
      }
    } catch (error: any) {
      console.error('Approve contact request error:', error);
      const message = error.response?.data?.message || 
                     error.message || 
                     'Failed to approve request. Please try again.';
      toast.error(message);
      
      // If it's a specific error about no ads, show helpful message
      if (message.includes('no active ads')) {
        toast.error('You need at least one active ad to approve contact requests. Please create an ad first.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await api.post(`/contact-request/${requestId}/reject`);
      if (response.data.success) {
        toast.success('Contact request rejected');
        // Remove from list
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reject request';
      toast.error(message);
    } finally {
      setProcessingId(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Contact Requests</h1>
          <p className="text-gray-600 mt-2">Manage requests from buyers who want to contact you</p>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiUser className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Pending Requests</h2>
            <p className="text-gray-600">
              When buyers request your contact information, they'll appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-start gap-4">
                  {/* Requester Avatar */}
                  <Link href={`/user/${request.requester.id}`} className="flex-shrink-0">
                    {request.requester.avatar ? (
                      <ImageWithFallback
                        src={request.requester.avatar}
                        alt={request.requester.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-2xl font-semibold text-blue-600">
                          {request.requester.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Request Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/user/${request.requester.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {request.requester.name}
                      </Link>
                      {request.requester.isVerified && (
                        <FiCheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Wants to contact you
                      {request.ad && ` about "${request.ad.title}"`}
                    </p>
                    {request.message && (
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg mb-3">
                        "{request.message}"
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(request.createdAt).toLocaleString()}
                    </p>

                    {/* Consent Checkbox */}
                    <div className="mt-4 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consentGiven[request.id] || false}
                          onChange={(e) => setConsentGiven(prev => ({
                            ...prev,
                            [request.id]: e.target.checked
                          }))}
                          className="mt-1"
                        />
                        <span className="text-sm text-gray-700">
                          I consent to share my contact information (phone number) with this user. 
                          They will receive it via chat message.
                        </span>
                      </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id || !consentGiven[request.id]}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiCheck className="w-4 h-4" />
                        <span>
                          {processingId === request.id ? 'Approving...' : 'Approve & Share Contact'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <FiX className="w-4 h-4" />
                        <span>{processingId === request.id ? 'Rejecting...' : 'Reject'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Related Ad */}
                  {request.ad && (
                    <Link
                      href={getAdUrl(request.ad)}
                      className="flex-shrink-0 hidden md:block"
                    >
                      {request.ad.images?.[0] && (
                        <ImageWithFallback
                          src={request.ad.images[0]}
                          alt={request.ad.title}
                          width={80}
                          height={80}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      )}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

