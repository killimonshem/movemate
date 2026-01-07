// Analytics Dashboard Component
// Main dashboard with stats overview and charts
// Fully responsive across all breakpoints

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import StatsOverview from './StatsOverview';
import RegistrationsChart from './RegistrationsChart';
import NotificationsChart from './NotificationsChart';
import PeakHoursChart from './PeakHoursChart';
import TopVehiclesTable from './TopVehiclesTable';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const DATE_RANGES = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 },
  { label: 'Custom', value: 'custom' },
];

const AnalyticsDashboard = ({ venueId }) => {
  const { getAuthHeader } = useAuth();
  const [dateRange, setDateRange] = useState(30);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [summary, setSummary] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [registrations, setRegistrations] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [topVehicles, setTopVehicles] = useState([]);

  useEffect(() => {
    if (venueId) {
      fetchAllData();
    }
  }, [venueId, dateRange, customStart, customEnd]);

  const getDateRange = () => {
    if (dateRange === 'custom') {
      return {
        start: customStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: customEnd || new Date().toISOString().split('T')[0],
      };
    }

    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { start, end };
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      const { start, end } = getDateRange();
      const params = `venue_id=${venueId}&start_date=${start}&end_date=${end}`;

      // Fetch all data in parallel
      const [summaryRes, dailyRes, regsRes, notifsRes, vehiclesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/venue-stats?${params}&type=summary`, {
          headers: getAuthHeader(),
        }),
        fetch(`${API_BASE_URL}/venue-stats?${params}&type=daily`, {
          headers: getAuthHeader(),
        }),
        fetch(`${API_BASE_URL}/venue-stats?${params}&type=registrations`, {
          headers: getAuthHeader(),
        }),
        fetch(`${API_BASE_URL}/venue-stats?${params}&type=notifications`, {
          headers: getAuthHeader(),
        }),
        fetch(`${API_BASE_URL}/venue-stats?${params}&type=top_vehicles`, {
          headers: getAuthHeader(),
        }),
      ]);

      const [summaryData, dailyData, regsData, notifsData, vehiclesData] = await Promise.all([
        summaryRes.json(),
        dailyRes.json(),
        regsRes.json(),
        notifsRes.json(),
        vehiclesRes.json(),
      ]);

      if (summaryData.success) setSummary(summaryData.summary);
      if (dailyData.success) setDailyStats(dailyData.daily_stats);
      if (regsData.success) setRegistrations(regsData.registrations);
      if (notifsData.success) setNotifications(notifsData.notifications);
      if (vehiclesData.success) setTopVehicles(vehiclesData.top_vehicles);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      const { start, end } = getDateRange();
      const url = `${API_BASE_URL}/export-stats?venue_id=${venueId}&type=${type}&start_date=${start}&end_date=${end}`;

      const response = await fetch(url, {
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `movemate_${type}_export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Insights into your parking management performance
          </p>
        </div>

        {/* Date Range Selector - Responsive */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value === 'custom' ? 'custom' : parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {DATE_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>

          {dateRange === 'custom' && (
            <div className="flex gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          )}

          {/* Export Dropdown - Mobile friendly */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleExport(e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium cursor-pointer appearance-none pr-10"
            >
              <option value="">Export...</option>
              <option value="registrations">Registrations</option>
              <option value="notifications">Notifications</option>
              <option value="stats">Daily Stats</option>
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Stats Overview Cards */}
      <StatsOverview summary={summary} />

      {/* Charts Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Registrations Over Time */}
        <RegistrationsChart dailyStats={dailyStats} />

        {/* Notifications Performance */}
        <NotificationsChart notifications={notifications} />
      </div>

      {/* Peak Hours */}
      <PeakHoursChart registrations={registrations} />

      {/* Top Vehicles */}
      <TopVehiclesTable topVehicles={topVehicles} />
    </div>
  );
};

export default AnalyticsDashboard;
