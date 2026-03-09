'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import toast from '@/lib/toast';

type BusinessPackageType = 'MAX_VISIBILITY' | 'SELLER_PLUS' | 'SELLER_PRIME';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const flow = searchParams.get('flow') || '';
  const packageTypeParam = (searchParams.get('packageType') || '') as BusinessPackageType;

  const [creatingOrder, setCreatingOrder] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const orderStartedRef = useRef(false);
  const razorpayCheckoutOpenedRef = useRef(false);
  const createOrderAbortRef = useRef<AbortController | null>(null);

  // Load selection (query first, fallback to sessionStorage)
  const selection = useMemo(() => {
    const fromQuery = {
      flow,
      packageType: searchParams.get('packageType') || '',
      packageId: searchParams.get('packageId') || '',
      packageName: searchParams.get('packageName') || '',
      price: searchParams.get('price') || '',
      userId: searchParams.get('userId') || '',
    };

    if (fromQuery.flow && fromQuery.packageType) return fromQuery;

    if (typeof window === 'undefined') return fromQuery;
    try {
      const raw = sessionStorage.getItem('business_package_checkout');
      if (!raw) return fromQuery;
      const parsed = JSON.parse(raw);
      return { ...fromQuery, ...parsed };
    } catch {
      return fromQuery;
    }
  }, [flow, searchParams]);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const createBusinessPackageOrder = useCallback(async () => {
    if (!user) return;
    if (selection.flow !== 'business-package') return;
    if (!packageTypeParam) return;

    // Prevent duplicate concurrent creations
    if (creatingOrder) return;

    // Abort any previous in-flight request (safety)
    try {
      createOrderAbortRef.current?.abort();
    } catch {
      // ignore
    }

    const abortController = new AbortController();
    createOrderAbortRef.current = abortController;

    // Hard timeout: avoid infinite loader when backend/Razorpay is slow or unreachable
    const HARD_TIMEOUT_MS = 20000;
    const timeoutId = setTimeout(() => {
      try {
        abortController.abort();
      } catch {
        // ignore
      }
    }, HARD_TIMEOUT_MS);

    try {
      orderStartedRef.current = true;
      setCreatingOrder(true);
      setOrderError(null);

      // Create order FIRST so we can show payment UI ASAP.
      // Package info is optional display metadata; don't block the payment UI on it.
      console.log('🛒 Creating business package order for:', packageTypeParam);
      const orderRes = await api.post(
        '/business-package/order',
        { packageType: packageTypeParam },
        { signal: abortController.signal }
      );

      console.log('📦 Order response received:', {
        hasData: !!orderRes?.data,
        success: orderRes?.data?.success,
        hasRazorpayOrder: !!orderRes?.data?.razorpayOrder,
        orderData: orderRes?.data,
      });

      const orderData = orderRes?.data;

      // Check multiple possible response structures
      const razorpayOrder =
        orderData?.razorpayOrder || orderData?.data?.razorpayOrder || orderData?.order?.razorpayOrder || null;

      console.log('🔍 Extracted razorpayOrder:', {
        hasRazorpayOrder: !!razorpayOrder,
        hasId: !!razorpayOrder?.id,
        hasKey: !!razorpayOrder?.key,
        razorpayOrder,
      });

      if (!razorpayOrder) {
        const msg = orderData?.message || 'Payment order not received. Please try again.';
        console.error('❌ Missing razorpayOrder in response:', orderData);
        setOrderError(msg);
        toast.error(msg);
        return;
      }

      if (!razorpayOrder.id) {
        const msg = 'Payment order ID missing. Please try again.';
        console.error('❌ Missing order ID:', razorpayOrder);
        setOrderError(msg);
        toast.error(msg);
        return;
      }

      if (!razorpayOrder.key) {
        const msg = 'Payment gateway key missing. Please contact support.';
        console.error('❌ Missing Razorpay key:', razorpayOrder);
        setOrderError(msg);
        toast.error(msg);
        return;
      }

      console.log('✅ Order ready, setting payment order');
      setPaymentOrder({
        ...orderData,
        razorpayOrder,
      });

      // Fetch package info in the background (best-effort).
      api
        .get('/business-package/info')
        .then((pkgInfoRes) => {
          const packages = pkgInfoRes.data?.packages || pkgInfoRes.data?.data?.packages || pkgInfoRes.data || [];
          const found = Array.isArray(packages) ? packages.find((p: any) => p.type === packageTypeParam) : null;
          setSelectedPackage(found || null);
        })
        .catch(() => {
          // ignore - packageDetails are optional
        });
    } catch (e: any) {
      const isAbort =
        e?.name === 'CanceledError' ||
        e?.code === 'ERR_CANCELED' ||
        e?.message?.toLowerCase?.().includes?.('canceled') ||
        e?.message?.toLowerCase?.().includes?.('aborted');

      const isTimeout = e?.code === 'ECONNABORTED' || isAbort;

      const msg = isTimeout
        ? 'Payment server is taking too long to respond. Please check your connection and try again.'
        : e?.response?.data?.message || e?.message || 'Failed to start payment';

      setOrderError(msg);
      toast.error(msg);
    } finally {
      clearTimeout(timeoutId);
      setCreatingOrder(false);
    }
  }, [user, selection.flow, packageTypeParam, creatingOrder]);

  // Auto-create order immediately (no intermediate steps)
  useEffect(() => {
    if (!user || paymentOrder) return;
    if (selection.flow !== 'business-package') return;
    if (!packageTypeParam) return;
    if (orderStartedRef.current) return;
    createBusinessPackageOrder();
  }, [user, paymentOrder, selection.flow, packageTypeParam, createBusinessPackageOrder]);

  // Load Razorpay SDK
  useEffect(() => {
    if (razorpayLoaded || typeof window === 'undefined') return;

    // Check if already loaded
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setRazorpayLoaded(true));
      return;
    }

    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Razorpay SDK loaded');
      setRazorpayLoaded(true);
    };
    script.onerror = () => {
      console.error('❌ Failed to load Razorpay SDK');
      setOrderError('Payment gateway not loaded. Please try again.');
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove script on cleanup - it's needed globally
    };
  }, [razorpayLoaded]);

  // Compute package name (needed before useEffect)
  const packageName = useMemo(
    () =>
      selection.packageName ||
      (packageTypeParam === 'MAX_VISIBILITY'
        ? 'Business Basic'
        : packageTypeParam === 'SELLER_PLUS'
          ? 'Business Pro'
          : packageTypeParam === 'SELLER_PRIME'
            ? 'Business Enterprise'
            : 'Business Package'),
    [selection.packageName, packageTypeParam]
  );

  // Verify payment after Razorpay success
  const verifyPayment = useCallback(async (paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    try {
      console.log('🔍 Verifying payment:', {
        orderId: paymentData.razorpay_order_id,
        paymentId: paymentData.razorpay_payment_id,
        hasSignature: !!paymentData.razorpay_signature,
      });

      const response = await api.post('/business-package/verify', {
        orderId: paymentData.razorpay_order_id,
        paymentId: paymentData.razorpay_payment_id,
        signature: paymentData.razorpay_signature,
      });

      if (response.data?.success) {
        console.log('✅ Payment verified successfully');
        // Don't toast here – show once on business-package?activated=1 to avoid duplicate
        // toast.sellerPlusActivated();
        
        // Clear stored selection so refresh doesn't re-trigger
        try {
          sessionStorage.removeItem('business_package_checkout');
        } catch {
          // ignore
        }

        // Redirect to business package page to show active status
        setTimeout(() => {
          router.replace('/business-package?activated=1');
        }, 1500);
      } else {
        throw new Error(response.data?.message || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('❌ Payment verification failed:', error);
      toast.error(error?.response?.data?.message || 'Payment verification failed. Please contact support.');
    }
  }, [router]);

  // Open Razorpay Checkout when order is ready and SDK is loaded
  useEffect(() => {
    if (!paymentOrder?.razorpayOrder || !razorpayLoaded || openingCheckout || razorpayCheckoutOpenedRef.current) {
      return;
    }

    const razorpayOrder = paymentOrder.razorpayOrder;
    if (!razorpayOrder.id || !razorpayOrder.key) {
      return;
    }

    // Timeout: If Razorpay doesn't open within 2 seconds, show error
    const timeoutId = setTimeout(() => {
      if (!razorpayCheckoutOpenedRef.current) {
        setOrderError('Payment gateway not loaded. Please try again.');
        toast.error('Payment gateway not loaded. Please try again.');
      }
    }, 2000);

    const openRazorpayCheckout = () => {
      try {
        setOpeningCheckout(true);
        razorpayCheckoutOpenedRef.current = true;

        const options = {
          key: razorpayOrder.key,
          amount: razorpayOrder.amount, // Amount in paise
          currency: razorpayOrder.currency || 'INR',
          name: 'Sell Box Business Package',
          description: `Complete payment to activate your ${packageName}`,
          order_id: razorpayOrder.id,
          handler: function (response: any) {
            console.log('✅ Payment successful:', response);
            // Verify payment
            verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || '',
          },
          theme: {
            color: '#0B5ED7',
          },
          modal: {
            ondismiss: function () {
              console.log('Payment modal closed');
              razorpayCheckoutOpenedRef.current = false;
              setOpeningCheckout(false);
              // Redirect back to business package page
              router.replace('/business-package');
            },
          },
        };

        console.log('🚀 Opening Razorpay Checkout with options:', {
          order_id: options.order_id,
          amount: options.amount,
          key: options.key?.substring(0, 10) + '...',
        });

        const rzp = new window.Razorpay(options);
        rzp.open();
        clearTimeout(timeoutId);
      } catch (error: any) {
        console.error('❌ Error opening Razorpay Checkout:', error);
        clearTimeout(timeoutId);
        setOrderError('Failed to open payment gateway. Please try again.');
        toast.error('Failed to open payment gateway. Please try again.');
        setOpeningCheckout(false);
        razorpayCheckoutOpenedRef.current = false;
      }
    };

    // Small delay to ensure UI is ready
    const timer = setTimeout(openRazorpayCheckout, 100);

    return () => {
      clearTimeout(timer);
      clearTimeout(timeoutId);
    };
  }, [paymentOrder, razorpayLoaded, openingCheckout, packageName, user, router, verifyPayment]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selection.flow !== 'business-package' || !packageTypeParam) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className="text-lg font-extrabold text-gray-900">Payment</div>
          <p className="mt-2 text-sm text-gray-600">No payment intent found. Please select a business package.</p>
          <button
            type="button"
            onClick={() => router.replace('/business-package')}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Business Packages
          </button>
        </div>
      </div>
    );
  }

  if (!paymentOrder?.razorpayOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-lg">
          {creatingOrder ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 mb-2">Creating Razorpay Order...</div>
              <p className="text-sm text-gray-600 mb-4">Please wait while we set up your payment.</p>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span>Setting up secure payment</span>
              </div>
            </>
          ) : orderError ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-red-100 p-3">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 mb-2">Payment Setup Failed</div>
              <p className="text-sm font-semibold text-red-600 mb-4">{orderError}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => router.replace('/business-package')}
                  className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    orderStartedRef.current = false;
                    razorpayCheckoutOpenedRef.current = false;
                    setPaymentOrder(null);
                    setOrderError(null);
                    setOpeningCheckout(false);
                    setCreatingOrder(false);
                    createBusinessPackageOrder();
                  }}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-xl font-bold text-gray-900 mb-2">Waiting for payment order...</div>
              <p className="text-sm text-gray-600 mb-4">Please wait while we prepare your payment.</p>
              <button
                type="button"
                onClick={() => router.replace('/business-package')}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Back to Packages
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Show loading state while opening Razorpay Checkout
  if (openingCheckout || (paymentOrder?.razorpayOrder && !razorpayLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900 mb-2">
            {openingCheckout ? 'Opening Razorpay Checkout...' : 'Loading Payment Gateway...'}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {openingCheckout
              ? 'Razorpay checkout popup will open shortly. Please complete your payment.'
              : 'Please wait while we load the secure payment gateway.'}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span>{openingCheckout ? 'Opening checkout...' : 'Loading SDK...'}</span>
          </div>
        </div>
      </div>
    );
  }

  // This should not render - Razorpay Checkout should have opened
  // But show a fallback in case it didn't
  const handleManualOpenCheckout = () => {
    if (!paymentOrder?.razorpayOrder || !window.Razorpay) {
      toast.error('Payment gateway not ready. Please refresh the page.');
      return;
    }

    const razorpayOrder = paymentOrder.razorpayOrder;
    try {
      razorpayCheckoutOpenedRef.current = true;
      setOpeningCheckout(true);

      const options = {
        key: razorpayOrder.key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || 'INR',
        name: 'Sell Box Business Package',
        description: `Complete payment to activate your ${packageName}`,
        order_id: razorpayOrder.id,
        handler: function (response: any) {
          verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#0B5ED7',
        },
        modal: {
          ondismiss: function () {
            razorpayCheckoutOpenedRef.current = false;
            setOpeningCheckout(false);
            router.replace('/business-package');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error('❌ Error opening Razorpay Checkout:', error);
      toast.error('Failed to open payment gateway. Please try again.');
      razorpayCheckoutOpenedRef.current = false;
      setOpeningCheckout(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-lg">
        <div className="text-xl font-bold text-gray-900 mb-2">Payment Ready</div>
        <p className="text-sm text-gray-600 mb-4">
          If the payment window didn't open, please click below to try again.
        </p>
        <button
          type="button"
          onClick={handleManualOpenCheckout}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Open Payment Gateway
        </button>
      </div>
    </div>
  );
}

