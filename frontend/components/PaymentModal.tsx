'use client';

import { useEffect, useState } from 'react';
import { FiX, FiCreditCard } from 'react-icons/fi';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number; // Amount in INR (for display)
  orderId: string;
  razorpayKey: string;
  razorpayOrderAmount?: number; // Exact amount in paise from Razorpay order (optional)
  onSuccess: (paymentId: string, signature: string, orderIdFromResponse?: string) => void;
  onError: (error: any) => void;
  description?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  orderId,
  razorpayKey,
  razorpayOrderAmount,
  onSuccess,
  onError,
  description = 'Complete your payment to proceed'
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !razorpayLoaded) {
      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        setRazorpayLoaded(true);
      };
      script.onerror = () => {
        toast.error('Failed to load payment gateway');
        onError(new Error('Payment gateway failed to load'));
      };
      document.body.appendChild(script);

      return () => {
        // Cleanup script on unmount
        if (document.body.contains(script)) {
          document.body.removeChild(script);
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

    // Use exact amount from Razorpay order if provided, otherwise calculate from INR amount
    // When using order_id, Razorpay validates that amount matches the order amount
    // IMPORTANT: razorpayOrderAmount is already in paise from Razorpay API
    const amountInPaise = razorpayOrderAmount || Math.round(Number(amount) * 100);
    
    // Validate amount is reasonable (between ₹1 and ₹100,000)
    if (isNaN(amountInPaise) || amountInPaise < 100 || amountInPaise > 10000000) {
      console.error('❌ Invalid payment amount:', { amountInPaise, razorpayOrderAmount, amount });
      toast.error('Invalid payment amount. Please contact support.');
      onError(new Error(`Invalid payment amount: ${amountInPaise} paise`));
      return;
    }

    console.log('💳 Initializing Razorpay payment:', {
      orderId,
      amountInINR: razorpayOrderAmount ? (razorpayOrderAmount / 100) : amount,
      amountInPaise,
      usingOrderAmount: !!razorpayOrderAmount,
      razorpayOrderAmount,
      razorpayKey: razorpayKey?.substring(0, 10) + '...'
    });

    const options = {
      key: razorpayKey,
      amount: amountInPaise, // Amount in paise (must match order amount exactly)
      currency: 'INR',
      name: 'SellIt',
      description: description,
      order_id: orderId, // Must match the order ID from backend
      handler: function (response: any) {
        setLoading(false);
        console.log('✅ Payment successful:', response);
        // Razorpay returns: razorpay_payment_id, razorpay_order_id, razorpay_signature
        // Pass all three to ensure correct verification
        onSuccess(
          response.razorpay_payment_id, 
          response.razorpay_signature,
          response.razorpay_order_id // Also pass order_id from response
        );
      },
      prefill: {
        name: '',
        email: '',
        contact: ''
      },
      theme: {
        color: '#4F46E5'
      },
      modal: {
        ondismiss: function() {
          setLoading(false);
          console.log('⚠️ Payment modal dismissed by user');
          onClose();
        }
      },
      // Error handlers
      'payment.error': function(error: any) {
        setLoading(false);
        console.error('❌ Razorpay payment error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        let errorMessage = error.error?.description || error.error?.reason || error.error?.code || 'Payment failed. Please try again.';
        
        // Handle international card error specifically
        if (errorMessage.toLowerCase().includes('international') || errorMessage.toLowerCase().includes('not supported')) {
          errorMessage = 'International cards are not supported. Please use an Indian card. For testing, use: Card: 4111 1111 1111 1111, CVV: Any 3 digits, Expiry: Any future date';
          toast.error(errorMessage, { duration: 6000 });
        } else {
          toast.error(errorMessage);
        }
        onError(error);
      },
      'payment.cancel': function() {
        setLoading(false);
        console.log('⚠️ Payment cancelled by user');
        toast.error('Payment cancelled');
        onClose();
      },
      // Additional error handler
      'payment.failed': function(error: any) {
        setLoading(false);
        console.error('❌ Payment failed:', error);
        toast.error('Payment could not be completed. Please try again.');
        onError(error);
      }
    };

    try {
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      setLoading(false);
      toast.error('Failed to initialize payment');
      onError(error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FiCreditCard /> Payment Required
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">{description}</p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Amount to Pay:</span>
              <span className="text-2xl font-bold text-primary-600">
                ₹{amount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NODE_ENV === 'development') && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-semibold text-yellow-800 mb-2">💡 Test Mode - Use Indian Cards Only</p>
              <p className="text-xs text-yellow-700 mb-1">International cards are not supported in test mode.</p>
              <p className="text-xs text-yellow-700 font-mono">
                Test Card: <span className="font-bold">4111 1111 1111 1111</span>
              </p>
              <p className="text-xs text-yellow-700">CVV: Any 3 digits | Expiry: Any future date</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={loading || !razorpayLoaded}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <FiCreditCard /> Pay Now
              </>
            )}
          </button>
        </div>

        {!razorpayLoaded && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Loading payment gateway...
          </p>
        )}
      </div>
    </div>
  );
}

