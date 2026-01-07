// Venue Management Component - Super Admin
// List, create, edit, and manage venues
// Fully responsive

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const VenueManagement = () => {
  const { getAuthHeader } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    timezone: 'Europe/London',
  });

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/super-admin-venues`, {
        headers: getAuthHeader(),
      });
      const data = await response.json();
      if (data.success) setVenues(data.venues);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingVenue
        ? `${API_BASE_URL}/super-admin-venues?id=${editingVenue.id}`
        : `${API_BASE_URL}/super-admin-venues`;
      const method = editingVenue ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        fetchVenues();
        setFormData({ name: '', address: '', contact_email: '', contact_phone: '', timezone: 'Europe/London' });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const openModal = (venue = null) => {
    if (venue) {
      setEditingVenue(venue);
      setFormData({
        name: venue.name || '',
        address: venue.address || '',
        contact_email: venue.contact_email || '',
        contact_phone: venue.contact_phone || '',
        timezone: venue.timezone || 'Europe/London',
      });
    } else {
      setEditingVenue(null);
      setFormData({ name: '', address: '', contact_email: '', contact_phone: '', timezone: 'Europe/London' });
    }
    setShowModal(true);
  };

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Venue Management</h2>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
        >
          + Add Venue
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>}

      {/* Responsive table/cards */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Mobile: Cards */}
        <div className="block sm:hidden divide-y divide-gray-200">
          {venues.map((venue) => (
            <div key={venue.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{venue.name}</h3>
                  <p className="text-sm text-gray-600">{venue.address}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${venue.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {venue.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div><span className="text-gray-500">Admins:</span> {venue.admin_count}</div>
                <div><span className="text-gray-500">Registrations:</span> {venue.active_registrations}</div>
              </div>
              <button
                onClick={() => openModal(venue)}
                className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
              >
                Edit
              </button>
            </div>
          ))}
        </div>

        {/* Desktop: Table */}
        <table className="hidden sm:table min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admins</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Regs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {venues.map((venue) => (
              <tr key={venue.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{venue.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{venue.address || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{venue.admin_count}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{venue.active_registrations}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${venue.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {venue.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button onClick={() => openModal(venue)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                    Edit
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
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">{editingVenue ? 'Edit Venue' : 'Create Venue'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                  {editingVenue ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueManagement;
