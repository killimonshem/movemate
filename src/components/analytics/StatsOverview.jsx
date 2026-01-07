// Stats Overview Component
// Summary cards showing key metrics
// Fully responsive across all breakpoints

import React from 'react';

const StatsOverview = ({ summary }) => {
  if (!summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Registrations',
      value: summary.total_registrations || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      color: 'blue',
      subtitle: `${(summary.avg_registrations_per_day || 0).toFixed(1)} per day avg`,
    },
    {
      title: 'Total Notifications',
      value: summary.total_notifications || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
      color: 'purple',
      subtitle: `${(summary.notification_success_rate || 0).toFixed(1)}% success rate`,
    },
    {
      title: 'Avg Response Time',
      value: summary.avg_response_time_seconds
        ? `${Math.floor(summary.avg_response_time_seconds / 60)}m ${summary.avg_response_time_seconds % 60}s`
        : 'N/A',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'green',
      subtitle: 'Time to vehicle moved',
    },
    {
      title: 'Unique Vehicles',
      value: summary.total_unique_vehicles || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      color: 'yellow',
      subtitle: 'Different vehicles',
    },
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200',
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-600',
      border: 'border-green-200',
    },
    yellow: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-600',
      border: 'border-yellow-200',
    },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const colors = colorClasses[card.color];

        return (
          <div
            key={index}
            className={`bg-white border ${colors.border} rounded-lg p-4 sm:p-6 hover:shadow-lg transition`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${colors.bg} ${colors.text} p-3 rounded-lg`}>
                {card.icon}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs sm:text-sm text-gray-500 mt-2">{card.subtitle}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsOverview;
