'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiUsers, FiPackage, FiClock, FiCheckCircle, FiDollarSign, FiActivity } from 'react-icons/fi';
import Link from 'next/link';
import ImageWithFallback from '../ImageWithFallback';

export default function AdminStats() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard');
      return response.data.stats;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch recent activity (last 5 users)
  const { data: activityData } = useQuery({
    queryKey: ['admin', 'recent-activity'],
    queryFn: async () => {
      const response = await api.get('/admin/recent-activity?limit=5');
      return response.data.activity;
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Fetch active/online users
  const { data: activeUsersResponse } = useQuery({
    queryKey: ['admin', 'active-users'],
    queryFn: async () => {
      const response = await api.get('/admin/active-users?limit=8');
      return response.data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds (more frequent for online status)
  });

  const activeUsersData = activeUsersResponse?.users || [];
  const onlineCount = activeUsersResponse?.onlineCount || 0;
  const isRealTime = activeUsersResponse?.isRealTime || false;

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  const stats = [
    {
      title: 'Total Users',
      value: data?.totalUsers || 0,
      icon: FiUsers,
      color: 'bg-blue-500',
      subtext: `${onlineCount} online now`
    },
    {
      title: 'Total Ads',
      value: data?.totalAds || 0,
      icon: FiPackage,
      color: 'bg-green-500',
    },
    {
      title: 'Pending Ads',
      value: data?.pendingAds || 0,
      icon: FiClock,
      color: 'bg-yellow-500',
    },
    {
      title: 'Approved Ads',
      value: data?.approvedAds || 0,
      icon: FiCheckCircle,
      color: 'bg-purple-500',
    },
    {
      title: 'Total Revenue',
      value: `₹${(data?.totalRevenue || 0).toLocaleString()}`,
      icon: FiDollarSign,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {stats.map((stat, index) => {
          const gradients = [
            'from-blue-500 to-blue-600',
            'from-green-500 to-green-600',
            'from-yellow-500 to-yellow-600',
            'from-purple-500 to-purple-600',
            'from-indigo-500 to-indigo-600',
          ];
          
          return (
            <div 
              key={stat.title} 
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group hover:-translate-y-1"
            >
              <div className={`h-1 bg-gradient-to-r ${gradients[index]}`}></div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${gradients[index]} shadow-lg group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    +12%
                  </span>
                </div>
                <div>
                  <p className="text-gray-600 text-xs font-medium uppercase tracking-wide">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  {stat.subtext ? (
                    <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      {stat.subtext}
                    </p>
                  ) : (
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      ↑ vs last month
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Overview</h3>
          <div className="h-64 flex items-end justify-around gap-2">
            {[65, 45, 78, 52, 88, 72, 95, 60, 70, 85, 92, 100].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg hover:from-blue-600 hover:to-blue-500 transition-all cursor-pointer"
                  style={{ height: `${height}%` }}
                  title={`Month ${i + 1}: ₹${(height * 100).toLocaleString()}`}
                ></div>
                <span className="text-xs text-gray-500">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">User Activity</h3>
          <div className="space-y-4">
            {[
              { label: 'New Users', value: 85, color: 'bg-green-500' },
              { label: 'Active Ads', value: 92, color: 'bg-blue-500' },
              { label: 'Transactions', value: 73, color: 'bg-purple-500' },
              { label: 'Messages', value: 68, color: 'bg-yellow-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <span className="font-bold text-gray-900">{item.value}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Active Users Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Activity Table */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiActivity className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
              <span className="text-xs text-gray-500">(Last 5 users)</span>
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Live Updates
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activityData && activityData.length > 0 ? (
                  activityData.map((activity: any, index: number) => {
                    const statusColor = 
                      activity.status === 'PENDING' ? 'yellow' :
                      activity.status === 'APPROVED' ? 'green' :
                      activity.status === 'REJECTED' ? 'red' :
                      'green';
                    
                    const timeAgo = (date: string) => {
                      const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
                      if (seconds < 60) return `${seconds} secs ago`;
                      const minutes = Math.floor(seconds / 60);
                      if (minutes < 60) return `${minutes} mins ago`;
                      const hours = Math.floor(minutes / 60);
                      if (hours < 24) return `${hours} hours ago`;
                      return `${Math.floor(hours / 24)} days ago`;
                    };

                    return (
                      <tr key={index} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {activity.user.avatar ? (
                              <ImageWithFallback
                                src={activity.user.avatar}
                                alt={activity.user.name}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                {activity.user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm font-medium text-gray-900">{activity.user.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="max-w-xs truncate">{activity.action}</div>
                          {activity.title && activity.title !== activity.action && (
                            <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">{activity.title}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`
                            px-3 py-1 rounded-full text-xs font-semibold
                            ${statusColor === 'green' ? 'bg-green-100 text-green-700' : ''}
                            ${statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
                            ${statusColor === 'red' ? 'bg-red-100 text-red-700' : ''}
                          `}>
                            {activity.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {timeAgo(activity.timestamp)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No recent activity
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Online Users Card */}
        <div className="bg-white rounded-xl shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiUsers className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">Online Users</h3>
              </div>
              <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-green-700">{onlineCount} Online</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isRealTime ? 'Active in last 15 minutes' : 'Active today'}
            </p>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {activeUsersData && activeUsersData.length > 0 ? (
              activeUsersData.map((user: any, index: number) => {
                // Check if user is truly online (recent activity)
                const minutesAgo = Math.floor((new Date().getTime() - new Date(user.updatedAt || user.createdAt).getTime()) / 60000);
                const isOnlineNow = minutesAgo <= 15;
                
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {user.avatar ? (
                          <ImageWithFallback
                            src={user.avatar}
                            alt={user.name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold ring-2 ring-white shadow-lg">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Online indicator badge */}
                        {isOnlineNow && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-500">{user._count?.ads || 0} ads</p>
                          {isOnlineNow && (
                            <span className="text-xs font-medium text-green-600">• Active now</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${isOnlineNow ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <div className={`w-2 h-2 rounded-full ${isOnlineNow ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                      <span className={`text-xs font-medium ${isOnlineNow ? 'text-green-600' : 'text-gray-500'}`}>
                        {isOnlineNow ? 'Online' : `${minutesAgo}m ago`}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FiUsers className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No users online</p>
                <p className="text-xs text-gray-400 mt-1">Check back soon</p>
              </div>
            )}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <Link 
              href="/admin?tab=users"
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold block text-center"
            >
              View all users →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

