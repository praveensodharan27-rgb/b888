'use client';

import { useState, useEffect } from 'react';
import { FiX, FiDownload, FiLoader } from 'react-icons/fi';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  billedTo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  from: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    amount: number;
  }>;
  total: number;
  paymentMethod: string;
  note: string;
}

interface InvoiceProps {
  orderId: string;
  orderType: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Invoice({ orderId, orderType, isOpen, onClose }: InvoiceProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      loadInvoiceData();
    }
  }, [isOpen, orderId, orderType]);

  const loadInvoiceData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/user/orders/${orderId}/invoice-data?type=${orderType}`);
      if (response.data.success) {
        setInvoiceData(response.data.invoice);
      } else {
        toast.error('Failed to load invoice data');
      }
    } catch (error: any) {
      console.error('Error loading invoice:', error);
      toast.error(error.response?.data?.message || 'Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await api.get(`/user/orders/${orderId}/invoice?type=${orderType}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Invoice downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast.error(error.response?.data?.message || 'Failed to download invoice');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Invoice</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                disabled={isDownloading || isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <FiDownload className="w-4 h-4" />
                )}
                Download PDF
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <FiLoader className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading invoice...</p>
                </div>
              </div>
            ) : invoiceData ? (
              <div className="bg-white">
                {/* Invoice Header */}
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center">
                    <Image
                      src="/logo.png"
                      alt="SellIt Logo"
                      width={120}
                      height={40}
                      className="h-10 w-auto object-contain"
                      priority
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Invoice Number</div>
                    <div className="text-lg font-bold text-gray-900">
                      NO. {String(invoiceData.invoiceNumber).padStart(6, '0')}
                    </div>
                  </div>
                </div>

                {/* Invoice Title */}
                <div className="text-center mb-8 border-b border-gray-200 pb-6">
                  <h1 className="text-6xl font-bold text-gray-900 mb-3 tracking-tight">INVOICE</h1>
                  <p className="text-base text-gray-600 font-medium">Date: {invoiceData.date}</p>
                </div>

                {/* Billed To and From */}
                <div className="grid grid-cols-2 gap-12 mb-10">
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Billed to:</h3>
                    <div className="space-y-2">
                      <p className="text-gray-800 font-semibold text-lg">{invoiceData.billedTo.name}</p>
                      {invoiceData.billedTo.address && (
                        <p className="text-gray-600 text-sm">{invoiceData.billedTo.address}</p>
                      )}
                      {invoiceData.billedTo.email && (
                        <p className="text-gray-600 text-sm">{invoiceData.billedTo.email}</p>
                      )}
                      {invoiceData.billedTo.phone && (
                        <p className="text-gray-600 text-sm">{invoiceData.billedTo.phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-5 border border-orange-200">
                    <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">From:</h3>
                    <div className="space-y-2">
                      <p className="text-gray-800 font-semibold text-lg">{invoiceData.from.name}</p>
                      {invoiceData.from.address && (
                        <p className="text-gray-600 text-sm">{invoiceData.from.address}</p>
                      )}
                      {invoiceData.from.email && (
                        <p className="text-gray-600 text-sm">{invoiceData.from.email}</p>
                      )}
                      {invoiceData.from.phone && (
                        <p className="text-gray-600 text-sm">{invoiceData.from.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-800 to-gray-700">
                        <th className="text-left py-4 px-6 font-bold text-white text-sm uppercase tracking-wide">Item</th>
                        <th className="text-center py-4 px-6 font-bold text-white text-sm uppercase tracking-wide">Quantity</th>
                        <th className="text-right py-4 px-6 font-bold text-white text-sm uppercase tracking-wide">Price</th>
                        <th className="text-right py-4 px-6 font-bold text-white text-sm uppercase tracking-wide">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.items.map((item, index) => (
                        <tr 
                          key={index} 
                          className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50 transition-colors`}
                        >
                          <td className="py-4 px-6 text-gray-800 font-medium">{item.description}</td>
                          <td className="py-4 px-6 text-gray-700 text-center">{item.quantity}</td>
                          <td className="py-4 px-6 text-gray-700 text-right">
                            ₹{item.price.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-6 text-gray-900 font-semibold text-right">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="flex justify-end mb-8">
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 shadow-lg min-w-[300px]">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white mb-2 uppercase tracking-wide">Total</p>
                      <p className="text-4xl font-bold text-white">
                        ₹{invoiceData.total.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Method and Note */}
                <div className="mb-8 bg-blue-50 rounded-lg p-6 border border-blue-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Payment method:</p>
                      <p className="text-base text-gray-800 font-medium">{invoiceData.paymentMethod}</p>
                    </div>
                  </div>
                  <div className="border-t border-blue-200 pt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Note:</p>
                    <p className="text-base text-gray-800">{invoiceData.note}</p>
                  </div>
                </div>

                {/* Decorative Footer */}
                <div className="relative mt-12 h-24 overflow-hidden">
                  <svg
                    className="absolute bottom-0 left-0 w-full h-full"
                    viewBox="0 0 1200 100"
                    preserveAspectRatio="none"
                  >
                    {/* Light grey wave */}
                    <path
                      d="M 0 50 Q 300 30 600 50 T 1200 50 L 1200 100 L 0 100 Z"
                      fill="#e5e7eb"
                    />
                    {/* Dark grey wave */}
                    <path
                      d="M 0 60 Q 300 80 600 60 T 1200 60 L 1200 100 L 0 100 Z"
                      fill="#4b5563"
                    />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-600">No invoice data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

