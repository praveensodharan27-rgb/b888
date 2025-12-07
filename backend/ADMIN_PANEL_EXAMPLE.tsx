// Example Admin Panel Component for Search Alerts
// Place this in your Next.js frontend: frontend/app/admin/search-alerts/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Adjust import path

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
  const { token, user } = useAuth();
  const [settings, setSettings] = useState<SearchAlertSettings | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testQuery, setTestQuery] = useState('iPhone 13');
  const [message, setMessage] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchSettings();
      fetchStatistics();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/search-alerts/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/search-alerts/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/search-alerts/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Settings saved successfully!');
        setSettings(data.settings);
      } else {
        setMessage('Error saving settings: ' + data.message);
      }
    } catch (error) {
      setMessage('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage('Please enter an email address');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/search-alerts/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: testEmail, testQuery }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Test email sent successfully!');
      } else {
        setMessage('Error sending test email: ' + data.message);
      }
    } catch (error) {
      setMessage('Error sending test email: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Delete processed queries older than 30 days?')) return;

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/search-alerts/queries/cleanup?days=30`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`Cleanup completed: ${data.deletedCount} queries deleted`);
        fetchStatistics();
      } else {
        setMessage('Error during cleanup: ' + data.message);
      }
    } catch (error) {
      setMessage('Error during cleanup: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return <div className="p-8">Access denied. Admin only.</div>;
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Search Alerts Management</h1>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Total Queries</div>
            <div className="text-2xl font-bold">{statistics.totalQueries}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Processed</div>
            <div className="text-2xl font-bold text-green-600">{statistics.processedQueries}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Pending</div>
            <div className="text-2xl font-bold text-orange-600">{statistics.pendingQueries}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Unique Users</div>
            <div className="text-2xl font-bold">{statistics.uniqueUsers}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Last 7 Days</div>
            <div className="text-2xl font-bold">{statistics.queriesLast7Days}</div>
          </div>
        </div>
      )}

      {/* Top Queries */}
      {statistics && statistics.topQueries.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Top Searched Queries</h2>
          <div className="space-y-2">
            {statistics.topQueries.map((item, index) => (
              <div key={index} className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">{item.query}</span>
                <span className="text-gray-500">{item.count} searches</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Form */}
      {settings && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Alert Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="mr-2"
                />
                <span className="font-medium">Enable Search Alerts</span>
              </label>
            </div>

            <div>
              <label className="block font-medium mb-2">Max Emails Per User (per check)</label>
              <input
                type="number"
                value={settings.maxEmailsPerUser}
                onChange={(e) => setSettings({ ...settings, maxEmailsPerUser: parseInt(e.target.value) })}
                className="border rounded px-3 py-2 w-full"
                min="1"
                max="100"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Check Interval (hours)</label>
              <input
                type="number"
                value={settings.checkIntervalHours}
                onChange={(e) => setSettings({ ...settings, checkIntervalHours: parseInt(e.target.value) })}
                className="border rounded px-3 py-2 w-full"
                min="1"
                max="168"
              />
              <p className="text-sm text-gray-500 mt-1">
                Note: Cron runs hourly. This setting controls which queries to process.
              </p>
            </div>

            <div>
              <label className="block font-medium mb-2">Email Subject</label>
              <input
                type="text"
                value={settings.emailSubject}
                onChange={(e) => setSettings({ ...settings, emailSubject: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Email Body (HTML)</label>
              <textarea
                value={settings.emailBody}
                onChange={(e) => setSettings({ ...settings, emailBody: e.target.value })}
                className="border rounded px-3 py-2 w-full font-mono text-sm"
                rows={10}
              />
              <p className="text-sm text-gray-500 mt-1">
                Available variables: {'{{query}}'}, {'{{products}}'}, {'{{count}}'}
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Test Email */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Test Email</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block font-medium mb-2">Email Address</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="border rounded px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Test Query</label>
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="iPhone 13"
              className="border rounded px-3 py-2 w-full"
            />
          </div>

          <button
            onClick={handleTestEmail}
            disabled={saving}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {saving ? 'Sending...' : 'Send Test Email'}
          </button>
        </div>
      </div>

      {/* Cleanup */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Maintenance</h2>
        
        <button
          onClick={handleCleanup}
          disabled={saving}
          className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
        >
          {saving ? 'Cleaning...' : 'Cleanup Old Queries (30+ days)'}
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mt-4 p-4 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}
    </div>
  );
}

