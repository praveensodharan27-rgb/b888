'use client';

import { useEffect, useRef, useState } from 'react';
import { FiX, FiCreditCard, FiLock, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiShield, FiZap, FiTrendingUp, FiStar, FiPackage, FiUsers, FiEye, FiLayers, FiPhone, FiInfo } from 'react-icons/fi';
import toast from '@/lib/toast';
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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [cardholderName, setCardholderName] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ qrCode: string; upiString: string; amount: string; merchantName: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrPolling, setQrPolling] = useState(false);
  const qrPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI display values (screenshot-style)
  const TAX_RATE = 0.18; // 18%
  const serviceFee = 0;
  const subtotal = Math.max(0, (Number(amount) || 0) / (1 + TAX_RATE));
  const taxAmount = Math.max(0, (Number(amount) || 0) - subtotal);
  const formatMoney = (v: number) =>
    `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handlePayNow = async () => {
    // Complete payment based on selected option (same page/modal)
    if (paymentMethod === 'upi') {
      if (!showQRCode) {
        setPaymentState('processing');
        await generateQRCode();
      } else {
        toast.info('Waiting for UPI payment confirmation...');
      }
      return;
    }

    // Card + NetBanking are handled via Razorpay Checkout overlay (no page navigation)
    handlePayment();
  };

  const stopQRPolling = () => {
    if (qrPollIntervalRef.current) {
      clearInterval(qrPollIntervalRef.current);
      qrPollIntervalRef.current = null;
    }
    setQrPolling(false);
  };

  const handleClose = () => {
    stopQRPolling();
    setShowQRCode(false);
    setQrCodeData(null);
    setQrLoading(false);
    setLoading(false);
    setPaymentState('summary');
    onClose();
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPaymentState('summary');
      setPaymentId(null);
      setPaymentMethod('card');
      setCardholderName('');
      setShowQRCode(false);
      setQrCodeData(null);
      stopQRPolling();
    }
  }, [isOpen]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopQRPolling();
  }, []);

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
      name: 'Sell Box',
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
        name: cardholderName || '',
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
    stopQRPolling();
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
      stopQRPolling();
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
    if (qrPollIntervalRef.current) return; // already polling
    setQrPolling(true);
    let pollCount = 0;
    const maxPolls = 300; // 15 minutes (300 * 3 seconds)
    
    qrPollIntervalRef.current = setInterval(async () => {
      pollCount++;
      
      try {
        // Check payment status via payment gateway
        if (!api) {
          stopQRPolling();
          return;
        }
        const response = await api.get(`/payment-gateway/order/${orderId}`);
        
        if (response.data.success && response.data.order?.status === 'paid') {
          stopQRPolling();
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
          stopQRPolling();
          if (paymentState === 'summary' && showQRCode) {
            toast.error('QR code expired. Please generate a new one or use checkout.');
          }
        }
      } catch (error) {
        // Continue polling on error (order might not be paid yet)
        if (pollCount >= maxPolls) {
          stopQRPolling();
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-4 my-6 overflow-hidden">
        {/* Top header (breadcrumb + title) */}
        <div className="border-b border-gray-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="mt-1 text-xl font-extrabold text-gray-900">Complete Your Payment</h2>
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              disabled={loading}
              aria-label="Close"
              type="button"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-6 bg-gray-50 p-6 lg:grid-cols-12">
          {/* Left: Order Summary */}
          <div className="lg:col-span-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-extrabold text-gray-900">Order Summary</div>

              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FiPackage className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">
                    {packageDetails?.name || 'Payment'}
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {packageDetails?.type === 'BUSINESS_PACKAGE'
                      ? 'Business package for classified listings.'
                      : packageDetails?.type === 'PREMIUM_AD'
                        ? 'Boost your ad visibility with premium placement.'
                        : 'Standard visibility package for classified listings.'}
                  </div>
                  {packageDetails?.validity ? (
                    <div className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-700">
                      {packageDetails.validity} {packageDetails.validityUnit || 'days'}
                    </div>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-blue-600">{formatMoney(Number(amount) || 0)}</div>
                </div>
              </div>

              <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Service Fee</span>
                  <span className="text-gray-900">{formatMoney(serviceFee)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tax (18%)</span>
                  <span className="text-gray-900">{formatMoney(taxAmount)}</span>
                </div>
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="font-bold text-gray-900">Total Amount</span>
                  <span className="text-lg font-extrabold text-blue-600">
                    {formatMoney(Number(amount) || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-[11px] font-extrabold tracking-widest text-gray-500">SECURE PAYMENT PARTNER</div>
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                <FiLock className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">Razorpay</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">256-bit SSL</span>
              </div>
              <div className="mt-4 flex items-center gap-3 text-gray-500">
                <FiShield className="h-5 w-5" />
                <FiCheckCircle className="h-5 w-5" />
                <FiCreditCard className="h-5 w-5" />
                <FiLayers className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Transactions are secured with industry-standard encryption. We do not store your full card details.
              </p>
            </div>
          </div>

          {/* Right: Payment Method */}
          <div className="lg:col-span-8">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-extrabold text-gray-900">Select Payment Method</div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('card');
                    setShowQRCode(false);
                    setQrCodeData(null);
                    stopQRPolling();
                  }}
                  className={[
                    'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors',
                    paymentMethod === 'card'
                      ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200'
                      : 'text-gray-600 hover:text-gray-800',
                  ].join(' ')}
                >
                  <FiCreditCard className="h-4 w-4" />
                  Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={[
                    'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors',
                    paymentMethod === 'upi'
                      ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200'
                      : 'text-gray-600 hover:text-gray-800',
                  ].join(' ')}
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-blue-600 text-[10px] font-extrabold text-white">
                    QR
                  </span>
                  UPI / QR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('netbanking');
                    setShowQRCode(false);
                    setQrCodeData(null);
                    stopQRPolling();
                  }}
                  className={[
                    'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors',
                    paymentMethod === 'netbanking'
                      ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200'
                      : 'text-gray-600 hover:text-gray-800',
                  ].join(' ')}
                >
                  <FiShield className="h-4 w-4" />
                  Net Banking
                </button>
              </div>

              {/* Form (UI only) */}
              <div className="mt-6 space-y-4">
                {paymentMethod === 'card' ? (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-gray-700">Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700">Card Number</label>
                      <div className="relative mt-2">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                          <FiCreditCard className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="0000 0000 0000 0000"
                          disabled
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-11 pr-16 py-3 text-sm text-gray-900 placeholder:text-gray-400"
                        />
                        {/* Right-side mini “card” placeholders (visual only) */}
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-2 pr-4">
                          <span className="h-4 w-6 rounded bg-gray-200" />
                          <span className="h-4 w-6 rounded bg-gray-200" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-700">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM / YY"
                          disabled
                          className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700">CVV</label>
                        <div className="relative mt-2">
                          <input
                            type="password"
                            placeholder="•••"
                            disabled
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm text-gray-900 placeholder:text-gray-400"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <FiInfo className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <label className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-gray-700">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span>
                        <span className="font-semibold">Save this card</span> for faster future payments. Information is encrypted according to PCI-DSS
                        standards.
                      </span>
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Card details are entered securely in Razorpay checkout after you click Pay.
                    </p>
                  </>
                ) : null}

                {paymentMethod === 'netbanking' ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
                    You will be redirected to your bank to complete the payment securely via Razorpay.
                  </div>
                ) : null}

                {paymentMethod === 'upi' ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    {!showQRCode ? (
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-bold text-gray-900">Pay via UPI QR</div>
                          <div className="mt-1 text-xs text-gray-600">Generate a QR code and scan with any UPI app.</div>
                        </div>
                        <button
                          type="button"
                          onClick={generateQRCode}
                          disabled={qrLoading || loading}
                          className="inline-flex items-center justify-center rounded-lg border border-green-300 bg-white px-4 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
                        >
                          {qrLoading ? 'Generating...' : 'Generate QR'}
                        </button>
                      </div>
                    ) : null}

                    {showQRCode && qrCodeData ? (
                      <div className="mt-4">
                        <div className="flex flex-col items-center">
                          <div className="rounded-xl bg-white p-3 shadow-sm">
                            <img src={qrCodeData.qrCode} alt="UPI QR Code" className="h-56 w-56" />
                          </div>
                          <div className="mt-3 text-xs text-gray-600">
                            Scan with GPay / PhonePe / Paytm
                          </div>
                          {qrPolling ? (
                            <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-green-700">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                              Waiting for confirmation...
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setShowQRCode(false);
                              setQrCodeData(null);
                              stopQRPolling();
                            }}
                            className="mt-3 text-xs font-semibold text-gray-600 hover:text-gray-800"
                          >
                            Generate a new QR
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Test Mode Notice */}
              {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NODE_ENV === 'development') && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-yellow-800 mb-2">💡 Test Mode</p>
                  <p className="text-xs text-yellow-700 mb-1">Use Indian cards only. Test card:</p>
                  <p className="text-xs text-yellow-700 font-mono font-bold">4111 1111 1111 1111</p>
                  <p className="text-xs text-yellow-700">CVV: Any 3 digits | Expiry: Any future date</p>
                </div>
              )}

              {/* Pay button */}
              <div className="mt-6">
                {(() => {
                  const payDisabled =
                    loading ||
                    (paymentMethod !== 'upi' && !razorpayLoaded) ||
                    (paymentMethod === 'upi' && (qrLoading || (showQRCode && qrPolling)));
                  const payLabel =
                    paymentMethod === 'upi'
                      ? showQRCode
                        ? 'Waiting for UPI payment...'
                        : `Generate UPI QR (${formatMoney(Number(amount) || 0)})`
                      : `Pay ${formatMoney(Number(amount) || 0)} Now`;
                  return (
                    <button
                      onClick={handlePayNow}
                      disabled={payDisabled}
                      className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {loading ? (
                        'Processing...'
                      ) : (
                        <>
                          <FiLock className="h-4 w-4" />
                          <span>{payLabel}</span>
                        </>
                      )}
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading || qrLoading}
                  className="mt-3 w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>

                {!razorpayLoaded ? (
                  <p className="mt-3 text-xs text-gray-500 text-center">
                    Loading payment gateway...
                  </p>
                ) : null}
              </div>
            </div>

            {/* Bottom trust badges */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-2">
                <FiShield className="h-4 w-4" />
                PCI-DSS COMPLIANT
              </span>
              <span className="inline-flex items-center gap-2">
                <FiLock className="h-4 w-4" />
                NORTON SECURED
              </span>
              <span className="inline-flex items-center gap-2">
                <FiCheckCircle className="h-4 w-4" />
                AES-256 ENCRYPTION
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
