'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import ImageWithFallback from '@/components/ImageWithFallback';
import { FiLock, FiUnlock, FiAlertCircle } from 'react-icons/fi';

export default function AdminUsers() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const response = await api.get('/admin/users');
      return response.data;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const response = await api.put(`/admin/users/${id}/role`, { role });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User role updated');
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/admin/users/${id}/block`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User blocked successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to block user');
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/admin/users/${id}/unblock`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User unblocked successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unblock user');
    },
  });

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data?.users.map((user: any) => (
            <tr key={user.id}>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <p className="text-xs font-mono text-gray-600">{user.id}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.id);
                      toast.success('User ID copied to clipboard');
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700 mt-1"
                    title="Click to copy"
                  >
                    Copy
                  </button>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {user.avatar ? (
                    <ImageWithFallback
                      src={user.avatar}
                      alt={user.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span>{user.name[0]}</span>
                    </div>
                  )}
                  <div>
                    <Link 
                      href={`/user/${user.id}`}
                      className="font-semibold hover:text-primary-600 transition-colors"
                    >
                      {user.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {user.isVerified ? 'Verified' : 'Unverified'}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm">{user.email || 'N/A'}</p>
                <p className="text-sm text-gray-500">{user.phone || 'N/A'}</p>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  {user.isDeactivated ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 text-red-800 font-semibold">
                      <FiLock className="w-3 h-3" />
                      Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-800 font-semibold">
                      <FiUnlock className="w-3 h-3" />
                      Active
                    </span>
                  )}
                  {user.isDeactivated && user.deactivatedAt && (
                    <p className="text-xs text-gray-500">
                      Since: {new Date(user.deactivatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded text-xs ${
                  user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm">Ads: {user._count.ads}</p>
                <p className="text-sm">Favorites: {user._count.favorites}</p>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-2">
                  <select
                    value={user.role}
                    onChange={(e) => updateRoleMutation.mutate({ id: user.id, role: e.target.value })}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {user.role !== 'ADMIN' && (
                    <div className="flex gap-1">
                      {user.isDeactivated ? (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to unblock ${user.name}?`)) {
                              unblockUserMutation.mutate(user.id);
                            }
                          }}
                          disabled={unblockUserMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                          title="Unblock user"
                        >
                          <FiUnlock className="w-3 h-3" />
                          User Unblock
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to block ${user.name}? This will prevent them from logging in and using the platform.`)) {
                              blockUserMutation.mutate(user.id);
                            }
                          }}
                          disabled={blockUserMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                          title="Block user"
                        >
                          <FiLock className="w-3 h-3" />
                          User Block
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

