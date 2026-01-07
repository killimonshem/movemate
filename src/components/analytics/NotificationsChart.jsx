// Notifications Chart Component
// Pie chart showing notification breakdown by type and status
// Fully responsive with Recharts

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const NotificationsChart = ({ notifications }) => {
  if (!notifications || notifications.total === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications Performance</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p>No notifications sent yet</p>
          </div>
        </div>
      </div>
    );
  }

  // Format data for chart - by type
  const chartData = Object.entries(notifications.by_type || {}).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
    value: count,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">{payload[0].value} notifications</p>
          <p className="text-xs text-gray-500">
            {((payload[0].value / notifications.total) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notifications Performance</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Breakdown by notification type
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600">Total</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{notifications.total}</p>
        </div>
        <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600">Sent</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{notifications.sent}</p>
        </div>
        <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600">Failed</p>
          <p className="text-lg sm:text-2xl font-bold text-red-600">{notifications.failed}</p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Additional Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Success Rate</p>
            <p className="text-lg font-semibold text-gray-900">
              {notifications.success_rate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-gray-600">Avg Response Time</p>
            <p className="text-lg font-semibold text-gray-900">
              {notifications.avg_response_time_seconds
                ? `${Math.floor(notifications.avg_response_time_seconds / 60)}m ${notifications.avg_response_time_seconds % 60}s`
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsChart;
