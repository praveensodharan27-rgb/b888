'use client';

import { useState } from 'react';
import { FiPhone, FiX } from 'react-icons/fi';
import api from '@/lib/api';
import toast from '@/lib/toast';

interface RequestContactButtonProps {
  sellerId: string;
  sellerName: string;
  adId?: string;
  className?: string;
}

export default function RequestContactButton({ 
  sellerId, 
  sellerName, 
  adId, 
  className = '' 
}: RequestContactButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const response = await api.post('/contact-request', {
        sellerId,
        adId,
        message
      });

      if (response.data.success) {
        toast.success('Contact request sent successfully!');
        setShowModal(false);
        setMessage('');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send contact request';
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${className}`}
      >
        <FiPhone className="w-5 h-5" />
        <span>Request Contact</span>
      </button>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Request Contact</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Request {sellerName}'s contact information. They will be notified and can choose to share their phone number with you.
            </p>

            <div className="mb-4">
              <label htmlFor="requestMessage" className="block text-sm font-medium text-gray-700 mb-2">
                Message (Optional)
              </label>
              <textarea
                id="requestMessage"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself or explain why you want to contact..."
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-gray-700">
                ℹ️ The seller can approve or reject your request. If approved, their phone number will be shared with you via chat.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Request'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={sending}
                className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

