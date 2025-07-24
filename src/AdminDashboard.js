import React, { useState, useEffect, useCallback } from 'react';
// Import all icons and components used by AdminLogin and AdminDashboard
import { BackButton, InputField, LockIcon, ArrowRightIcon, SearchIcon, RefreshIcon, SettingsIcon, CarIcon, AlertIcon, SendIcon, Toast, Modal } from './App';

// Admin Login Component
const AdminLogin = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://frxtcfoopvmfhwjezyuf.supabase.co';
  const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyeHRjZm9vcHZtZmh3amV6eXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMTMyMDAsImV4cCI6MjA2NzU4OTIwMH0.5oGZ0rAHFYfzJSF7505r0Q1FFMr6ZOZUcWb1setq-38';

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both a username and a password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-auth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Authentication failed');
      } else {
        onLogin();
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="container">
      <div className="header">
        <BackButton onClick={onBack} />
      </div>
      <div className="content-wrapper">
        <div className="login-form">
          <h2 className="heading" style={{ fontSize: '24px', marginBottom: '24px' }}>Admin Access</h2>
          <div>
            <InputField
              label="Username"
              icon={LockIcon}
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="Enter admin username"
              error={error}
            />
            <InputField
              label="Password"
              icon={LockIcon}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="Enter admin password"
              error={error}
            />
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="button-primary"
            >
              <span>{loading ? 'Logging in...' : 'Log in'}</span>
              {!loading && <ArrowRightIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = ({ onBack }) => {
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [toast, setToast] = useState(null);
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [sentSMS, setSentSMS] = useState(new Set());

  // --- Bulk SMS State ---
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState(new Set());
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkSendProgress, setBulkSendProgress] = useState({ sent: 0, total: 0 });

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://frxtcfoopvmfhwjezyuf.supabase.co';
  const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyeHRjZm9vcHZtZmh3amV6eXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMTMyMDAsImV4cCI6MjA2NzU4OTIwMH0.5oGZ0rAHFYfzJSF7505r0Q1FFMr6ZOZUcWb1setq-38';

  const fetchVenues = async () => {
    setLoadingVenues(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/fetch-venues`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch venues');
      const { data } = await response.json();
      setVenues(data || []);
      setDataError(null);
    } catch (error) {
      console.error('Error fetching venues:', error);
      setDataError('Failed to fetch venues.');
      setToast({ message: 'Failed to fetch venues.', type: 'error' });
    } finally {
      setLoadingVenues(false);
    }
  };

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${supabaseUrl}/functions/v1/fetch-registrations`);
      if (selectedVenue) {
        url.searchParams.set('venue_id', selectedVenue);
      }
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch registrations');
      const { data } = await response.json();
      setRegistrations(data || []);
      setFilteredRegistrations(data || []);
      setDataError(null);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setDataError('Failed to fetch registrations');
      setToast({ message: 'Failed to fetch registrations', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedVenue]);

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (!term) {
      setFilteredRegistrations(registrations);
    } else {
      const filtered = registrations.filter(reg => 
        reg.reg.toLowerCase().includes(term.toLowerCase()) ||
        reg.phone.includes(term)
      );
      setFilteredRegistrations(filtered);
    }
  };

  const handleVenueChange = (venueId) => {
    setSelectedVenue(venueId);
    fetchRegistrations();
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedRegistrations = () => {
    const sorted = [...filteredRegistrations].sort((a, b) => {
      let aValue, bValue;
      switch (sortField) {
        case 'reg':
          aValue = a.reg.toLowerCase();
          bValue = b.reg.toLowerCase();
          break;
        case 'phone':
          aValue = a.phone;
          bValue = b.phone;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'venue':
          const venueA = venues.find(v => v.id === a.venue_id);
          const venueB = venues.find(v => v.id === b.venue_id);
          aValue = venueA ? venueA.name.toLowerCase() : '';
          bValue = venueB ? venueB.name.toLowerCase() : '';
          break;
        default:
          return 0;
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const confirmSendNotification = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowModal(true);
  };

  const sendNotification = async () => {
    if (!selectedVehicle) return;
    setShowModal(false);
    setSendingTo(selectedVehicle.phone);
    try {
      let venueName = '';
      if (selectedVehicle.venue_id) {
        const venue = venues.find(v => v.id === selectedVehicle.venue_id);
        venueName = venue ? venue.name : '';
      }
      const venueText = venueName ? ` at ${venueName}` : '';
      await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          phone: selectedVehicle.phone,
          message: `URGENT: vehicle ${selectedVehicle.reg}${venueText} must move immediately - someone waiting to depart. Thank you for your cooperation.`,
          from: 'MOVEMATE'
        })
      });
      setToast({ message: `Notification sent to ${selectedVehicle.reg}`, type: 'success' });
      setSentSMS(prev => new Set([...prev, selectedVehicle.phone]));
    } catch (error) {
      console.error('Error:', error);
      setToast({ message: 'Failed to send notification', type: 'error' });
    } finally {
      setSendingTo(null);
      setSelectedVehicle(null);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  // --- Bulk SMS Functions ---
  const handleSelectAll = () => {
    if (selectedRecipients.size === getSortedRegistrations().length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(getSortedRegistrations().map(reg => reg.phone)));
    }
  };

  const handleSelectRecipient = (phone) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(phone)) {
      newSelected.delete(phone);
    } else {
      newSelected.add(phone);
    }
    setSelectedRecipients(newSelected);
  };

  const sendBulkSMS = async () => {
    if (!bulkMessage.trim() || selectedRecipients.size === 0) {
      setToast({ message: 'Please enter a message and select recipients', type: 'error' });
      return;
    }
    setBulkSending(true);
    setBulkSendProgress({ sent: 0, total: selectedRecipients.size });
    const recipients = Array.from(selectedRecipients);
    let successCount = 0;
    let errorCount = 0;
    for (let i = 0; i < recipients.length; i++) {
      const phone = recipients[i];
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            phone: phone,
            message: bulkMessage.trim(),
            from: 'MOVEMATE'
          })
        });
        successCount++;
        setSentSMS(prev => new Set([...prev, phone]));
      } catch (error) {
        console.error(`Failed to send SMS to ${phone}:`, error);
        errorCount++;
      }
      setBulkSendProgress({ sent: i + 1, total: recipients.length });
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    setBulkSending(false);
    setBulkSendProgress({ sent: 0, total: 0 });
    setShowBulkSMSModal(false);
    setSelectedRecipients(new Set());
    setBulkMessage('');
    if (errorCount === 0) {
      setToast({ message: `Successfully sent ${successCount} SMS messages`, type: 'success' });
    } else {
      setToast({ message: `Sent ${successCount} messages, ${errorCount} failed`, type: 'error' });
    }
  };

  const closeBulkSMSModal = () => {
    setShowBulkSMSModal(false);
    setSelectedRecipients(new Set());
    setBulkMessage('');
    setBulkSending(false);
    setBulkSendProgress({ sent: 0, total: 0 });
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  return (
    <div className="container">
      <div className="header">
        <BackButton onClick={onBack} text="Back to Home" />
      </div>
      <div className="admin-container">
        <div className="admin-header">
          <h1 className="heading" style={{ margin: 0 }}>Admin Dashboard</h1>
          <div className="admin-controls">
            <div className="venue-selector">
              <select
                className="venue-dropdown"
                value={selectedVenue}
                onChange={(e) => handleVenueChange(e.target.value)}
                disabled={loadingVenues}
              >
                <option value="">All Venues</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="search-container">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search by registration..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <button onClick={fetchRegistrations} className="refresh-button">
              <RefreshIcon />
              <span>Refresh</span>
            </button>
            {/* Bulk SMS Button - positioned after Refresh for good UX */}
            <button 
              onClick={() => setShowBulkSMSModal(true)} 
              className="bulk-sms-button"
              disabled={filteredRegistrations.length === 0}
              style={{ marginLeft: 8 }}
            >
              <SendIcon />
              <span>Bulk SMS</span>
            </button>
          </div>
        </div>
        {/* Admin Settings Button - positioned in top-right corner */}
        <div className="admin-settings-corner">
          <button 
            onClick={() => window.location.reload()} 
            className="admin-settings-button"
            title="Refresh Page"
          >
            <SettingsIcon />
          </button>
        </div>
        <div className="admin-content">
          {dataError ? (
            <div className="error-state">
              <AlertIcon className="error-icon" />
              <p>{dataError}</p>
              <button onClick={fetchRegistrations} className="button-primary">
                <RefreshIcon />
                <span>Retry</span>
              </button>
            </div>
          ) : loading ? (
            <div className="empty-state">
              <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="empty-state">
              <CarIcon className="empty-icon" />
              <p>{searchTerm ? 'No vehicles found matching your search' : 'No vehicles registered yet'}</p>
            </div>
          ) : (
            <div className="registrations-table-container">
              <table className="registrations-table">
                <thead>
                  <tr>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('reg')}
                    >
                      <div className="header-content">
                        <span>Registration</span>
                        <span className="sort-icon">
                          {sortField === 'reg' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('phone')}
                    >
                      <div className="header-content">
                        <span>Phone</span>
                        <span className="sort-icon">
                          {sortField === 'phone' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="header-content">
                        <span>Registered</span>
                        <span className="sort-icon">
                          {sortField === 'created_at' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th 
                      className="sortable-header"
                      onClick={() => handleSort('venue')}
                    >
                      <div className="header-content">
                        <span>Venue</span>
                        <span className="sort-icon">
                          {sortField === 'venue' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th>Vehicle</th>
                    <th>SMS Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedRegistrations().map((reg) => {
                    const venue = venues.find(v => v.id === reg.venue_id);
                    return (
                      <tr key={reg.id} className="registration-row">
                        <td className="registration-cell">
                          <div className="reg-display">
                            <CarIcon />
                            <span className="reg-text">{reg.reg}</span>
                          </div>
                        </td>
                        <td className="phone-cell">
                          <span className="phone-text">{reg.phone}</span>
                        </td>
                        <td className="timestamp-cell">
                          <div className="timestamp-display">
                            <div className="time">{formatTime(reg.created_at)}</div>
                            <div className="date">{formatDate(reg.created_at)}</div>
                            <div className="full-timestamp">
                              {new Date(reg.created_at).toLocaleString('en-GB', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="venue-cell">
                          <span className="venue-text">{venue ? venue.name : 'Unknown'}</span>
                        </td>
                        <td className="vehicle-cell">
                          <span className="no-vehicle">No vehicle data</span>
                        </td>
                        <td className="sms-status-cell">
                          <div className="sms-status">
                            <span className={`sms-status-text ${sentSMS.has(reg.phone) ? 'sms-sent' : ''}`}>
                              {sentSMS.has(reg.phone) ? 'Sent' : 'Ready'}
                            </span>
                          </div>
                        </td>
                        <td className="actions-cell">
                          <button
                            className="sms-button sms-button-secondary"
                            onClick={() => confirmSendNotification(reg)}
                            disabled={sendingTo === reg.phone}
                            title="Send SMS notification"
                          >
                            {sendingTo === reg.phone ? (
                              <>
                                <div className="loading-spinner" style={{ borderTopColor: 'white' }}></div>
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <SendIcon />
                                <span>Send SMS</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={sendNotification}
        title="Send Move Request?"
        message={`Are you sure you want to send a move request to vehicle ${selectedVehicle?.reg}?`}
        confirmText="Send Notification"
      />
      {/* Bulk SMS Modal */}
      {showBulkSMSModal && (
        <div className="modal-overlay" onClick={closeBulkSMSModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <SendIcon style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                Bulk SMS
              </h3>
              <button 
                className="close-button" 
                onClick={closeBulkSMSModal}
                disabled={bulkSending}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              {/* Recipients Section */}
              <div className="bulk-sms-section">
                <div className="section-header">
                  <h4 className="section-title">Select Recipients</h4>
                  <div className="recipients-summary">
                    <span className="recipients-count">
                      {selectedRecipients.size === 0 
                        ? 'No recipients selected' 
                        : `${selectedRecipients.size} recipient${selectedRecipients.size === 1 ? '' : 's'} selected`
                      }
                    </span>
                  </div>
                </div>
                <div className="bulk-sms-controls">
                  <button 
                    onClick={handleSelectAll}
                    className="select-all-button"
                    disabled={bulkSending}
                  >
                    {selectedRecipients.size === getSortedRegistrations().length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="recipients-list">
                  {getSortedRegistrations().map((reg) => {
                    const venue = venues.find(v => v.id === reg.venue_id);
                    const isSelected = selectedRecipients.has(reg.phone);
                    return (
                      <div 
                        key={reg.id}
                        className={`recipient-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => !bulkSending && handleSelectRecipient(reg.phone)}
                      >
                        <input
                          type="checkbox"
                          className="recipient-checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRecipient(reg.phone)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={bulkSending}
                        />
                        <div className="recipient-info">
                          <div className="recipient-reg">{reg.reg}</div>
                          <div className="recipient-phone">{reg.phone}</div>
                          {venue && <div className="recipient-venue">{venue.name}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Message Section */}
              <div className="bulk-sms-section">
                <div className="section-header">
                  <h4 className="section-title">Message</h4>
                  <div className="message-counter">
                    {bulkMessage.length}/160 characters
                  </div>
                </div>
                <textarea
                  className="message-textarea"
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  placeholder="Enter your message here..."
                  maxLength={160}
                  disabled={bulkSending}
                />
              </div>
              {/* Progress Section */}
              {bulkSending && (
                <div className="bulk-sms-section">
                  <div className="section-header">
                    <h4 className="section-title">Sending Progress</h4>
                  </div>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(bulkSendProgress.sent / bulkSendProgress.total) * 100}%` }}
                      />
                    </div>
                    <div className="progress-text">
                      {bulkSendProgress.sent} of {bulkSendProgress.total} messages sent
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button 
                onClick={closeBulkSMSModal}
                className="modal-button modal-button-secondary"
                disabled={bulkSending}
              >
                Cancel
              </button>
              <button 
                onClick={sendBulkSMS}
                className="modal-button modal-button-primary"
                disabled={bulkSending || selectedRecipients.size === 0 || !bulkMessage.trim()}
              >
                {bulkSending ? (
                  <>
                    <div className="loading-spinner" style={{ borderTopColor: 'white' }} />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <SendIcon />
                    <span>Send to {selectedRecipients.size} recipients</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export { AdminLogin, AdminDashboard }; 