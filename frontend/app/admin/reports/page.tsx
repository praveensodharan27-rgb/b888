'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from '@/lib/toast';
import { FiFlag, FiRefreshCw, FiChevronDown, FiExternalLink } from 'react-icons/fi';
import Link from 'next/link';
import { getAdUrl } from '@/lib/directory';

type Report = {
  id: string;
  reportType: string;
  adId?: string;
  targetUserId?: string;
  reporterId: string;
  reason: string;
  message?: string;
  status: string;
  adminNotes?: string;
  reviewedAt?: string;
  createdAt: string;
  ad?: { id: string; title: string; status: string } | null;
  reporter?: { id: string; name: string; email?: string } | null;
  targetUser?: { id: string; name: string; email?: string } | null;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('reportType', typeFilter);
      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.limit));
      const res = await api.get(`/reports/admin?${params}`);
      setReports(res.data.reports || []);
      setPagination(prev => ({
        ...prev,
        total: res.data.pagination?.total ?? 0,
        totalPages: res.data.pagination?.totalPages ?? 0,
      }));
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, typeFilter, pagination.page]);

  const handleStatusChange = async (reportId: string, status: string) => {
    setUpdatingId(reportId);
    try {
      await api.patch(`/reports/admin/${reportId}`, {
        status,
        adminNotes: notes[reportId] || undefined,
      });
      toast.success('Report updated');
      fetchReports();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update');
    } finally {
      setUpdatingId(null);
    }
  };

  const reasonLabel: Record<string, string> = {
    scam: 'Scam / Fraud',
    spam: 'Spam',
    inappropriate: 'Inappropriate',
    fake: 'Fake listing',
    other: 'Other',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <FiFlag className="w-7 h-7 text-red-500" />
        Reports
      </h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">All types</option>
          <option value="AD">Ad</option>
          <option value="USER">User</option>
        </select>
        <button
          type="button"
          onClick={() => fetchReports()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          No reports found.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 mr-2">
                    {r.reportType}
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                    {reasonLabel[r.reason] || r.reason}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
                <select
                  value={r.status}
                  onChange={e => handleStatusChange(r.id, e.target.value)}
                  disabled={updatingId === r.id}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="PENDING">Pending</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
              </div>
              {r.reportType === 'AD' && r.ad && (
                <p className="mt-2 text-gray-900">
                  Ad: <Link href={getAdUrl(r.ad)} className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    {r.ad.title} <FiExternalLink className="w-3 h-3" />
                  </Link>
                </p>
              )}
              {r.reportType === 'USER' && r.targetUser && (
                <p className="mt-2 text-gray-900">
                  Reported user: <Link href={`/user/${r.targetUser.id}`} className="text-blue-600 hover:underline">
                    {r.targetUser.name}
                  </Link>
                </p>
              )}
              <p className="mt-1 text-sm text-gray-600">
                Reported by: {r.reporter?.name || r.reporterId}
              </p>
              {r.message && (
                <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded">{r.message}</p>
              )}
              <div className="mt-2">
                <label className="block text-xs text-gray-500 mb-1">Admin notes</label>
                <input
                  type="text"
                  value={notes[r.id] ?? r.adminNotes ?? ''}
                  onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="Optional notes"
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="py-2 text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
