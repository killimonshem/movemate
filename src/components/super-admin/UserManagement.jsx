// User Management Component - Super Admin
// List, create, edit users and send invitations
// Fully responsive

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const UserManagement = () => {
  const { getAuthHeader } = useAuth();
  const [users, setUsers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'venue_admin',
    venue_id: '',
    send_invite: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, venuesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/super-admin-users`, { headers: getAuthHeader() }),
        fetch(`${API_BASE_URL}/super-admin-venues`, { headers: getAuthHeader() }),
      ]);
      const [usersData, venuesData] = await Promise.all([usersRes.json(), venuesRes.json()]);
      if (usersData.success) setUsers(usersData.users);
      if (venuesData.success) setVenues(venuesData.venues);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/super-admin-users`, {
        method: 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (data.success) {
        // Send invite email if requested
        if (formData.send_invite && data.temporary_password) {
          await fetch(`${API_BASE_URL}/send-invite-email`, {
            method: 'POST',
            headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: data.user.id,
              temporary_password: data.temporary_password,
            }),
          });
        }

        setShowModal(false);
        fetchData();
        setFormData({ email: '', full_name: '', role: 'venue_admin', venue_id: '', send_invite: true });
        alert(`User created! ${!formData.send_invite ? `Temporary password: ${data.temporary_password}` : 'Invitation email sent.'}`);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await fetch(`${API_BASE_URL}/super-admin-users?id=${userId}`, {
        method: 'PATCH',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-center p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
          + Add User
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>}

      {/* Responsive table/cards */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Mobile: Cards */}
        <div className="block sm:hidden divide-y divide-gray-200">
          {users.map((user) => (
            <div key={user.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{user.full_name || user.email}</h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-sm mb-3">
                <div><span className="text-gray-500">Role:</span> {user.role}</div>
                {user.venue_name && <div><span className="text-gray-500">Venue:</span> {user.venue_name}</div>}
              </div>
              <button
                onClick={() => toggleUserStatus(user.id, user.is_active)}
                className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
              >
                {user.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>

        {/* Desktop: Table */}
        <table className="hidden sm:table min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{user.full_name || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{user.role}</span></td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.venue_name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button onClick={() => toggleUserStatus(user.id, user.is_active)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Create User</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="venue_admin">Venue Admin</option>
                  <option value="user">Regular User</option>
                </select>
              </div>
              {formData.role === 'venue_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
                  <select value={formData.venue_id} onChange={(e) => setFormData({ ...formData, venue_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                    <option value="">Select venue</option>
                    {venues.filter(v => v.is_active).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.send_invite} onChange={(e) => setFormData({ ...formData, send_invite: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Send invitation email</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
