'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from '@/lib/toast';
import ImageWithFallback from '../ImageWithFallback';
import { getAdUrl } from '@/lib/directory';

export default function AdminAds() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ads', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const response = await api.get(`/admin/ads?${params.toString()}`);
      return response.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const response = await api.put(`/admin/ads/${id}/status`, { status, reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] });
      toast.success('Ad status updated');
    },
  });

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  if (isLoading) {
    return <div>Loading ads...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.ads.map((ad: any) => (
              <tr key={ad.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    {ad.images && ad.images.length > 0 && (
                      <ImageWithFallback
                        src={ad.images[0]}
                        alt={ad.title}
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{ad.title}</p>
                      <p className="text-sm text-gray-500">₹{ad.price.toLocaleString()}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Link 
                    href={`/user/${ad.user.id}`}
                    className="hover:text-primary-600 transition-colors"
                  >
                    <p className="font-medium">{ad.user.name}</p>
                  </Link>
                  <p className="text-sm text-gray-500">{ad.user.email || ad.user.phone}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    ad.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    ad.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {ad.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {ad.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(ad.id, 'APPROVED')}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(ad.id, 'REJECTED')}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <a
                      href={getAdUrl(ad)}
                      target="_blank"
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      View
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

