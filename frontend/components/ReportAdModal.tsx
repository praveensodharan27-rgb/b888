'use client';

import { useState } from 'react';
import { FiFlag, FiX } from 'react-icons/fi';
import api from '@/lib/api';
import toast from '@/lib/toast';

const REASONS = [
  { value: 'scam', label: 'Scam / Fraud' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'fake', label: 'Fake listing' },
  { value: 'other', label: 'Other' },
];

type Props = {
  adId: string;
  onClose: () => void;
};

export default function ReportAdModal({ adId, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reports', {
        reportType: 'AD',
        adId,
        reason,
        message: message.trim() || undefined,
      });
      toast.success('Report submitted. We will review it shortly.');
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit report';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FiFlag className="w-5 h-5 text-red-500" />
            Report this ad
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            required
          >
            <option value="">Select a reason</option>
            {REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <label className="block text-sm font-medium text-gray-700 mb-2">Details (optional)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Any additional details..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 resize-none"
            rows={3}
            maxLength={1000}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
