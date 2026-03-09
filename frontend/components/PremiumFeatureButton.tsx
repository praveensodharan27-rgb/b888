'use client';

import { useState } from 'react';
import { FiStar, FiTrendingUp, FiRefreshCw } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import toast from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';

const PaymentModal = dynamic(() => import('@/components/PaymentModal'), {
  loading: () => null,
  ssr: false
});

interface PremiumFeatureButtonProps {
  adId: string;
  adStatus: string;
  currentPremiumType?: string | null;
  premiumPrices?: {
    TOP?: number;
    FEATURED?: number;
    BUMP_UP?: number;
  };
}

export default function PremiumFeatureButton({ 
  adId, 
  adStatus, 
  currentPremiumType,
  premiumPrices = {}
}: PremiumFeatureButtonProps) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState<'TOP' | 'FEATURED' | 'BUMP_UP' | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const features = [
    {
      type: 'TOP' as const,
      name: 'Top Search',
      icon: FiStar,
      description: 'Appear at the top of search results',
      price: premiumPrices.TOP || 299,
      color: 'from-yellow-500 to-orange-500'
    },
    {
      type: 'FEATURED' as const,
      name: 'Featured',
      icon: FiTrendingUp,
      description: 'Featured placement in listings',
      price: premiumPrices.FEATURED || 199,
      color: 'from-blue-500 to-indigo-500'
    },
    {
      type: 'BUMP_UP' as const,
      name: 'Bump Up',
      icon: FiRefreshCw,
      description: 'Move your ad to the top',
      price: premiumPrices.BUMP_UP || 99,
      color: 'from-green-500 to-emerald-500'
    }
  ];

  const handlePurchase = async (type: 'TOP' | 'FEATURED' | 'BUMP_UP') => {
    if (adStatus !== 'APPROVED') {
      toast.error('Only approved ads can have premium features');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/premium/order', {
        adId,
        type
      });
      
      if (response.data.success) {
        setSelectedType(type);
        setPaymentOrder(response.data);
        setShowModal(true);
      }
    } catch (error: any) {
      console.error('Error creating premium order:', error);
      toast.error(error.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string, signature: string) => {
    try {
      await api.post('/premium/verify', {
        orderId: paymentOrder.razorpayOrder.id,
        paymentId,
        signature
      });
      toast.success('Premium feature activated successfully!');
      setShowModal(false);
      setPaymentOrder(null);
      // Invalidate queries to refresh ad data and premium status
      queryClient.invalidateQueries({ queryKey: ['ad', adId] });
      queryClient.invalidateQueries({ queryKey: ['user', 'ads'] });
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      // Small delay to allow queries to refetch
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['ad', adId] });
      }, 500);
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast.error(error.response?.data?.message || 'Payment verification failed');
    }
  };

  if (adStatus !== 'APPROVED') {
    return null;
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          const isActive = currentPremiumType === feature.type;
          const isDisabled = loading || isActive;

          return (
            <button
              key={feature.type}
              onClick={() => !isDisabled && handlePurchase(feature.type)}
              disabled={isDisabled}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isActive
                  ? 'bg-gradient-to-r ' + feature.color + ' text-white cursor-default'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
              title={isActive ? `${feature.name} is active` : `Purchase ${feature.name} - ₹${feature.price}`}
            >
              <Icon className="inline w-3 h-3 mr-1" />
              {feature.name} {isActive && '✓'}
            </button>
          );
        })}
      </div>

      {paymentOrder && paymentOrder.razorpayOrder && (
        <PaymentModal
          isOpen={showModal && !!paymentOrder}
          onClose={() => {
            setShowModal(false);
            setPaymentOrder(null);
          }}
          amount={paymentOrder.razorpayOrder.amount / 100}
          orderId={paymentOrder.razorpayOrder.id}
          razorpayKey={paymentOrder.razorpayOrder.key}
          razorpayOrderAmount={paymentOrder.razorpayOrder.amount}
          onSuccess={handlePaymentSuccess}
          onError={(error) => {
            console.error('Payment error:', error);
            toast.error('Payment failed. Please try again.');
            setShowModal(false);
            setPaymentOrder(null);
          }}
          description={`Purchase ${selectedType} premium feature`}
          packageDetails={selectedType ? {
            name: selectedType === 'TOP' ? 'Top Ad' : selectedType === 'FEATURED' ? 'Featured Ad' : 'Bump Up Ad',
            type: 'PREMIUM_AD',
            premiumType: selectedType as 'TOP' | 'FEATURED' | 'BUMP_UP',
            validity: selectedType === 'TOP' ? 7 : selectedType === 'FEATURED' ? 14 : 1,
            validityUnit: selectedType === 'BUMP_UP' ? 'hours' : 'days',
            benefits: selectedType === 'TOP' 
              ? ['Top placement in search results', 'Maximum visibility', 'Featured badge']
              : selectedType === 'FEATURED'
              ? ['Featured placement', 'Enhanced visibility', 'Featured badge']
              : ['Bump ad to top', '24-hour boost', 'Immediate visibility'],
            visibilityLevel: selectedType === 'TOP' ? 'Maximum' : selectedType === 'FEATURED' ? 'Enhanced' : 'Boosted'
          } : undefined}
          successAction={{
            label: 'View My Ads',
            onClick: () => {
              setShowModal(false);
              setPaymentOrder(null);
              window.location.href = '/my-ads';
            }
          }}
        />
      )}
    </>
  );
}

