'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { FiMail, FiSettings, FiBarChart2, FiTrash2, FiRefreshCw, FiClock, FiUsers, FiSearch, FiCheck, FiX } from 'react-icons/fi';

interface SearchAlertSettings {
  id: string;
  enabled: boolean;
  maxEmailsPerUser: number;
  checkIntervalHours: number;
  emailSubject: string;
  emailBody: string;
  createdAt: string;
  updatedAt: string;
}

interface Statistics {
  totalQueries: number;
  processedQueries: number;
  pendingQueries: number;
  uniqueUsers: number;
  queriesLast7Days: number;
  topQueries: { query: string; count: number }[];
}

export default function SearchAlertsAdmin() {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<SearchAlertSettings | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testQuery, setTestQuery] = useState('iPhone 13');
  const [activeTab, setActiveTab] = useState<'settings' | 'statistics'>('settings');

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, isLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
      fetchStatistics();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/search-alerts/settings');
      if (response.data.success) {
        setSettings(response.data.settings);
      }
    } catch (error: any) {
      toast.error('Failed to fetch settings');
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/search-alerts/statistics');
      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await api.put('/search-alerts/settings', settings);

      if (response.data.success) {
        toast.success('Settings saved successfully!');
        setSettings(response.data.settings);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/search-alerts/test-email', {
        email: testEmail,
        testQuery,
      });

      if (response.data.success) {
        toast.success('Test email sent successfully!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send test email');
    } finally {
      setSaving(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Delete processed queries older than 30 days?')) return;

    setSaving(true);
    try {
      const response = await api.delete('/search-alerts/queries/cleanup?days=30');

      if (response.data.success) {
        toast.success(`Cleanup completed: ${response.data.deletedCount} queries deleted`);
        fetchStatistics();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cleanup queries');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="w-full px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Alerts Management</h1>
        <p className="text-gray-600">Configure and monitor the search alerts system</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-4 px-4 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiSettings className="w-5 h-5" />
          Settings
        </button>
        <button
          onClick={() => setActiveTab('statistics')}
          className={`pb-4 px-4 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'statistics'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiBarChart2 className="w-5 h-5" />
          Statistics
        </button>
      </div>

      {/* Statistics Tab */}
      {activeTab === 'statistics' && statistics && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Queries</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totalQueries}</p>
                </div>
                <FiSearch className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Processed</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.processedQueries}</p>
                </div>
                <FiCheck className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{statistics.pendingQueries}</p>
                </div>
                <FiClock className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Unique Users</p>
                  <p className="text-2xl font-bold text-purple-600">{statistics.uniqueUsers}</p>
                </div>
                <FiUsers className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Last 7 Days</p>
                  <p className="text-2xl font-bold text-indigo-600">{statistics.queriesLast7Days}</p>
                </div>
                <FiBarChart2 className="w-8 h-8 text-indigo-500" />
              </div>
            </div>
          </div>

          {/* Top Queries */}
          {statistics.topQueries.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Top Searched Queries</h2>
                <button
                  onClick={fetchStatistics}
                  className="text-primary-600 hover:text-primary-700 flex items-center gap-2"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              <div className="space-y-3">
                {statistics.topQueries.map((item, index) => (
                  <div key={index} className="flex justify-between items-center pb-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary-100 text-primary-600 rounded-full font-semibold text-sm">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{item.query}</span>
                    </div>
                    <span className="text-gray-500 font-medium">{item.count} searches</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Maintenance</h2>
            <p className="text-gray-600 mb-4">Clean up old processed queries to optimize database performance.</p>
            <button
              onClick={handleCleanup}
              disabled={saving}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2 transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
              {saving ? 'Cleaning...' : 'Cleanup Old Queries (30+ days)'}
            </button>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className="space-y-6">
          {/* Alert Settings */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FiSettings className="w-6 h-6" />
              Alert Settings
            </h2>

            <div className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="font-medium text-gray-900 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                    Enable Search Alerts
                  </label>
                  <p className="text-sm text-gray-500 ml-7 mt-1">
                    Turn the search alerts system on or off globally
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  settings.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {settings.enabled ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Max Emails Per User */}
              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  Max Emails Per User (per check)
                </label>
                <input
                  type="number"
                  value={settings.maxEmailsPerUser}
                  onChange={(e) => setSettings({ ...settings, maxEmailsPerUser: parseInt(e.target.value) })}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="1"
                  max="100"
                />
                <p className="text-sm text-gray-500 mt-1">Limit alerts per user to prevent spam (1-100)</p>
              </div>

              {/* Check Interval */}
              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  Check Interval (hours)
                </label>
                <input
                  type="number"
                  value={settings.checkIntervalHours}
                  onChange={(e) => setSettings({ ...settings, checkIntervalHours: parseInt(e.target.value) })}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="1"
                  max="168"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Cron runs hourly - this controls which queries to process (1-168 hours)
                </p>
              </div>

              {/* Email Subject */}
              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={settings.emailSubject}
                  onChange={(e) => setSettings({ ...settings, emailSubject: e.target.value })}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="New products matching your search!"
                />
              </div>

              {/* Email Body */}
              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  Email Body (HTML)
                </label>
                <textarea
                  value={settings.emailBody}
                  onChange={(e) => setSettings({ ...settings, emailBody: e.target.value })}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={10}
                  placeholder="<p>Hi! Found products for {{query}}</p>{{products}}"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Available variables: <code className="bg-gray-100 px-2 py-1 rounded">{'{{query}}'}</code>,{' '}
                  <code className="bg-gray-100 px-2 py-1 rounded">{'{{products}}'}</code>,{' '}
                  <code className="bg-gray-100 px-2 py-1 rounded">{'{{count}}'}</code>
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Test Email */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FiMail className="w-6 h-6" />
              Test Email
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  Test Query
                </label>
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="iPhone 13"
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleTestEmail}
                disabled={saving}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FiMail className="w-4 h-4" />
                {saving ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

