'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiRefreshCw, FiTrendingUp, FiTrendingDown, FiDollarSign } from 'react-icons/fi';
import { format } from 'date-fns';

export default function WalletBalance() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: async () => {
      try {
        const response = await api.get('/wallet/balance');
        if (response.data.success) {
          return response.data;
        }
        throw new Error(response.data.message || 'Failed to fetch wallet');
      } catch (err: any) {
        console.error('Wallet API error:', err);
        throw err;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <p className="mb-4">Failed to load wallet information.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Debug logging
  if (process.env.NODE_ENV === 'development' && data) {
    console.log('Wallet data:', data);
  }

  const balance = data?.balance ?? 0;
  const recentTransactions = data?.transactions ?? [];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Wallet</h2>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <FiRefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">Available Balance</p>
            <p className="text-4xl font-bold">₹{balance.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white/20 rounded-full p-4">
            <FiDollarSign className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FiDollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((transaction: any) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      transaction.type === 'CREDIT'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {transaction.type === 'CREDIT' ? (
                      <FiTrendingUp className="w-5 h-5" />
                    ) : (
                      <FiTrendingDown className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {transaction.description || 'Transaction'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${
                      transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'CREDIT' ? '+' : '-'}₹
                    {transaction.amount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{transaction.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

