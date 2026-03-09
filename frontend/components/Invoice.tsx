'use client';

import { useRef } from 'react';
import { FiDownload, FiPrinter, FiMail } from 'react-icons/fi';

interface InvoiceItem {
  description: string;
  details?: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoiceProps {
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
  items: InvoiceItem[];
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

export default function Invoice({
  invoiceNumber,
  dateIssued,
  dueDate,
  seller,
  buyer,
  items,
  subtotal,
  tax,
  taxRate,
  total,
  paymentInfo,
  notes
}: InvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    try {
      // Dynamic import to reduce bundle size
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = invoiceRef.current;
      if (!element) return;

      const opt = {
        margin: 10,
        filename: `invoice-${invoiceNumber}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = `Invoice ${invoiceNumber}`;
    const body = `Please find attached invoice ${invoiceNumber} for ₹${total.toLocaleString('en-IN')}`;
    window.location.href = `mailto:${buyer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Action Buttons - Hidden in print */}
      <div className="flex justify-end gap-3 mb-6 print:hidden">
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <FiDownload className="w-4 h-4" />
          Download PDF
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <FiPrinter className="w-4 h-4" />
          Print
        </button>
        <button
          onClick={handleEmail}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiMail className="w-4 h-4" />
          Email
        </button>
      </div>

      {/* Invoice Document */}
      <div
        ref={invoiceRef}
        className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 md:p-12"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-2xl font-bold">S</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{seller.name}</h1>
                <p className="text-sm text-gray-600">Marketplace Platform</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 max-w-xs">{seller.address}</p>
            <p className="text-sm text-gray-600">{seller.email}</p>
            {seller.phone && <p className="text-sm text-gray-600">{seller.phone}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold text-gray-300 mb-2">INVOICE</h2>
            <p className="text-xl font-bold text-primary-600 mb-1">{invoiceNumber}</p>
            <p className="text-sm text-gray-600">Date: {dateIssued}</p>
            <p className="text-sm text-gray-600">Due: {dueDate}</p>
          </div>
        </div>

        {/* Bill To & Ship To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              BILL TO
            </h3>
            <p className="font-bold text-gray-900 text-lg mb-1">{buyer.name}</p>
            <p className="text-sm text-gray-600">{buyer.address}</p>
            <p className="text-sm text-gray-600">{buyer.email}</p>
            {buyer.phone && <p className="text-sm text-gray-600">{buyer.phone}</p>}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              PAYMENT TERMS
            </h3>
            <p className="text-sm text-gray-600">Due Date: {dueDate}</p>
            <p className="text-sm text-gray-600">Payment Method: Bank Transfer</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="text-center py-3 text-sm font-semibold text-gray-700 uppercase tracking-wider w-20">
                  Qty
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700 uppercase tracking-wider w-32">
                  Price
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700 uppercase tracking-wider w-32">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-4">
                    <p className="font-semibold text-gray-900">{item.description}</p>
                    {item.details && (
                      <p className="text-sm text-gray-600 mt-1">{item.details}</p>
                    )}
                  </td>
                  <td className="py-4 text-center text-gray-700">{item.quantity}</td>
                  <td className="py-4 text-right text-gray-700">
                    ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 text-right font-semibold text-gray-900">
                    ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-full md:w-80">
            <div className="flex justify-between py-2 text-gray-700">
              <span>Subtotal:</span>
              <span className="font-semibold">
                ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between py-2 text-gray-700 border-b border-gray-200">
              <span>Tax ({taxRate}%):</span>
              <span className="font-semibold">
                ₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b-2 border-primary-600">
              <span className="text-lg font-bold text-gray-900">Grand Total:</span>
              <span className="text-2xl font-bold text-primary-600">
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        {paymentInfo && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              PAYMENT INFORMATION
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Bank:</p>
                <p className="font-semibold text-gray-900">{paymentInfo.bank}</p>
              </div>
              <div>
                <p className="text-gray-600">Account Name:</p>
                <p className="font-semibold text-gray-900">{paymentInfo.accountName}</p>
              </div>
              <div>
                <p className="text-gray-600">Account Number:</p>
                <p className="font-semibold text-gray-900">{paymentInfo.accountNumber}</p>
              </div>
              {paymentInfo.ifsc && (
                <div>
                  <p className="text-gray-600">IFSC Code:</p>
                  <p className="font-semibold text-gray-900">{paymentInfo.ifsc}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes & Footer */}
        <div className="flex justify-between items-end pt-6 border-t border-gray-200">
          <div className="max-w-md">
            {notes && (
              <>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  NOTES
                </h3>
                <p className="text-sm text-gray-600">{notes}</p>
              </>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Thank you for your business!
            </p>
            <p className="text-xs text-gray-500">
              Payment is due within 14 days of invoice date.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
