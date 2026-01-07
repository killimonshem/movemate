// Venue Schedule Manager Component
// Fully responsive weekly schedule editor for all breakpoints

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const VenueScheduleManager = ({ venueId }) => {
  const { getAuthHeader } = useAuth();
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (venueId) {
      fetchSchedules();
    }
  }, [venueId]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/venue-schedules?venue_id=${venueId}`,
        {
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch schedules');
      }

      // Convert array to object keyed by day_of_week
      const schedulesMap = {};
      data.schedules.forEach((schedule) => {
        schedulesMap[schedule.day_of_week] = schedule;
      });

      setSchedules(schedulesMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleChange = (day, field, value) => {
    setSchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        day_of_week: day,
        [field]: value,
      },
    }));
  };

  const saveSchedule = async (day) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const schedule = schedules[day];

      if (!schedule) {
        throw new Error('No schedule data for this day');
      }

      // Validate times
      if (!schedule.start_time || !schedule.end_time) {
        throw new Error('Please set both start and end times');
      }

      const response = await fetch(`${API_BASE_URL}/venue-schedules`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          venue_id: venueId,
          day_of_week: day,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_active: schedule.is_active !== undefined ? schedule.is_active : true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save schedule');
      }

      setSuccess(`Schedule saved for ${DAYS_OF_WEEK[day].label}`);
      await fetchSchedules();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToAll = async () => {
    const confirmed = window.confirm(
      'This will copy the first configured schedule to all days. Continue?'
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError('');

      // Find first configured schedule
      const template = Object.values(schedules).find(s => s.start_time && s.end_time);

      if (!template) {
        throw new Error('No schedule configured to copy from');
      }

      // Save to all days
      for (let day = 0; day <= 6; day++) {
        await fetch(`${API_BASE_URL}/venue-schedules`, {
          method: 'POST',
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            venue_id: venueId,
            day_of_week: day,
            start_time: template.start_time,
            end_time: template.end_time,
            is_active: true,
          }),
        });
      }

      setSuccess('Schedule copied to all days');
      await fetchSchedules();

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Weekly Schedule</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure when your venue is active for registrations
          </p>
        </div>

        <button
          onClick={copyToAll}
          disabled={saving}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm font-medium disabled:opacity-50"
        >
          Copy to All Days
        </button>
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

      {/* Schedule Grid - Responsive */}
      <div className="space-y-3">
        {DAYS_OF_WEEK.map((day) => {
          const schedule = schedules[day.value] || { is_active: true };

          return (
            <div
              key={day.value}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              {/* Mobile & Tablet Layout (< lg) */}
              <div className="lg:hidden space-y-3">
                {/* Day name and toggle */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{day.label}</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-600">Active</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={schedule.is_active !== false}
                        onChange={(e) =>
                          handleScheduleChange(day.value, 'is_active', e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </label>
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={schedule.start_time || ''}
                      onChange={(e) =>
                        handleScheduleChange(day.value, 'start_time', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={schedule.is_active === false}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={schedule.end_time || ''}
                      onChange={(e) =>
                        handleScheduleChange(day.value, 'end_time', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={schedule.is_active === false}
                    />
                  </div>
                </div>

                {/* Save button */}
                <button
                  onClick={() => saveSchedule(day.value)}
                  disabled={saving || schedule.is_active === false}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>

              {/* Desktop Layout (>= lg) */}
              <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center">
                {/* Day name */}
                <div className="lg:col-span-2">
                  <h3 className="font-semibold text-gray-900">{day.label}</h3>
                </div>

                {/* Start time */}
                <div className="lg:col-span-3">
                  <input
                    type="time"
                    value={schedule.start_time || ''}
                    onChange={(e) =>
                      handleScheduleChange(day.value, 'start_time', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={schedule.is_active === false}
                    placeholder="Start time"
                  />
                </div>

                {/* End time */}
                <div className="lg:col-span-3">
                  <input
                    type="time"
                    value={schedule.end_time || ''}
                    onChange={(e) =>
                      handleScheduleChange(day.value, 'end_time', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={schedule.is_active === false}
                    placeholder="End time"
                  />
                </div>

                {/* Toggle */}
                <div className="lg:col-span-2 flex justify-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-600">Active</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={schedule.is_active !== false}
                        onChange={(e) =>
                          handleScheduleChange(day.value, 'is_active', e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </label>
                </div>

                {/* Save button */}
                <div className="lg:col-span-2">
                  <button
                    onClick={() => saveSchedule(day.value)}
                    disabled={saving || schedule.is_active === false}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Set the hours when your venue actively monitors parking and sends
          notifications. Registrations outside these hours will be blocked.
        </p>
      </div>
    </div>
  );
};

export default VenueScheduleManager;
