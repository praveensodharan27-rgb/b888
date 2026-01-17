'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { FiCreditCard, FiPackage, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiEye, FiDownload, FiFileText } from 'react-icons/fi';
import { format, differenceInDays, isAfter } from 'date-fns';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';
import Invoice from '@/components/Invoice';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'premium' | 'ad-posting'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<{ orderId: string; orderType: string } | null>(null);

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

  const orders = data?.orders || [];
  const pagination = data?.pagination || {};

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FiCheckCircle className="w-3 h-3 mr-1" /> Paid
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FiClock className="w-3 h-3 mr-1" /> Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FiXCircle className="w-3 h-3 mr-1" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <FiAlertCircle className="w-3 h-3 mr-1" /> {status}
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-gray-600">View all your payment orders and transactions</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Type:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Orders</option>
            <option value="premium">Premium Orders</option>
            <option value="ad-posting">Ad Posting Orders</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600 mb-6">You haven't made any orders yet.</p>
          <Link
            href="/post-ad"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Post Your First Ad
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {order.type === 'premium' ? (
                      <FiCreditCard className="w-5 h-5 text-primary-600" />
                    ) : (
                      <FiPackage className="w-5 h-5 text-blue-600" />
                    )}
                    <h3 className="text-lg font-semibold">{getOrderTypeLabel(order)}</h3>
                    {getStatusBadge(order.status)}
                  </div>

                  {order.ad && (
                    <div className="flex items-center gap-4 mt-3">
                      {order.ad.images && order.ad.images.length > 0 && (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                          <ImageWithFallback
                            src={Array.isArray(order.ad.images) ? order.ad.images[0] : order.ad.images}
                            alt={order.ad.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{order.ad.title}</p>
                        {order.ad.id && (
                          <Link
                            href={`/ads/${order.ad.id}`}
                            className="text-sm text-primary-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            <FiEye className="w-3 h-3" /> View Ad
                          </Link>
                        )}
                        {order.expiresAt && (() => {
                          const expiresAt = new Date(order.expiresAt);
                          const now = new Date();
                          const daysLeft = differenceInDays(expiresAt, now);
                          const isExpired = !isAfter(expiresAt, now);
                          
                          return (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-gray-500">Expires:</span>
                              <span className={`text-xs font-semibold ${
                                isExpired 
                                  ? 'text-red-600' 
                                  : daysLeft <= 1 
                                  ? 'text-orange-600' 
                                  : 'text-gray-700'
                              }`}>
                                {isExpired 
                                  ? 'Expired' 
                                  : daysLeft === 0 
                                  ? 'Today' 
                                  : daysLeft === 1 
                                  ? '1 day left' 
                                  : `${daysLeft} days left`}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({format(expiresAt, 'MMM d, yyyy h:mm a')})
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Amount:</span>{' '}
                      <span className="text-lg font-bold text-primary-600">₹{order.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="font-medium">Date:</span>{' '}
                      {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                    </div>
                    {order.razorpayOrderId && (
                      <div>
                        <span className="font-medium">Order ID:</span>{' '}
                        <span className="font-mono text-xs">{order.razorpayOrderId}</span>
                      </div>
                    )}
                  </div>

                  {/* Invoice Buttons */}
                  {order.status === 'paid' && (
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => setSelectedInvoice({ orderId: order.id, orderType: order.type })}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FiFileText className="w-4 h-4" />
                        View Invoice
                      </button>
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
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <FiDownload className="w-4 h-4" />
                        Download PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <Invoice
          orderId={selectedInvoice.orderId}
          orderType={selectedInvoice.orderType}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => {
                // TODO: Implement pagination
                refetch();
              }}
              className={`px-4 py-2 rounded-lg ${
                page === pagination.page
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

