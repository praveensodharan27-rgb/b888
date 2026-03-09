'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiBriefcase, FiCheckCircle, FiXCircle, FiCreditCard, FiCalendar, FiStar, FiTrendingUp, FiZap, FiChevronDown, FiHome, FiSearch, FiAward } from 'react-icons/fi';
import toast from '@/lib/toast';
import { format } from 'date-fns';

export default function BusinessPackagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [redirectingPackageType, setRedirectingPackageType] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  // If redirected back from payment flow, show confirmation and refetch status.
  useEffect(() => {
    const activated = searchParams.get('activated');
    if (activated === '1') {
      toast.sellerPlusActivated();
      refetchStatus();
      // Clean URL (optional)
      router.replace('/business-package');
    }
  }, [searchParams, refetchStatus, router]);

  const handlePurchase = (packageType: string) => {
    if (!user?.id) {
      router.push('/login');
      return;
    }

    const selected = packagesData?.find((pkg: any) => pkg.type === packageType);
    if (!selected) {
      toast.error('Package not found. Please refresh and try again.');
      return;
    }

    const isBasic = packageType === 'MAX_VISIBILITY';
    const isPopular = packageType === 'SELLER_PLUS';
    const packageName = isBasic ? 'Business Basic' : isPopular ? 'Business Pro' : 'Business Enterprise';

    // Compute displayed price (same as cards). Payment will be created on /payment automatically.
    const getPrice = (pkg: any) => {
      if (!pkg) return 0;
      const monthly = pkg.priceMonthly ?? pkg.price ?? pkg.amount ?? 0;
      const yearly = pkg.priceYearly ?? (monthly ? Math.round(monthly * 12 * 0.8) : 0);
      return billingPeriod === 'yearly' ? yearly : monthly;
    };
    const price = getPrice(selected);

    // Save selection (Requirement #2)
    try {
      sessionStorage.setItem(
        'business_package_checkout',
        JSON.stringify({
          flow: 'business-package',
          packageType,
          packageId: selected.id || selected.packageId || '',
          packageName,
          price,
          userId: user.id,
        })
      );
    } catch {
      // ignore storage errors
    }

    setRedirectingPackageType(packageType);

    // Redirect immediately to payment page (Requirement #3)
    const qp = new URLSearchParams({
      flow: 'business-package',
      packageType,
      packageId: String(selected.id || selected.packageId || ''),
      packageName,
      price: String(price),
      userId: user.id,
    });
    router.push(`/payment?${qp.toString()}`);
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
  // Use root-level totals from API (correct for single or multiple packages)
  const totalAdsAllowed = typeof packageStatus?.totalAdsAllowed === 'number' ? packageStatus.totalAdsAllowed : 0;
  const adsUsed = typeof packageStatus?.adsUsed === 'number' ? packageStatus.adsUsed : 0;
  const adsRemaining = typeof packageStatus?.adsRemaining === 'number' ? packageStatus.adsRemaining : Math.max(0, totalAdsAllowed - adsUsed);

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

  // Calculate yearly prices (with 20% discount)
  const getPrice = (pkg: any) => {
    const basePrice = pkg.price;
    return billingPeriod === 'yearly' ? Math.round(basePrice * 12 * 0.8) : basePrice;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-16">
        {/* Active package banner with Business Package ads count */}
        {hasActivePackage && activePackage ? (
          <div className="mb-12 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-green-800">Active Business Package</div>
                <div className="mt-1 text-sm text-green-900">
                  <span className="font-semibold">{activePackage.packageType}</span>
                  {activePackage.expiresAt ? (
                    <span className="text-green-800">
                      {' '}
                      • Expires on {format(new Date(activePackage.expiresAt), 'dd MMM yyyy')}
                    </span>
                  ) : null}
                </div>
                {/* Only show ads remaining / used when user has ads left (hide "0 ads remaining" to avoid confusion) */}
                {adsRemaining > 0 && (
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-bold text-white">
                      {adsRemaining} ad{adsRemaining !== 1 ? 's' : ''} remaining
                    </span>
                    <span className="text-sm text-green-800">
                      Used: {adsUsed} / {totalAdsAllowed}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => refetchStatus()}
                className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700"
              >
                Refresh Status
              </button>
            </div>
          </div>
        ) : null}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Flexible plans for every business
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the perfect package to scale your operations with ease. No hidden fees, cancel any time.
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center items-center mb-16">
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
            <button
              type="button"
              onClick={() => setBillingPeriod('monthly')}
              className={`px-8 py-2.5 rounded-full font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod('yearly')}
              className={`px-8 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                save 20%
              </span>
            </button>
          </div>
        </div>


        {/* Package Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20 max-w-6xl mx-auto">
          {packagesData?.map((pkg: any, index: number) => {
            const isPopular = pkg.type === 'SELLER_PLUS';
            const isBasic = pkg.type === 'MAX_VISIBILITY';
            const isEnterprise = pkg.type === 'SELLER_PRIME';
            const price = getPrice(pkg);
            const displayPrice = billingPeriod === 'yearly' ? price / 12 : price;
            const displayPriceFormatted = Intl.NumberFormat('en-IN').format(Math.round(displayPrice));

            return (
              <div
                key={pkg.type}
                className={`bg-white rounded-2xl overflow-hidden relative transition-all ${
                  isPopular 
                    ? 'border-2 border-primary-500 shadow-xl' 
                    : 'border border-gray-200 shadow-md'
                }`}
              >
                {isPopular && (
                  <div className="bg-primary-600 text-white text-center py-2.5 text-xs font-bold tracking-wide">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="p-8">
                  {/* Package Title */}
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                      {isBasic ? 'STARTER' : isPopular ? 'PROFESSIONAL' : 'ENTERPRISE'}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-5xl font-bold text-gray-900">
                        ₹{displayPriceFormatted}
                      </span>
                      <span className="text-gray-500 text-base">/mo</span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {isBasic 
                        ? 'Best for individual sellers starting to post ads.' 
                        : isPopular 
                        ? 'Ideal for active sellers and small businesses who need better visibility.' 
                        : 'Perfect for dealers and large businesses who want maximum exposure.'}
                    </p>
                  </div>

                  {/* Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePurchase(pkg.type);
                    }}
                    disabled={redirectingPackageType === pkg.type}
                    className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 mb-8 ${
                      isPopular
                        ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {redirectingPackageType === pkg.type ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                        Redirecting...
                      </>
                    ) : (
                      'Get Started'
                    )}
                  </button>

                  {/* Features */}
                  <div className="space-y-4">
                    {isBasic ? (
                      <>
                        <div className="flex items-start gap-3 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Post limited ads</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Basic visibility in listings</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Standard seller support</span>
                        </div>
                      </>
                    ) : isPopular ? (
                      <>
                        <div className="text-sm text-gray-500 mb-3">Everything in Starter, plus:</div>
                        <div className="flex items-start gap-3 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Higher ad posting limits</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Featured ads priority</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Business profile badge</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Better visibility in listings</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-gray-500 mb-3">Everything in Professional, plus:</div>
                        <div className="flex items-start gap-3 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Unlimited or high ad posting limits</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Top ads placement</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Sponsored ads visibility</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Priority customer support</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mb-20 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
            <div className="w-12 h-1 bg-primary-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Can I change plans later?</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Yes, you can upgrade or downgrade your plan at any time. Changes are applied immediately and prorated for the billing cycle.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Is there a free trial available?</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We offer a 14-day free trial for our Starter and Professional plans so you can experience the full power of our platform.
                </p>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We accept all major credit cards, PayPal, and for Enterprise customers, we also support bank wire transfers and invoicing.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Do you offer discounts for non-profits?</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Absolutely. We offer a 30% discount for registered non-profit organizations. Contact our support team to verify your status.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-gray-900 rounded-2xl p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Ready to transform your business?</h2>
            <p className="text-gray-300 text-lg">Join over 10,000+ companies scaling with BizServices today.</p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => router.push('/business-package')}
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors whitespace-nowrap"
            >
              Start Free Trial
            </button>
            <button
              type="button"
              onClick={() => router.push('/contact')}
              className="bg-transparent border-2 border-gray-500 text-white px-8 py-3 rounded-lg font-semibold hover:border-gray-400 transition-colors whitespace-nowrap"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
