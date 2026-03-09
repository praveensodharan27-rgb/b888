'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { FiCreditCard, FiPackage, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiEye, FiUser } from 'react-icons/fi';
import { format, differenceInDays, isAfter } from 'date-fns';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';
import { getAdUrl } from '@/lib/directory';

export default function AdminOrdersPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'premium' | 'ad-posting'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [userIdFilter, setUserIdFilter] = useState('');

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading: ordersLoading, refetch } = useQuery({
    queryKey: ['adminOrders', filter, statusFilter, userIdFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('type', filter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (userIdFilter) params.append('userId', userIdFilter);
      const response = await api.get(`/admin/orders?${params.toString()}`);
      return response.data;
    },
    enabled: isAdmin && mounted,
  });

  useEffect(() => {
    if (mounted && !authLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, authLoading, router, mounted]);

  if (!mounted || authLoading || ordersLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
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

  // Calculate total revenue
  const totalRevenue = orders
    .filter((o: any) => o.status === 'paid')
    .reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1400px]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Orders</h1>
        <p className="text-gray-600">Manage all payment orders and transactions</p>
        {totalRevenue > 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <span className="font-semibold">Total Revenue (Paid Orders):</span>{' '}
              <span className="text-lg font-bold">₹{totalRevenue.toLocaleString('en-IN')}</span>
            </p>
          </div>
        )}
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
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">User ID:</label>
          <input
            type="text"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            placeholder="Filter by user ID"
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600">No orders match your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {order.type === 'premium' ? (
                      <FiCreditCard className="w-5 h-5 text-primary-600" />
                    ) : (
                      <FiPackage className="w-5 h-5 text-blue-600" />
                    )}
                    <h3 className="text-lg font-semibold">{getOrderTypeLabel(order)}</h3>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">
                      ₹{order.amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  {/* User Info */}
                  {order.user && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FiUser className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">User:</span>
                      </div>
                      <div className="pl-6">
                        <p className="font-medium text-gray-900">{order.user.name}</p>
                        {order.user.email && (
                          <p className="text-sm text-gray-600">{order.user.email}</p>
                        )}
                        {order.user.phone && (
                          <p className="text-sm text-gray-600">{order.user.phone}</p>
                        )}
                        <p className="text-xs text-gray-500 font-mono mt-1">ID: {order.user.id}</p>
                      </div>
                    </div>
                  )}

                  {/* Ad Info */}
                  {order.ad && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FiPackage className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Ad:</span>
                      </div>
                      <div className="pl-6 flex items-center gap-3">
                        {order.ad.images && order.ad.images.length > 0 && (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            <ImageWithFallback
                              src={Array.isArray(order.ad.images) ? order.ad.images[0] : order.ad.images}
                              alt={order.ad.title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{order.ad.title}</p>
                          <p className="text-xs text-gray-500">Status: {order.ad.status}</p>
                          {order.ad.id && (
                            <Link
                              href={getAdUrl(order.ad)}
                              className="text-sm text-primary-600 hover:underline flex items-center gap-1 mt-1"
                            >
                              <FiEye className="w-3 h-3" /> View Ad
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Details */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {order.razorpayOrderId && (
                      <div>
                        <span className="text-gray-600">Razorpay Order ID:</span>
                        <p className="font-mono text-xs text-gray-900 mt-1 break-all">{order.razorpayOrderId}</p>
                      </div>
                    )}
                    {order.razorpayPaymentId && (
                      <div>
                        <span className="text-gray-600">Payment ID:</span>
                        <p className="font-mono text-xs text-gray-900 mt-1 break-all">{order.razorpayPaymentId}</p>
                      </div>
                    )}
                    {order.expiresAt && (() => {
                      const expiresAt = new Date(order.expiresAt);
                      const now = new Date();
                      const daysLeft = differenceInDays(expiresAt, now);
                      const isExpired = !isAfter(expiresAt, now);
                      
                      return (
                        <div>
                          <span className="text-gray-600">Ad Expires:</span>
                          <div className="mt-1">
                            <p className={`font-semibold ${
                              isExpired 
                                ? 'text-red-600' 
                                : daysLeft <= 1 
                                ? 'text-orange-600' 
                                : 'text-gray-900'
                            }`}>
                              {isExpired 
                                ? 'Expired' 
                                : daysLeft === 0 
                                ? 'Today' 
                                : daysLeft === 1 
                                ? '1 day left' 
                                : `${daysLeft} days left`}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {format(expiresAt, 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                    <div>
                      <span className="text-gray-600">Order ID:</span>
                      <p className="font-mono text-xs text-gray-900 mt-1 break-all">{order.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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

