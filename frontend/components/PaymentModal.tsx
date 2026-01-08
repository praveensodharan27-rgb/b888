'use client';

import { useEffect, useState } from 'react';
import { FiX, FiCreditCard, FiLock, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiShield, FiZap, FiTrendingUp, FiStar, FiPackage, FiUsers, FiEye, FiLayers, FiPhone } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '@/lib/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PriceBreakdown {
  baseAdPrice?: number;
  premiumPrice?: number;
  urgentBadge?: number;
  total: number;
}

interface PackageDetails {
  name: string; // e.g., "Business Enterprise", "Business Pro", "Premium Ad"
  type?: 'BUSINESS_PACKAGE' | 'PREMIUM_AD' | 'AD_POSTING';
  packageType?: 'MAX_VISIBILITY' | 'SELLER_PLUS' | 'SELLER_PRIME';
  premiumType?: 'TOP' | 'FEATURED' | 'BUMP_UP';
  validity?: number; // Days or hours
  validityUnit?: 'days' | 'hours';
  benefits?: string[]; // Array of benefit descriptions
  adCount?: number; // Number of ads included
  visibilityLevel?: string; // e.g., "Maximum", "Enhanced", "Premium"
  adTitle?: string; // Ad title for context
  priceBreakdown?: PriceBreakdown; // Detailed price breakdown
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number; // Amount in INR (for display)
  orderId: string;
  razorpayKey: string;
  razorpayOrderAmount?: number; // Exact amount in paise from Razorpay order (optional)
  onSuccess: (paymentId: string, signature: string, orderIdFromResponse?: string) => void;
  onError?: (error: any) => void;
  description?: string;
  packageDetails?: PackageDetails;
  successAction?: {
    label: string;
    onClick: () => void;
  };
}

