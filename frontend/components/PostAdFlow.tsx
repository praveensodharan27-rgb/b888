'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiCheckCircle, FiX, FiEye, FiTrendingUp, FiLoader, FiAlertCircle } from 'react-icons/fi';
import toast from '@/lib/toast';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

// Lazy load PaymentModal
const PaymentModal = dynamic(() => import('@/components/PaymentModal'), {
  loading: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <p className="text-gray-700">Loading payment gateway...</p>
        </div>
      </div>
    </div>
  ),
  ssr: false
});

type FlowStep = 'form' | 'payment' | 'success';

interface PostAdFlowProps {
  onClose?: () => void;
  initialData?: Partial<AdFormData>;
}

interface AdFormData {
  title: string;
  description: string;
  price: number;
  categoryId: string;
  subcategoryId: string;
  locationId: string;
  condition?: string;
  images?: File[];
}

interface PaymentOrderResponse {
  success: boolean;
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  razorpayKey: string;
}

export default function PostAdFlow({ onClose, initialData }: PostAdFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<FlowStep>('form');
  const [adId, setAdId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AdFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    categoryId: initialData?.categoryId || '',
    subcategoryId: initialData?.subcategoryId || '',
    locationId: initialData?.locationId || '',
    condition: initialData?.condition || 'new',
    images: initialData?.images || []
  });

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrderResponse | null>(null);

  // Form submission loading
  const [submitting, setSubmitting] = useState(false);

  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.categoryId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price.toString());
      formDataToSend.append('categoryId', formData.categoryId);
      formDataToSend.append('subcategoryId', formData.subcategoryId);
      formDataToSend.append('locationId', formData.locationId);
      if (formData.condition) {
        formDataToSend.append('condition', formData.condition);
      }

      // Append images
      if (formData.images && formData.images.length > 0) {
        formData.images.forEach((image) => {
          formDataToSend.append('images', image);
        });
      }

      // Submit ad
      const response = await api.post('/ads', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success && response.data.ad) {
        const createdAdId = response.data.ad.id;
        setAdId(createdAdId);
        toast.success('Ad created successfully!');

        // Create payment order
        await createPaymentOrder(createdAdId);
      } else {
        toast.error(response.data.message || 'Failed to create ad');
      }
    } catch (error: any) {
      console.error('Error creating ad:', error);
      toast.error(error.response?.data?.message || 'Failed to create ad');
    } finally {
      setSubmitting(false);
    }
  };

  // Create payment order
  const createPaymentOrder = async (adIdParam: string) => {
    setPaymentLoading(true);

    try {
      const response = await api.post('/premium/ad-posting/order', {
        adId: adIdParam,
        packageType: 'NORMAL' // or get from form
      });

      if (response.data.success) {
        setPaymentOrder(response.data);
        setCurrentStep('payment');
        setPaymentModalOpen(true);
      } else {
        toast.error(response.data.message || 'Failed to create payment order');
      }
    } catch (error: any) {
      console.error('Error creating payment order:', error);
      toast.error(error.response?.data?.message || 'Failed to create payment order');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentId: string, signature: string, orderIdFromResponse?: string) => {
    try {
      // Verify payment
      const response = await api.post('/premium/ad-posting/verify', {
        orderId: paymentOrder?.orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        razorpayOrderId: orderIdFromResponse || paymentOrder?.razorpayOrderId
      });

      if (response.data.success) {
        setPaymentModalOpen(false);
        setCurrentStep('success');
        toast.success('Payment successful! Your ad is now live.');
      } else {
        toast.error(response.data.message || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast.error(error.response?.data?.message || 'Payment verification failed');
    }
  };

  // Handle payment error
  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    toast.error('Payment failed. Please try again.');
  };

  // Handle view ad
  const handleViewAd = () => {
    if (adId) {
      router.push(`/ads/${adId}`);
    }
  };

  // Handle boost ad
  const handleBoostAd = () => {
    if (adId) {
      router.push(`/premium?adId=${adId}`);
    }
  };

  // Render form step
  const renderFormStep = () => (
    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Post Your Ad</h2>
          <p className="text-primary-50 text-sm">Fill in the details to get started</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-xl p-2.5 transition-all"
            type="button"
            aria-label="Close"
          >
            <FiX className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleFormSubmit} className="p-8 space-y-6 bg-gradient-to-b from-gray-50 to-white">
        {/* Title */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Ad Title <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., iPhone 13 Pro Max 256GB - Like New"
            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white text-gray-900 placeholder:text-gray-400 font-medium"
            required
          />
          <p className="text-xs text-gray-500 mt-1.5">Make it descriptive and specific</p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Description <span className="text-error">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your item in detail... Include condition, features, and any other relevant information."
            rows={5}
            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none bg-white text-gray-900 placeholder:text-gray-400 leading-relaxed"
            required
          />
          <p className="text-xs text-gray-500 mt-1.5">Provide as much detail as possible</p>
        </div>

        {/* Price */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Price (₹) <span className="text-error">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-lg">₹</span>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              placeholder="0"
              min="0"
              className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white text-gray-900 placeholder:text-gray-400 font-semibold text-lg"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">Set a competitive price</p>
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Condition
          </label>
          <select
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white text-gray-900 font-medium cursor-pointer"
          >
            <option value="new">Brand New</option>
            <option value="like-new">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
          </select>
          <p className="text-xs text-gray-500 mt-1.5">Be honest about the condition</p>
        </div>

        {/* Info Box */}
        <div className="bg-primary-50 border-2 border-primary-100 rounded-xl p-4 flex gap-3">
          <FiAlertCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-primary-900 mb-1">Quick Tip</p>
            <p className="text-primary-700 leading-relaxed">
              Ads with clear titles, detailed descriptions, and accurate pricing get 3x more responses!
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all text-base"
              disabled={submitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-4 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Creating Ad...
              </>
            ) : (
              <>
                Continue to Payment
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  // Render payment loading
  const renderPaymentLoading = () => (
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-10 border border-gray-100">
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary-200 border-t-primary-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FiLoader className="w-8 h-8 text-primary-500" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold text-gray-900">Preparing Payment</h3>
          <p className="text-gray-600 text-base">Please wait while we set up your secure payment...</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>Secure payment gateway</span>
        </div>
      </div>
    </div>
  );

  // Render success step
  const renderSuccessStep = () => (
    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-gray-100">
      {/* Success Header */}
      <div className="bg-gradient-to-br from-success to-green-600 p-10 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-20" />
        <div className="relative">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-5 shadow-xl">
            <FiCheckCircle className="w-14 h-14 text-success" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">Success!</h2>
          <p className="text-green-50 text-lg">Your ad is now live</p>
        </div>
      </div>

      {/* Success Content */}
      <div className="p-8 space-y-5 bg-gradient-to-b from-gray-50 to-white">
        <div className="bg-primary-50 border-2 border-primary-100 rounded-xl p-5 text-center">
          <p className="text-sm font-semibold text-primary-600 mb-2">Ad ID</p>
          <p className="text-xl font-mono font-bold text-primary-900">{adId}</p>
        </div>

        <div className="space-y-3">
          {/* View Ad Button */}
          <button
            onClick={handleViewAd}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl text-base group"
          >
            <FiEye className="w-5 h-5 group-hover:scale-110 transition-transform" />
            View Your Ad
          </button>

          {/* Boost Ad Button */}
          <button
            onClick={handleBoostAd}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-secondary-500 text-white font-bold rounded-xl hover:bg-secondary-600 transition-all shadow-lg hover:shadow-xl text-base group"
          >
            <FiTrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Boost Your Ad
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-info-bg border-2 border-info/20 rounded-xl p-5 flex gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-info/10 rounded-full flex items-center justify-center">
            <FiAlertCircle className="w-5 h-5 text-info" />
          </div>
          <div className="text-sm">
            <p className="font-bold text-gray-900 mb-2 text-base">What's Next?</p>
            <p className="text-gray-700 leading-relaxed">
              Your ad is now live and visible to thousands of buyers. Boost it to appear at the top and sell 3x faster!
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary-600">24h</p>
            <p className="text-xs text-gray-600 mt-1">Active</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-success">0</p>
            <p className="text-xs text-gray-600 mt-1">Views</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-secondary-600">0</p>
            <p className="text-xs text-gray-600 mt-1">Inquiries</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn">
      {/* Form Step */}
      {currentStep === 'form' && (
        <div className="animate-fade-in-scale">
          {renderFormStep()}
        </div>
      )}

      {/* Payment Loading */}
      {currentStep === 'payment' && paymentLoading && (
        <div className="animate-fade-in-scale">
          {renderPaymentLoading()}
        </div>
      )}

      {/* Payment Modal */}
      {currentStep === 'payment' && !paymentLoading && paymentOrder && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setCurrentStep('form');
          }}
          amount={paymentOrder.amount}
          orderId={paymentOrder.razorpayOrderId}
          razorpayKey={paymentOrder.razorpayKey}
          razorpayOrderAmount={paymentOrder.amount * 100}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          description="Complete payment to publish your ad"
          packageDetails={{
            name: 'Standard Ad Posting',
            type: 'AD_POSTING',
            validity: 30,
            validityUnit: 'days',
            benefits: [
              'Visible to all buyers',
              'Active for 30 days',
              'Edit anytime',
              'Boost available'
            ]
          }}
        />
      )}

      {/* Success Step */}
      {currentStep === 'success' && (
        <div className="animate-fade-in-scale">
          {renderSuccessStep()}
        </div>
      )}
    </div>
  );
}
