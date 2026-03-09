'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Invoice from '@/components/Invoice';
import api from '@/lib/api';

interface InvoiceData {
  invoiceNumber: string;
  dateIssued: string;
  dueDate: string;
  seller: {
    name: string;
    address: string;
    email: string;
    phone?: string;
  };
  buyer: {
    name: string;
    address: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    details?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  paymentInfo?: {
    bank: string;
    accountName: string;
    accountNumber: string;
    ifsc?: string;
  };
  notes?: string;
}

export default function InvoicePage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        // Replace with your actual API endpoint
        const response = await api.get(`/invoices/${params.id}`);
        setInvoice(response.data);
      } catch (err: any) {
        console.error('Error fetching invoice:', err);
        
        // For demo purposes, use sample data if API fails
        const sampleInvoice: InvoiceData = {
          invoiceNumber: `#INV-2024-${params.id}`,
          dateIssued: new Date().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          seller: {
            name: 'Sell Box Marketplace',
            address: '123 Business Park, Tech City, Mumbai, Maharashtra 400001',
            email: 'billing@sellit.com',
            phone: '+91 98765 43210'
          },
          buyer: {
            name: 'Customer Name',
            address: '456 Customer Street, City, State 123456',
            email: 'customer@example.com',
            phone: '+91 98765 12345'
          },
          items: [
            {
              description: 'Premium Ad Listing',
              details: 'Featured placement for 30 days with top visibility',
              quantity: 1,
              price: 2500,
              total: 2500
            },
            {
              description: 'Business Package - Gold',
              details: 'Unlimited ads posting for 3 months',
              quantity: 1,
              price: 5000,
              total: 5000
            },
            {
              description: 'Sponsored Ad Campaign',
              details: 'Promoted listing with 10,000 impressions',
              quantity: 1,
              price: 1500,
              total: 1500
            }
          ],
          subtotal: 9000,
          tax: 1620,
          taxRate: 18,
          total: 10620,
          paymentInfo: {
            bank: 'HDFC Bank',
            accountName: 'Sell Box Marketplace Pvt Ltd',
            accountNumber: '1234567890',
            ifsc: 'HDFC0001234'
          },
          notes: 'Thank you for choosing Sell Box Marketplace. For any queries, please contact our support team.'
        };
        
        setInvoice(sampleInvoice);
        setError('Using sample data for demonstration');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchInvoice();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-2">Invoice not found</p>
          <p className="text-gray-600">The invoice you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {error && (
        <div className="max-w-4xl mx-auto mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">{error}</p>
        </div>
      )}
      <Invoice {...invoice} />
    </div>
  );
}
