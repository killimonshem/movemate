// Venue Status Widget Component
// Shows current venue status and next active time
// Fully responsive for all breakpoints

import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const VenueStatusWidget = ({ venueId }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (venueId) {
      fetchStatus();
      // Refresh every minute
      const interval = setInterval(fetchStatus, 60000);
      return () => clearInterval(interval);
    }
  }, [venueId]);

  const fetchStatus = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/venue-status?venue_id=${venueId}`
      );

      const data = await response.json();

      if (response.ok) {
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch venue status:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNextActiveTime = (timestamp) => {
    if (!timestamp) return null;

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = date - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}, ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'soon';
    }
  };

  if (loading && !status) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="animate-pulse bg-gray-200 h-10 w-10 rounded-full"></div>
          <div className="flex-1">
            <div className="animate-pulse bg-gray-200 h-4 w-24 mb-2 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-3 w-32 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const isActive = status.is_active;

  return (
    <div className={`border rounded-lg p-4 transition ${
      isActive
        ? 'bg-green-50 border-green-200'
        : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              isActive ? 'bg-green-600' : 'bg-gray-400'
            }`}>
              {isActive ? (
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            {isActive && (
              <span className="absolute -top-1 -right-1">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold text-base sm:text-lg ${
                isActive ? 'text-green-900' : 'text-gray-900'
              }`}>
                System {isActive ? 'Active' : 'Inactive'}
              </h3>
            </div>
            <p className={`text-sm mt-0.5 ${
              isActive ? 'text-green-700' : 'text-gray-600'
            }`}>
              {isActive ? (
                'Accepting registrations & sending notifications'
              ) : (
                'Outside of active hours'
              )}
            </p>
          </div>
        </div>

        {/* Next Active Time (only shown when inactive) */}
        {!isActive && status.next_active_time && (
          <div className="flex-shrink-0 pl-0 sm:pl-4 sm:border-l border-gray-300">
            <div className="text-xs sm:text-sm text-gray-600">
              Next active
            </div>
            <div className="text-sm sm:text-base font-medium text-gray-900">
              {new Date(status.next_active_time).toLocaleString('en-GB', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="text-xs text-gray-500">
              {formatNextActiveTime(status.next_active_time)}
            </div>
          </div>
        )}
      </div>

      {/* Venue Info (optional, can be hidden on mobile) */}
      <div className="mt-3 pt-3 border-t border-gray-200 hidden sm:block">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{status.venue_name}</span>
          <span>{status.timezone}</span>
        </div>
      </div>
    </div>
  );
};

export default VenueStatusWidget;
