'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiBriefcase, FiCheckCircle, FiXCircle, FiCreditCard, FiCalendar, FiStar, FiTrendingUp, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';

// Lazy load PaymentModal (heavy component with Razorpay SDK)
const PaymentModal = dynamic(() => import('@/components/PaymentModal'), {
  loading: () => null,
  ssr: false
});

export default function BusinessPackagePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [selectedPackageType, setSelectedPackageType] = useState<string | null>(null);

  // Redirect if not authenticated (with a small delay to show loading state)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const timer = setTimeout(() => {
        router.push('/login');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, authLoading, router]);

  // Get business package info (all packages)
  const { data: packagesData, isLoading: isLoadingInfo, error: packagesError } = useQuery({
    queryKey: ['business-package', 'info'],
    queryFn: async () => {
      try {
        const response = await api.get('/business-package/info');
        console.log('Business package response:', response.data);
        if (response.data.success && response.data.packages) {
          return response.data.packages;
        }
        throw new Error(response.data.message || 'Invalid response format');
      } catch (error: any) {
        console.error('Error fetching business packages:', error);
        throw error;
      }
    },
    retry: 2,
  });

  // Get user's business package status
  const { data: packageStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['business-package', 'status'],
    queryFn: async () => {
      const response = await api.get('/business-package/status');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  // Create order mutation
  const createOrder = useMutation({
    mutationFn: async (packageType: string) => {
      const response = await api.post('/business-package/order', { packageType });
      return response.data;
    },
    onSuccess: (data) => {
      setPaymentOrder(data);
      setShowPaymentModal(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create order');
    },
  });

  // Verify payment mutation
  const verifyPayment = useMutation({
    mutationFn: async (data: { orderId: string; paymentId: string; signature: string }) => {
      const response = await api.post('/business-package/verify', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Business package activated successfully!');
      setShowPaymentModal(false);
      setPaymentOrder(null);
      setSelectedPackageType(null);
      refetchStatus();
      // Invalidate ad limit status to refresh it after package purchase
      queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
      // Redirect to post-ad page after a short delay to show updated limit
      setTimeout(() => {
        router.push('/post-ad');
      }, 1500);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Payment verification failed');
    },
  });

  const handlePurchase = (packageType: string) => {
    // Allow users to purchase new packages regardless of existing package status
    // Packages will stack/queue and provide additional premium slots
    setSelectedPackageType(packageType);
    createOrder.mutate(packageType);
  };

  const handlePaymentSuccess = (paymentId: string, signature: string, orderId?: string) => {
    if (!paymentOrder?.order?.razorpayOrderId) {
      toast.error('Order information missing');
      return;
    }

    verifyPayment.mutate({
      orderId: orderId || paymentOrder.order.razorpayOrderId,
      paymentId,
      signature,
    });
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    toast.error('Payment failed. Please try again.');
  };

  if (authLoading || isLoadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please login to view business packages</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (packagesError) {
    const errorMessage = packagesError instanceof Error 
      ? packagesError.message 
      : (packagesError as any)?.response?.data?.message || 'Failed to load business packages';
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-2 font-semibold">Failed to load business packages</p>
          <p className="text-gray-600 mb-4 text-sm">{errorMessage}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 mr-2"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
            >
              Go Home
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(packagesError, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  if (!packagesData || packagesData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No business packages available</p>
        </div>
      </div>
    );
  }

  const hasActivePackage = packageStatus?.hasActivePackage;
  const activePackage = packageStatus?.package;

  const packageIcons = {
    MAX_VISIBILITY: FiZap,
    SELLER_PLUS: FiTrendingUp,
    SELLER_PRIME: FiStar,
  };

  const packageColors = {
    MAX_VISIBILITY: 'from-blue-500 to-blue-600',
    SELLER_PLUS: 'from-purple-500 to-purple-600',
    SELLER_PRIME: 'from-yellow-500 to-yellow-600',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Business Packages</h1>
          <p className="text-gray-600">Choose the perfect package for your business needs</p>
        </div>

        {/* Active Package Status */}
        {hasActivePackage && activePackage && (
          <div className="mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <FiCheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-green-800 mb-3">
                    Active Business Package{packageStatus?.packages && packageStatus.packages.length > 1 ? `s (${packageStatus.packages.length})` : ''}
                  </h3>
                  <div className="space-y-2 text-green-700">
                    {packageStatus?.packages && packageStatus.packages.length > 1 ? (
                      <p className="mb-3">
                        <strong>You have {packageStatus.packages.length} active packages.</strong> Purchasing additional packages will add more premium slots.
                      </p>
                    ) : (
                      <>
                        <p>
                          <strong>Package:</strong> {activePackage.packageType?.replace('_', ' ')}
                        </p>
                        <p>
                          <strong>Started:</strong>{' '}
                          {activePackage.startDate
                            ? format(new Date(activePackage.startDate), 'MMMM dd, yyyy')
                            : 'N/A'}
                        </p>
                        <p>
                          <strong>Expires:</strong>{' '}
                          {activePackage.expiresAt
                            ? format(new Date(activePackage.expiresAt), 'MMMM dd, yyyy')
                            : 'N/A'}
                        </p>
                      </>
                    )}
                    {packageStatus?.premiumSlotsTotal !== undefined && (
                      <p>
                        <strong>Premium Slots:</strong> {packageStatus.premiumSlotsUsed || 0} / {packageStatus.premiumSlotsTotal} used
                      </p>
                    )}
                    {activePackage.maxAds && (
                      <p>
                        <strong>Ad Limit:</strong> {activePackage.maxAds} ads (deprecated - use premium slots)
                      </p>
                    )}
                    <p className="text-sm mt-4 text-green-800 font-medium">
                      💡 You can purchase additional packages to get more premium ad slots. Packages stack and provide cumulative benefits.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Package Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {packagesData?.map((pkg: any) => {
            const Icon = packageIcons[pkg.type as keyof typeof packageIcons] || FiBriefcase;
            const gradient = packageColors[pkg.type as keyof typeof packageColors] || 'from-gray-500 to-gray-600';
            const isPopular = pkg.type === 'SELLER_PLUS';

            return (
              <div
                key={pkg.type}
                className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                  isPopular ? 'ring-2 ring-primary-500 transform scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="bg-primary-600 text-white text-center py-1 text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <div className={`bg-gradient-to-r ${gradient} text-white p-6`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-8 h-8" />
                    <h3 className="text-2xl font-bold">{pkg.name}</h3>
                  </div>
                  <p className="text-white/90 text-sm">{pkg.description}</p>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-4xl font-bold text-gray-900">
                        ₹{pkg.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-gray-500">/ {pkg.duration} days</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiCheckCircle className="w-5 h-5 text-green-500" />
                      <span>Up to {pkg.maxAds || 0} ads allowed</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiCheckCircle className="w-5 h-5 text-green-500" />
                      <span>Premium features for all ads</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiCheckCircle className="w-5 h-5 text-green-500" />
                      <span>Maximum visibility</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiCheckCircle className="w-5 h-5 text-green-500" />
                      <span>Priority support</span>
                    </div>
                    {pkg.type === 'SELLER_PRIME' && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FiCheckCircle className="w-5 h-5 text-green-500" />
                        <span>All premium features included</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg.type)}
                    disabled={createOrder.isPending}
                    className="w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiCreditCard className="w-5 h-5" />
                    {createOrder.isPending ? 'Processing...' : hasActivePackage ? 'Purchase Additional Package' : 'Purchase Now'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && paymentOrder && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setPaymentOrder(null);
              setSelectedPackageType(null);
            }}
            amount={paymentOrder.order.amount}
            orderId={paymentOrder.razorpayOrder.id}
            razorpayKey={paymentOrder.razorpayOrder.key}
            razorpayOrderAmount={paymentOrder.razorpayOrder.amount}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            description={`Complete payment to activate your ${selectedPackageType?.replace('_', ' ') || 'Business'} Package`}
          />
        )}
      </div>
    </div>
  );
}
