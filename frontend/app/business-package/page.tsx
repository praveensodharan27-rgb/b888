'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiBriefcase, FiCheckCircle, FiXCircle, FiCreditCard, FiCalendar, FiStar, FiTrendingUp, FiZap, FiChevronDown, FiHome, FiSearch, FiAward } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function BusinessPackagePage() {
  const router = useRouter();
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose the plan that fits your business
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Maximize your visibility and reach more customers with our tailored business packages.
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <button
            type="button"
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod('yearly')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors relative ${
              billingPeriod === 'yearly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded">
              SAVE 20%
            </span>
          </button>
        </div>


        {/* Package Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {packagesData?.map((pkg: any, index: number) => {
            const isPopular = pkg.type === 'SELLER_PLUS';
            const isBasic = pkg.type === 'MAX_VISIBILITY';
            const isEnterprise = pkg.type === 'SELLER_PRIME';
            const price = getPrice(pkg);
            const displayPrice = billingPeriod === 'yearly' ? price / 12 : price;

            return (
              <div
                key={pkg.type}
                className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden relative ${
                  isPopular 
                    ? 'border-blue-500 transform scale-105 z-10' 
                    : 'border-gray-200'
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-center py-2 text-sm font-bold">
                    MOST POPULAR
                  </div>
                )}
                
                <div className={`p-8 ${isPopular ? 'pt-12' : ''}`}>
                  {/* Package Title */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {isBasic ? 'Business Basic' : isPopular ? 'Business Pro' : 'Business Enterprise'}
                  </h3>
                  
                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        ₹{displayPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-gray-500 text-lg">/{billingPeriod === 'monthly' ? 'mo' : 'mo'}</span>
                    </div>
                    {billingPeriod === 'yearly' && (
                      <p className="text-sm text-gray-500 mt-1">Billed annually</p>
                    )}
                  </div>
                  
                  {/* Description */}
                  <p className="text-gray-600 mb-6">
                    {isBasic ? 'Essential visibility for small businesses.' : 
                     isPopular ? 'High visibility for growing brands.' : 
                     'Top priority and maximum exposure.'}
                  </p>

                  {/* Features */}
                  <div className="space-y-3 mb-8 min-h-[200px]">
                    {isBasic ? (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Medium Visibility</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Category normal top</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Search results after Pro</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiXCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-400 line-through">No homepage highlight</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiXCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-400 line-through">No auto boost</span>
                        </div>
                      </>
                    ) : isPopular ? (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">High Visibility</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Category top (below Enterprise)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Search results first 20-30%</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Featured badge</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Limited boosts per month</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Top Priority Visibility</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Home page + category top</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Search results always first</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Featured / Verified Badge</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">Unlimited refresh / boost</span>
                        </div>
                      </>
                    )}
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
                    className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                      isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {redirectingPackageType === pkg.type ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                        Redirecting...
                      </>
                    ) : (
                      <>
                        {isEnterprise ? 'Contact Sales' : `Select ${isBasic ? 'Basic' : 'Pro'}`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compare Business Plans Table */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Compare Business Plans</h2>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Features</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Basic</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Pro</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Visibility Level</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600">Medium</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600">High</td>
                    <td className="px-6 py-4 text-sm text-center text-blue-600 font-semibold">Top Priority</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Search Ranking</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600">After Pro</td>
                    <td className="px-6 py-4 text-sm text-center text-blue-600 font-semibold">First 20-30%</td>
                    <td className="px-6 py-4 text-sm text-center text-blue-600 font-semibold">Always First</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Listing Position</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600">Normal</td>
                    <td className="px-6 py-4 text-sm text-center text-blue-600 font-semibold">Category Top</td>
                    <td className="px-6 py-4 text-sm text-center text-blue-600 font-semibold">Home + Category Top</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Badges</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-400">-</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">Featured</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full mr-1">Verified</span>
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">Featured</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Boosts / Refresh</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-400">-</td>
                    <td className="px-6 py-4 text-sm text-center text-blue-600 font-semibold">Limited</td>
                    <td className="px-6 py-4 text-sm text-center text-blue-600 font-semibold">Unlimited</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                question: 'Can I upgrade my visibility later?',
                answer: 'Yes, you can upgrade your business package at any time. When you upgrade, your new package will be activated immediately and any remaining time from your current package will be prorated.'
              },
              {
                question: 'What is a "Boost"?',
                answer: 'A boost is a feature that moves your ad to the top of search results temporarily. Pro plans include limited boosts per month, while Enterprise plans include unlimited boosts.'
              },
              {
                question: 'How does the "Verified" badge help?',
                answer: 'The Verified badge shows that your business is authentic and trustworthy. It appears on all your ads and helps increase buyer confidence, leading to more inquiries and sales.'
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <FiChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trusted By Section */}
        <div className="mb-16">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider text-center mb-8">
            TRUSTED BY BUSINESSES EVERYWHERE
          </h2>
          <div className="flex justify-center items-center gap-8 flex-wrap">
            {['Acme Corp', 'GlobalTech', 'Nebula', 'FoxRun'].map((company, index) => (
              <div
                key={index}
                className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-semibold"
              >
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
