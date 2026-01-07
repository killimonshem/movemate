// Audit Log Viewer Component - Super Admin
// View and filter audit logs with detailed change tracking
// Fully responsive

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const AuditLogViewer = () => {
  const { getAuthHeader } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    start_date: '',
    end_date: '',
    limit: 50,
    offset: 0,
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`${API_BASE_URL}/audit-logs?${params}`, {
        headers: getAuthHeader(),
      });
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
        setTotal(data.total);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, offset: 0 });
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      entity_type: '',
      start_date: '',
      end_date: '',
      limit: 50,
      offset: 0,
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadgeColor = (action) => {
    const colors = {
      create_venue: 'bg-green-100 text-green-800',
      update_venue: 'bg-blue-100 text-blue-800',
      delete_venue: 'bg-red-100 text-red-800',
      create_user: 'bg-green-100 text-green-800',
      update_user: 'bg-blue-100 text-blue-800',
      delete_user: 'bg-red-100 text-red-800',
      login: 'bg-purple-100 text-purple-800',
      logout: 'bg-gray-100 text-gray-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatActionLabel = (action) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderChanges = (log) => {
    if (!log.changes) return null;

    try {
      const changes = typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes;

      // Handle before/after structure
      if (changes.before && changes.after) {
        const keys = new Set([...Object.keys(changes.before), ...Object.keys(changes.after)]);
        return (
          <div className="space-y-1 text-sm">
            {Array.from(keys).map((key) => {
              const before = changes.before[key];
              const after = changes.after[key];
              if (before === after) return null;
              return (
                <div key={key} className="flex flex-col sm:flex-row gap-1">
                  <span className="font-medium text-gray-700">{key}:</span>
                  <span className="text-red-600 line-through">{JSON.stringify(before)}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-600">{JSON.stringify(after)}</span>
                </div>
              );
            })}
          </div>
        );
      }

      // Handle other change formats
      return (
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
          {JSON.stringify(changes, null, 2)}
        </pre>
      );
    } catch (e) {
      return <span className="text-xs text-gray-500">Invalid change data</span>;
    }
  };

  if (loading && logs.length === 0) return <div className="text-center p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-sm text-gray-600 mt-1">
            {total} total records
          </p>
        </div>
      </div>

      {/* Filters - Responsive */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Actions</option>
              <option value="create_venue">Create Venue</option>
              <option value="update_venue">Update Venue</option>
              <option value="delete_venue">Delete Venue</option>
              <option value="create_user">Create User</option>
              <option value="update_user">Update User</option>
              <option value="delete_user">Delete User</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={filters.entity_type}
              onChange={(e) => handleFilterChange('entity_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Types</option>
              <option value="venue">Venue</option>
              <option value="user">User</option>
              <option value="session">Session</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
          >
            Clear Filters
          </button>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>}

      {/* Logs display - Responsive */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center p-8 text-gray-500">No audit logs found</div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="block lg:hidden divide-y divide-gray-200">
              {logs.map((log) => (
                <div key={log.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getActionBadgeColor(log.action)}`}>
                        {formatActionLabel(log.action)}
                      </span>
                      {log.entity_type && (
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                          {log.entity_type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm mb-2">
                    <div className="text-xs text-gray-500">{formatDate(log.created_at)}</div>
                    {log.user && (
                      <div>
                        <span className="text-gray-500">User:</span> {log.user.full_name || log.user.email}
                      </div>
                    )}
                    {log.ip_address && (
                      <div>
                        <span className="text-gray-500">IP:</span> {log.ip_address}
                      </div>
                    )}
                  </div>
                  {renderChanges(log)}
                </div>
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getActionBadgeColor(log.action)}`}>
                          {formatActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.entity_type && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                            {log.entity_type}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.user ? (
                          <div>
                            <div className="font-medium">{log.user.full_name}</div>
                            <div className="text-xs text-gray-500">{log.user.email}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.ip_address || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {renderChanges(log)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {total > filters.limit && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing {filters.offset + 1} - {Math.min(filters.offset + filters.limit, total)} of {total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
              disabled={filters.offset === 0}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
              disabled={filters.offset + filters.limit >= total}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;
