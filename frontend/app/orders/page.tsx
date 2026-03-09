'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { FiCreditCard, FiPackage, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiEye, FiDownload, FiFileText, FiMessageCircle, FiChevronDown, FiStar } from 'react-icons/fi';
import { format, differenceInDays, isAfter } from 'date-fns';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';
import toast from '@/lib/toast';
import { getAdUrl } from '@/lib/directory';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'premium' | 'ad-posting'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showMoreOrders, setShowMoreOrders] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading: ordersLoading, refetch } = useQuery({
    queryKey: ['userOrders', filter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('type', filter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await api.get(`/user/orders?${params.toString()}`);
      return response.data;
    },
    enabled: isAuthenticated && mounted,
  });

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  if (!mounted || isLoading || ordersLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const allOrders = data?.orders || [];
  const pagination = data?.pagination || {};
  
  // Filter orders based on active tab
  const filteredOrders = allOrders.filter((order: any) => {
    if (activeTab === 'active') {
      return order.status === 'pending' || (order.status === 'paid' && differenceInDays(new Date(), new Date(order.createdAt)) <= 7);
    } else {
      return order.status === 'paid' && differenceInDays(new Date(), new Date(order.createdAt)) > 7;
    }
  });
  
  // Show limited orders initially, all if showMoreOrders is true
  const displayedOrders = showMoreOrders ? filteredOrders : filteredOrders.slice(0, 3);

  const getStatusBadge = (status: string, createdAt: string) => {
    const orderDate = new Date(createdAt);
    const daysSinceOrder = differenceInDays(new Date(), orderDate);
    
    switch (status) {
      case 'paid':
        // If paid and recent (within 7 days), show IN TRANSIT, otherwise DELIVERED
        if (daysSinceOrder <= 7) {
          return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              IN TRANSIT
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            DELIVERED
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
            PAYMENT PENDING
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  const getOrderTypeLabel = (order: any) => {
    if (order.type === 'premium') {
      const typeLabels: { [key: string]: string } = {
        TOP: 'Top Ad',
        FEATURED: 'Featured Ad',
        BUMP_UP: 'Bump Up'
      };
      return typeLabels[order.orderType] || 'Premium Ad';
    }
    return 'Ad Posting';
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Breadcrumbs */}
        <div className="mb-4 text-sm text-gray-600">
          <Link href="/profile" className="hover:text-blue-600">Account</Link>
          <span className="mx-2">/</span>
          <span>Order History</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">My Orders</h1>
          <p className="text-gray-600 text-lg">Track your purchases and view order summaries</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-0">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white rounded-t-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 rounded-t-lg'
            }`}
          >
            Active Orders
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'completed'
                ? 'bg-blue-600 text-white rounded-t-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 rounded-t-lg'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-6">You haven't made any {activeTab === 'active' ? 'active' : 'completed'} orders yet.</p>
            <Link
              href="/post-ad"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Post Your First Ad
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedOrders.map((order: any) => {
              const orderNumber = order.razorpayOrderId || order.id.slice(-5).toUpperCase();
              const orderDate = format(new Date(order.createdAt), 'MMM d, yyyy').toUpperCase();
              const sellerName = order.ad?.user?.name || 'Seller';
              
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
                >
                  <div className="flex gap-6 items-start">
                    {/* Product Image */}
                    {order.ad?.images && order.ad.images.length > 0 ? (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        <ImageWithFallback
                          src={Array.isArray(order.ad.images) ? order.ad.images[0] : order.ad.images}
                          alt={order.ad?.title || 'Product image'}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center">
                        <FiPackage className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Order Details */}
                    <div className="flex-1 flex flex-col">
                      {/* Order Number and Date */}
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          ORDER #{orderNumber} • {orderDate}
                        </span>
                      </div>
                      
                      {/* Item Name */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {order.ad?.title || getOrderTypeLabel(order)}
                      </h3>
                      
                      {/* Seller Name */}
                      {order.ad?.user ? (
                        <p className="text-sm text-gray-600 mb-2">
                          Sold by: <span className="font-medium">{sellerName}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">{getOrderTypeLabel(order)}</span>
                        </p>
                      )}
                      
                      {/* Price */}
                      <div className="mb-3">
                        <span className="text-xl font-bold text-gray-900">
                          ₹{order.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="mb-4">
                        {getStatusBadge(order.status, order.createdAt)}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-auto">
                        {/* For delivered orders, show Leave Review instead of Contact Seller */}
                        {order.status === 'paid' && differenceInDays(new Date(), new Date(order.createdAt)) > 7 ? (
                          <Link
                            href={`/ads/${order.ad?.id}/review`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                          >
                            <FiStar className="w-4 h-4" />
                            Leave Review
                          </Link>
                        ) : (
                          order.ad?.user?.id && (
                            <Link
                              href={`/chat?adId=${order.ad.id}&userId=${order.ad.user.id}`}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                              <FiMessageCircle className="w-4 h-4" />
                              Contact Seller
                            </Link>
                          )
                        )}
                        {order.status === 'paid' && (
                          <button
                            onClick={async () => {
                              try {
                                const response = await api.get(
                                  `/user/orders/${order.id}/invoice?type=${order.type}`,
                                  {
                                    responseType: 'blob',
                                  }
                                );

                                const blob = new Blob([response.data], { type: 'application/pdf' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `invoice-${order.id}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                                toast.success('Invoice downloaded successfully');
                              } catch (error: any) {
                                console.error('Error downloading invoice:', error);
                                toast.error(error.response?.data?.message || 'Failed to download invoice. Please try again.');
                              }
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                          >
                            <FiDownload className="w-4 h-4" />
                            Download PDF
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (order.ad?.id) {
                              router.push(getAdUrl(order.ad));
                            } else if (order.status === 'paid') {
                              router.push(`/invoice/${order.id}`);
                            } else {
                              toast.info('Order details will be available after payment');
                            }
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          <FiEye className="w-4 h-4" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Show More Orders Button */}
            {filteredOrders.length > 3 && !showMoreOrders && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowMoreOrders(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
                >
                  Show more orders
                  <FiChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