type PaymentState = 'summary' | 'processing' | 'success' | 'cancelled' | 'error';

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  orderId,
  razorpayKey,
  razorpayOrderAmount,
  onSuccess,
  onError,
  description = 'Complete your payment to proceed',
  packageDetails,
  successAction
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>('summary');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ qrCode: string; upiString: string; amount: string; merchantName: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrPolling, setQrPolling] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPaymentState('summary');
      setPaymentId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !razorpayLoaded) {
      // Check if Razorpay is already loaded
      if (window.Razorpay) {
        setRazorpayLoaded(true);
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          setRazorpayLoaded(true);
        });
        return;
      }

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setRazorpayLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        toast.error('Failed to load payment gateway');
        if (onError) {
          onError(new Error('Payment gateway failed to load'));
        }
      };
      
      document.head.appendChild(script);

      return () => {
        if (script.parentNode && script.parentNode === document.head) {
          document.head.removeChild(script);
        }
      };
    }
  }, [isOpen, razorpayLoaded, onError]);

  const handlePayment = () => {
    if (!window.Razorpay) {
      toast.error('Payment gateway not loaded. Please refresh and try again.');
      return;
    }

    setLoading(true);
    setPaymentState('processing');

    const amountInPaise = razorpayOrderAmount || Math.round(Number(amount) * 100);
    
    if (isNaN(amountInPaise) || amountInPaise < 100 || amountInPaise > 10000000) {
      console.error('❌ Invalid payment amount:', { amountInPaise, razorpayOrderAmount, amount });
      toast.error('Invalid payment amount. Please contact support.');
      setPaymentState('error');
      setLoading(false);
      if (onError) {
        onError(new Error(`Invalid payment amount: ${amountInPaise} paise`));
      }
      return;
    }

    console.log('💳 Initializing Razorpay payment:', {
      orderId,
      amountInINR: razorpayOrderAmount ? (razorpayOrderAmount / 100) : amount,
      amountInPaise,
    });

    const options = {
      key: razorpayKey,
      amount: amountInPaise,
      currency: 'INR',
      name: 'SellIt',
      description: description,
      order_id: orderId,
      handler: function (response: any) {
        setLoading(false);
        setPaymentId(response.razorpay_payment_id);
        setPaymentState('success');
        console.log('✅ Payment successful:', response);
        onSuccess(
          response.razorpay_payment_id, 
          response.razorpay_signature,
          response.razorpay_order_id
        );
      },
      prefill: {
        name: '',
        email: '',
        contact: ''
      },
      theme: {
        color: '#4F46E5' // Brand primary color
      },
      modal: {
        ondismiss: function() {
          setLoading(false);
          setPaymentState('cancelled');
          console.log('⚠️ Payment modal dismissed by user');
        }
      },
      'payment.error': function(error: any) {
        setLoading(false);
        setPaymentState('error');
        console.error('❌ Razorpay payment error:', error);
        let errorMessage = error.error?.description || error.error?.reason || error.error?.code || 'Payment failed. Please try again.';
        
        if (errorMessage.toLowerCase().includes('international') || errorMessage.toLowerCase().includes('not supported')) {
          errorMessage = 'International cards are not supported. Please use an Indian card.';
          toast.error(errorMessage, { duration: 6000 });
        } else {
          toast.error(errorMessage);
        }
        if (onError) {
          onError(error);
        }
      },
      'payment.cancel': function() {
        setLoading(false);
        setPaymentState('cancelled');
        console.log('⚠️ Payment cancelled by user');
      },
      'payment.failed': function(error: any) {
        setLoading(false);
        setPaymentState('error');
        console.error('❌ Payment failed:', error);
        toast.error('Payment could not be completed. Please try again.');
        if (onError) {
          onError(error);
        }
      }
    };

    try {
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      setLoading(false);
      setPaymentState('error');
      toast.error('Failed to initialize payment');
      if (onError) {
        onError(error);
      }
    }
  };

  const handleRetry = () => {
    setPaymentState('summary');
    setLoading(false);
    setShowQRCode(false);
    setQrCodeData(null);
  };

  // Generate QR code for UPI payment
  const generateQRCode = async () => {
    if (!orderId) {
      toast.error('Order ID is missing');
      return;
    }

    if (!api) {
      toast.error('API service not available');
      return;
    }

    setQrLoading(true);
    try {
      const response = await api.post('/premium/qr-code', { orderId });
      
      if (response.data.success) {
        setQrCodeData(response.data);
        setShowQRCode(true);
        startQRPolling();
        toast.success('QR code generated. Scan with any UPI app to pay.');
      } else {
        toast.error(response.data.message || 'Failed to generate QR code');
      }
    } catch (error: any) {
      console.error('QR code generation error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate QR code');
    } finally {
      setQrLoading(false);
    }
  };

  // Poll payment status when QR code is active
  const startQRPolling = () => {
    if (qrPolling) return; // Already polling
    
    setQrPolling(true);
    let pollCount = 0;
    const maxPolls = 300; // 15 minutes (300 * 3 seconds)
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      try {
        // Check payment status via payment gateway
        if (!api) {
          clearInterval(pollInterval);
          setQrPolling(false);
          return;
        }
        const response = await api.get(`/payment-gateway/order/${orderId}`);
        
        if (response.data.success && response.data.order?.status === 'paid') {
          clearInterval(pollInterval);
          setQrPolling(false);
          setPaymentState('success');
          setPaymentId(response.data.order?.paymentId || null);
          
          // Call success handler if payment ID exists
          if (response.data.order?.paymentId) {
            // For QR payments, we might not have signature, so we'll use a placeholder
            // The backend should handle verification
            onSuccess(
              response.data.order.paymentId,
              'qr_payment_signature', // Placeholder - backend should verify via webhook
              orderId
            );
          }
          
          toast.success('Payment confirmed!');
        } else if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setQrPolling(false);
          if (paymentState === 'summary' && showQRCode) {
            toast.error('QR code expired. Please generate a new one or use checkout.');
          }
        }
      } catch (error) {
        // Continue polling on error (order might not be paid yet)
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setQrPolling(false);
        }
      }
    }, 3000); // Poll every 3 seconds
  };

  const handleSuccessAction = () => {
    if (successAction) {
      successAction.onClick();
    } else {
      onClose();
    }
  };

  // Get package icon based on type
  const getPackageIcon = () => {
    if (packageDetails?.premiumType === 'TOP') return <FiStar className="w-5 h-5" />;
    if (packageDetails?.premiumType === 'FEATURED') return <FiTrendingUp className="w-5 h-5" />;
    if (packageDetails?.premiumType === 'BUMP_UP') return <FiZap className="w-5 h-5" />;
    if (packageDetails?.packageType === 'SELLER_PRIME') return <FiPackage className="w-5 h-5" />;
    if (packageDetails?.packageType === 'SELLER_PLUS') return <FiUsers className="w-5 h-5" />;
    if (packageDetails?.packageType === 'MAX_VISIBILITY') return <FiEye className="w-5 h-5" />;
    return <FiPackage className="w-5 h-5" />;
  };

  // Get package color based on type
  const getPackageColor = () => {
    if (packageDetails?.premiumType === 'TOP') return 'from-yellow-500 to-orange-500';
    if (packageDetails?.premiumType === 'FEATURED') return 'from-blue-500 to-indigo-500';
    if (packageDetails?.premiumType === 'BUMP_UP') return 'from-purple-500 to-pink-500';
    if (packageDetails?.packageType === 'SELLER_PRIME') return 'from-indigo-600 to-purple-600';
    if (packageDetails?.packageType === 'SELLER_PLUS') return 'from-blue-600 to-indigo-600';
    if (packageDetails?.packageType === 'MAX_VISIBILITY') return 'from-green-600 to-teal-600';
    return 'from-indigo-600 to-purple-600';
  };

  if (!isOpen) return null;

  // Success Screen
  if (paymentState === 'success') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
              <FiCheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-green-50">Your payment has been processed successfully</p>
          </div>
          
          <div className="p-6">
            {paymentId && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Payment ID</p>
                <p className="text-sm font-mono text-gray-700">{paymentId}</p>
              </div>
            )}
            
            {packageDetails && (
              <div className="mb-6">
                <div className={`bg-gradient-to-r ${getPackageColor()} p-4 rounded-xl text-white mb-4`}>
                  <div className="flex items-center gap-3">
                    {getPackageIcon()}
                    <div>
                      <h3 className="font-bold text-lg">{packageDetails.name}</h3>
                      {packageDetails.validity && (
                        <p className="text-sm opacity-90">
                          Valid for {packageDetails.validity} {packageDetails.validityUnit || 'days'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSuccessAction}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              {successAction?.label || 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Cancelled Screen
  if (paymentState === 'cancelled') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-400 to-red-400 p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
              <FiAlertCircle className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Cancelled</h2>
            <p className="text-orange-50">You cancelled the payment process</p>
          </div>
          
          <div className="p-6">
            <p className="text-gray-600 text-center mb-6">
              No charges were made. You can retry the payment anytime.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
              >
                Close
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  <FiRefreshCw className="w-4 h-4" />
                  Retry Payment
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error Screen
  if (paymentState === 'error') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
              <FiAlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
            <p className="text-red-50">We couldn't process your payment</p>
          </div>
          
          <div className="p-6">
            <p className="text-gray-600 text-center mb-6">
              Please check your payment details and try again. If the problem persists, contact support.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
              >
                Close
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  <FiRefreshCw className="w-4 h-4" />
                  Try Again
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Payment Summary Screen
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 my-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Complete Payment</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              disabled={loading}
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
          <p className="text-indigo-100 text-sm">{description}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Ad Title Display */}
          {packageDetails?.adTitle && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Posting Ad</p>
              <p className="font-semibold text-gray-900 line-clamp-2">{packageDetails.adTitle}</p>
            </div>
          )}

          {/* Package Summary Card */}
          {packageDetails && (
            <div className={`bg-gradient-to-br ${getPackageColor()} p-5 rounded-xl text-white shadow-lg`}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    {getPackageIcon()}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-1">{packageDetails.name}</h3>
                  {packageDetails.validity && (
                    <p className="text-sm opacity-90 mb-3">
                      Valid for {packageDetails.validity} {packageDetails.validityUnit || 'days'}
                    </p>
                  )}
                  
                  {/* Benefits List */}
                  {packageDetails.benefits && packageDetails.benefits.length > 0 && (
                    <div className="space-y-2">
                      {packageDetails.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Additional Info */}
                  <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap gap-4 text-xs">
                    {packageDetails.adCount && (
                      <div>
                        <span className="opacity-75">Ads Included:</span>
                        <span className="font-semibold ml-1">{packageDetails.adCount}</span>
                      </div>
                    )}
                    {packageDetails.visibilityLevel && (
                      <div>
                        <span className="opacity-75">Visibility:</span>
                        <span className="font-semibold ml-1">{packageDetails.visibilityLevel}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            {packageDetails?.priceBreakdown && (
              <div className="space-y-2 mb-4">
                {packageDetails.priceBreakdown.baseAdPrice !== undefined && packageDetails.priceBreakdown.baseAdPrice > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Ad Posting Fee</span>
                    <span className="text-gray-900 font-medium">₹{packageDetails.priceBreakdown.baseAdPrice.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {packageDetails.priceBreakdown.premiumPrice !== undefined && packageDetails.priceBreakdown.premiumPrice > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {packageDetails.premiumType === 'TOP' ? 'Top Ad Feature' : 
                       packageDetails.premiumType === 'FEATURED' ? 'Featured Ad Feature' : 
                       packageDetails.premiumType === 'BUMP_UP' ? 'Bump Up Feature' : 'Premium Feature'}
                    </span>
                    <span className="text-gray-900 font-medium">₹{packageDetails.priceBreakdown.premiumPrice.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {packageDetails.priceBreakdown.urgentBadge !== undefined && packageDetails.priceBreakdown.urgentBadge > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Urgent Badge</span>
                    <span className="text-gray-900 font-medium">₹{packageDetails.priceBreakdown.urgentBadge.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {(packageDetails.priceBreakdown.baseAdPrice !== undefined || 
                  packageDetails.priceBreakdown.premiumPrice !== undefined) && (
                  <div className="pt-2 border-t border-gray-300"></div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 font-medium">Total Amount</span>
              <span className="text-3xl font-bold text-indigo-600">
                ₹{amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Including all taxes</span>
                <span>GST included</span>
              </div>
            </div>
          </div>

          {/* Trust Elements */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <FiLock className="w-4 h-4 text-indigo-600" />
              <span>Secure payment by</span>
              <span className="font-bold text-indigo-600">Razorpay</span>
            </div>
            
            {/* Payment Methods Icons */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs">
                  UPI
                </div>
                <span>UPI</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <FiCreditCard className="w-8 h-8 text-gray-400" />
                <span>Cards</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <FiShield className="w-8 h-8 text-gray-400" />
                <span>Net Banking</span>
              </div>
            </div>
          </div>

          {/* Test Mode Notice */}
          {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NODE_ENV === 'development') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-yellow-800 mb-2">💡 Test Mode</p>
              <p className="text-xs text-yellow-700 mb-1">Use Indian cards only. Test card:</p>
              <p className="text-xs text-yellow-700 font-mono font-bold">4111 1111 1111 1111</p>
              <p className="text-xs text-yellow-700">CVV: Any 3 digits | Expiry: Any future date</p>
            </div>
          )}

          {/* QR Code Section - Optional UPI Payment */}
          {showQRCode && qrCodeData && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500 rounded-full mb-3">
                  <FiLayers className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-1">Scan to Pay via UPI</h3>
                <p className="text-sm text-gray-600">Use any UPI app to scan and pay</p>
              </div>
              
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-xl shadow-lg">
                  <img 
                    src={qrCodeData.qrCode} 
                    alt="UPI QR Code" 
                    className="w-64 h-64 mx-auto"
                  />
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-bold text-gray-900">₹{qrCodeData.amount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Merchant:</span>
                  <span className="font-medium text-gray-900">{qrCodeData.merchantName}</span>
                </div>
              </div>
              
              {qrPolling && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-700 mb-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                  <span>Waiting for payment confirmation...</span>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                <FiPhone className="w-4 h-4" />
                <span>Open any UPI app (GPay, PhonePe, Paytm) and scan</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Primary: Razorpay Checkout */}
            <button
              onClick={handlePayment}
              disabled={loading || !razorpayLoaded}
              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FiCreditCard className="w-5 h-5" />
                  <span>Pay with Razorpay Checkout</span>
                </>
              )}
            </button>

            {/* Optional: UPI QR Code */}
            {!showQRCode && (
              <button
                onClick={generateQRCode}
                disabled={qrLoading || loading}
                className="w-full px-4 py-3 border-2 border-green-500 text-green-700 font-semibold rounded-xl hover:bg-green-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {qrLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-600 border-t-transparent"></div>
                    <span>Generating QR...</span>
                  </>
                ) : (
                  <>
                    <FiLayers className="w-5 h-5" />
                    <span>Pay via UPI QR Code</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              disabled={loading || qrLoading}
              className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
          </div>

          {!razorpayLoaded && (
            <p className="text-xs text-gray-500 text-center">
              Loading payment gateway...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
