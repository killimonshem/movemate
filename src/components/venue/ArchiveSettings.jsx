// Archive Settings Component
// Fully responsive auto-archive configuration

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const ArchiveSettings = ({ venueId }) => {
  const { getAuthHeader } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (venueId) {
      fetchSettings();
    }
  }, [venueId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');

      // TODO: Replace with actual API endpoint when implemented
      // For now, use mock data
      setSettings({
        auto_archive_enabled: true,
        archive_after_hours: 24,
        last_archived_at: null,
      });

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // TODO: Replace with actual API call when endpoint is implemented
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess('Archive settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleManualArchive = async () => {
    const confirmed = window.confirm(
      'This will archive all registrations older than the configured time. Continue?'
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError('');

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess('Manual archive completed');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Archive Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure automatic archiving of old registrations
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Settings Form - Responsive */}
      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 space-y-6">
        {/* Auto-Archive Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Auto-Archive</h3>
            <p className="text-sm text-gray-600 mt-1">
              Automatically archive old registrations to keep your database clean
            </p>
          </div>
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.auto_archive_enabled || false}
                onChange={(e) =>
                  setSettings({ ...settings, auto_archive_enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Archive After Hours */}
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Archive after (hours)</span>
            <p className="text-xs text-gray-500 mt-1">
              Registrations older than this will be archived
            </p>
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="number"
                min="1"
                max="168"
                value={settings?.archive_after_hours || 24}
                onChange={(e) =>
                  setSettings({ ...settings, archive_after_hours: parseInt(e.target.value) })
                }
                disabled={!settings?.auto_archive_enabled}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>
            <div className="flex gap-2">
              {[12, 24, 48, 72].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setSettings({ ...settings, archive_after_hours: hours })}
                  disabled={!settings?.auto_archive_enabled}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                    settings?.archive_after_hours === hours
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {hours}h
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Last Archived */}
        {settings?.last_archived_at && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Last archived:</span>{' '}
              {new Date(settings.last_archived_at).toLocaleString('en-GB')}
            </p>
          </div>
        )}

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={handleManualArchive}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium disabled:opacity-50"
          >
            Run Archive Now
          </button>
        </div>
      </form>

      {/* Info Box - Responsive */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">About Auto-Archive</h3>
            <div className="mt-2 text-sm text-blue-800 space-y-1">
              <p>
                • Archived registrations are hidden from the main list but kept for historical records
              </p>
              <p>
                • Auto-archive runs hourly during venue active hours
              </p>
              <p>
                • You can manually unarchive registrations if needed
              </p>
              <p>
                • Recommended: 24 hours for daily services, 48-72 hours for weekly services
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Active Registrations</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">--</div>
          <div className="text-xs text-gray-500 mt-1">Currently unarchived</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Archived This Month</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">--</div>
          <div className="text-xs text-gray-500 mt-1">Auto-archived count</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Total Archived</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">--</div>
          <div className="text-xs text-gray-500 mt-1">All-time count</div>
        </div>
      </div>
    </div>
  );
};

export default ArchiveSettings;
