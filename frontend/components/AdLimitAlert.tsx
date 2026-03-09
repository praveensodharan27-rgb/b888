'use client';

import Link from 'next/link';
import { FiAlertCircle, FiArrowUpCircle, FiShoppingCart, FiX } from 'react-icons/fi';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import toast from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';

const PaymentModal = dynamic(() => import('@/components/PaymentModal'), {
  loading: () => null,
  ssr: false
});

interface AdLimitAlertProps {
  packageName: string;
  maxAds: number;
  currentAds: number;
  message: string;
  extraAdSlots?: number;
  totalAllowedAds?: number;
  onDismiss?: () => void;
  dismissible?: boolean;
}

export default function AdLimitAlert({ 
  packageName, 
  maxAds, 
  currentAds, 
  message,
  extraAdSlots = 0,
  totalAllowedAds,
  onDismiss,
  dismissible = false
}: AdLimitAlertProps) {
  const queryClient = useQueryClient();
  const [showExtraSlotsModal, setShowExtraSlotsModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  const handleBuyExtraSlots = async () => {
    try {
      const response = await api.post('/business-package/extra-slots/order', { quantity });
      if (response.data.success) {
        setPaymentOrder(response.data);
        setShowExtraSlotsModal(true);
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.message || 'Failed to create order');
    }
  };

  const handlePaymentSuccess = async (paymentId: string, signature: string) => {
    try {
      await api.post('/business-package/extra-slots/verify', {
        orderId: paymentOrder.razorpayOrder.id,
        paymentId,
        signature
      });
      toast.success('Extra ad slots purchased successfully!');
      setShowExtraSlotsModal(false);
      setPaymentOrder(null);
      // Invalidate ad limit status to refresh it immediately
      queryClient.invalidateQueries({ queryKey: ['ad-limit-status'] });
      // Also invalidate business package status
      queryClient.invalidateQueries({ queryKey: ['business-package', 'status'] });
      // Small delay to allow queries to refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['ad-limit-status'] });
      }, 500);
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast.error(error.response?.data?.message || 'Payment verification failed');
    }
  };

  const displayMaxAds = totalAllowedAds || maxAds;

  return (
    <>
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-6 mb-6 shadow-lg relative">
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full p-1.5 transition-colors"
            aria-label="Dismiss alert"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <FiAlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-900 mb-2">
              Ad Limit Reached
            </h3>
            <p className="text-red-800 mb-4 leading-relaxed">
              {message}
            </p>
            <div className="bg-white/60 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Current Ads:</span>
                <span className="font-bold text-gray-900">{currentAds} / {displayMaxAds}</span>
              </div>
              {extraAdSlots > 0 && (
                <div className="text-xs text-gray-600 mb-2">
                  ({maxAds} from package + {extraAdSlots} extra slots)
                </div>
              )}
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-red-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (currentAds / displayMaxAds) * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/business-package"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <FiArrowUpCircle className="w-5 h-5" />
                Upgrade Package
              </Link>
              <button
                onClick={() => setShowExtraSlotsModal(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <FiShoppingCart className="w-5 h-5" />
                Buy Extra Ads (₹99 each)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Extra Slots Purchase Modal */}
      {showExtraSlotsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Purchase Extra Ad Slots</h3>
            <p className="text-gray-600 mb-4">
              Buy additional ad slots for ₹99 each. These slots are permanent and don't expire.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between">
                <span>Price per slot:</span>
                <span>₹99</span>
              </div>
              <div className="flex justify-between font-bold mt-2">
                <span>Total:</span>
                <span>₹{quantity * 99}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExtraSlotsModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBuyExtraSlots}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentOrder && paymentOrder.razorpayOrder && (
        <PaymentModal
          isOpen={showExtraSlotsModal && !!paymentOrder}
          onClose={() => {
            setShowExtraSlotsModal(false);
            setPaymentOrder(null);
          }}
          amount={paymentOrder.razorpayOrder.amount / 100}
          orderId={paymentOrder.razorpayOrder.id}
          razorpayKey={paymentOrder.razorpayOrder.key}
          razorpayOrderAmount={paymentOrder.razorpayOrder.amount}
          onSuccess={handlePaymentSuccess}
          onError={(error) => {
            console.error('Payment error:', error);
            setShowExtraSlotsModal(false);
            setPaymentOrder(null);
          }}
          description={`Purchase ${quantity} extra ad slot${quantity > 1 ? 's' : ''}`}
        />
      )}
    </>
  );
}

