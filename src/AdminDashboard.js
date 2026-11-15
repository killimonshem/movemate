import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BackButton,
  InputField,
  LockIcon,
  ArrowRightIcon,
  SearchIcon,
  RefreshIcon,
  SettingsIcon,
  CarIcon,
  AlertIcon,
  SendIcon,
  Toast,
  Modal,
} from './components/Common';
import { supabaseUrl, supabaseKey } from './config';
import {
  formatPhoneNumber,
  formatVehicleSummary,
  maskPhoneNumber,
  matchesSearchTerm,
} from './utils/vehicleUtils';

const getRegKey = (reg) =>
  reg?.id !== undefined && reg?.id !== null
    ? String(reg.id)
    : `${reg?.reg || ''}-${reg?.created_at || ''}-${reg?.phone || ''}`;

// Admin Login Component
const AdminLogin = ({ onLogin, onBack, initialError = '' }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [authError, setAuthError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthError(initialError);
  }, [initialError]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    const nextFieldErrors = {};
    if (!username.trim()) {
      nextFieldErrors.username = 'Please enter your username.';
    }
    if (!password.trim()) {
      nextFieldErrors.password = 'Please enter your password.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setLoading(true);
    setFieldErrors({});
    setAuthError('');

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-auth`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const rawText = await response.text();
      let payload = {};
      if (rawText) {
        try {
          payload = JSON.parse(rawText);
        } catch {
          payload = {};
        }
      }

      if (!response.ok || !payload.token) {
        setAuthError(payload.error || 'Authentication failed');
      } else {
        onLogin({
          admin: payload.admin || null,
          token: payload.token,
          expiresAt: payload.expiresAt || null,
        });
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setAuthError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <BackButton onClick={onBack} disabled={loading} />
      </div>
      <div className="content-wrapper">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <h2 className="heading" style={{ fontSize: '24px', marginBottom: '24px' }}>
            Admin Access
          </h2>

          {authError && (
            <div className="error-container" role="alert" aria-live="assertive">
              <div className="error-message" style={{ marginTop: 0, marginBottom: 0 }}>
                <AlertIcon />
                <span>{authError}</span>
              </div>
            </div>
          )}

          <div>
            <InputField
              label="Username"
              icon={LockIcon}
              type="text"
              value={username}
              autoComplete="username"
              onChange={(e) => {
                setUsername(e.target.value);
                setFieldErrors((prev) => ({ ...prev, username: '' }));
                setAuthError('');
              }}
              placeholder="Enter admin username"
              error={fieldErrors.username}
              disabled={loading}
            />
            <InputField
              label="Password"
              icon={LockIcon}
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: '' }));
                setAuthError('');
              }}
              placeholder="Enter admin password"
              error={fieldErrors.password}
              disabled={loading}
            />
            <button type="submit" disabled={loading} className="button-primary">
              <span>{loading ? 'Logging in...' : 'Log in'}</span>
              {!loading && <ArrowRightIcon />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = ({ adminToken, onBack, onLogout, onSessionExpired }) => {
  const [registrations, setRegistrations] = useState([]);
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
  const [sentSMS, setSentSMS] = useState(() => new Set());
  const [showPhoneNumbers, setShowPhoneNumbers] = useState(false);

  // --- Bulk SMS State ---
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState(() => new Set());
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkSendProgress, setBulkSendProgress] = useState({ sent: 0, total: 0 });

  const fetchSeqRef = useRef(0);
  const handleToastClose = useCallback(() => setToast(null), []);

  const fetchVenues = useCallback(async () => {
    setLoadingVenues(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/fetch-venues`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch venues');
      const { data } = await response.json();
      setVenues(data || []);
    } catch (error) {
      console.error('Error fetching venues:', error);
      setToast({ message: 'Failed to fetch venues.', type: 'error' });
    } finally {
      setLoadingVenues(false);
    }
  }, []);

  const fetchRegistrations = useCallback(
    async (signal) => {
      if (!adminToken) {
        onSessionExpired?.('Please log in to view registrations.');
        return;
      }

      const seq = ++fetchSeqRef.current;
      setLoading(true);
      try {
        const url = new URL(`${supabaseUrl}/functions/v1/fetch-registrations`);
        if (selectedVenue !== '') {
          url.searchParams.set('venue_id', selectedVenue);
        }
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'x-admin-token': adminToken,
            'Content-Type': 'application/json',
          },
          signal,
        });

        if (response.status === 401) {
          onSessionExpired?.('Session expired. Please log in again.');
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch registrations');
        const { data } = await response.json();
        if (seq !== fetchSeqRef.current) return;

        setRegistrations(data || []);
        setDataError(null);
      } catch (error) {
        if (error?.name === 'AbortError' || seq !== fetchSeqRef.current) return;
        console.error('Error fetching registrations:', error);
        setDataError('Failed to fetch registrations');
        setToast({ message: 'Failed to fetch registrations', type: 'error' });
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [adminToken, selectedVenue, onSessionExpired]
  );

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRegistrations(controller.signal);
    return () => controller.abort();
  }, [fetchRegistrations]);

  const handleRefresh = () => {
    fetchVenues();
    fetchRegistrations();
  };

  const handleVenueChange = (venueId) => {
    setSelectedVenue(venueId);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedRegistrations = useMemo(() => {
    const filtered = registrations.filter((reg) => matchesSearchTerm(reg, searchTerm));
    return [...filtered].sort((a, b) => {
      let aValue;
      let bValue;
      switch (sortField) {
        case 'reg':
          aValue = String(a.reg || '').toLowerCase();
          bValue = String(b.reg || '').toLowerCase();
          break;
        case 'phone':
          aValue = String(a.phone || '');
          bValue = String(b.phone || '');
          break;
        case 'created_at': {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          aValue = Number.isNaN(timeA) ? 0 : timeA;
          bValue = Number.isNaN(timeB) ? 0 : timeB;
          break;
        }
        case 'venue': {
          const venueA = venues.find((v) => String(v.id) === String(a.venue_id));
          const venueB = venues.find((v) => String(v.id) === String(b.venue_id));
          aValue = venueA ? venueA.name.toLowerCase() : '';
          bValue = venueB ? venueB.name.toLowerCase() : '';
          break;
        }
        default:
          return 0;
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [registrations, searchTerm, sortField, sortDirection, venues]);

  const confirmSendNotification = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowModal(true);
  };

  const closeSingleModal = useCallback(() => {
    setShowModal(false);
    setSelectedVehicle(null);
  }, []);

  const sendNotification = async () => {
    if (!selectedVehicle || sendingTo) return;
    const targetVehicle = selectedVehicle;
    const targetKey = getRegKey(targetVehicle);

    setShowModal(false);
    setSendingTo(targetKey);
    try {
      let venueName = '';
      if (
        targetVehicle.venue_id !== undefined &&
        targetVehicle.venue_id !== null &&
        targetVehicle.venue_id !== ''
      ) {
        const venue = venues.find((v) => String(v.id) === String(targetVehicle.venue_id));
        venueName = venue ? venue.name : '';
      }
      const venueText = venueName ? ` at ${venueName}` : '';

      const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({
          phone: targetVehicle.phone,
          message: `URGENT: vehicle ${targetVehicle.reg}${venueText} must move immediately - someone waiting to depart. Thank you for your cooperation.`,
          from: 'MOVEMATE',
        }),
      });

      if (response.status === 401) {
        onSessionExpired?.('Session expired. Please log in again.');
        return;
      }

      if (!response.ok) {
        let errorMsg = 'Failed to send notification';
        try {
          const errPayload = await response.json();
          if (errPayload?.error) errorMsg = errPayload.error;
        } catch {
          // Use default message
        }
        throw new Error(errorMsg);
      }

      setToast({ message: `Notification sent to ${targetVehicle.reg}`, type: 'success' });
      setSentSMS((prev) => new Set([...prev, targetKey]));
    } catch (error) {
      console.error('Error sending notification:', error);
      setToast({ message: error.message || 'Failed to send notification', type: 'error' });
    } finally {
      setSendingTo(null);
      setSelectedVehicle(null);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '--';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const formatFullTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // --- Bulk SMS Functions ---
  const handleSelectAll = () => {
    if (
      sortedRegistrations.length > 0 &&
      selectedRecipients.size === sortedRegistrations.length
    ) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(sortedRegistrations.map((reg) => getRegKey(reg))));
    }
  };

  const handleSelectRecipient = (regKey) => {
    setSelectedRecipients((prev) => {
      const next = new Set(prev);
      if (next.has(regKey)) {
        next.delete(regKey);
      } else {
        next.add(regKey);
      }
      return next;
    });
  };

  const closeBulkSMSModal = useCallback(() => {
    if (bulkSending) return;
    setShowBulkSMSModal(false);
    setSelectedRecipients(new Set());
    setBulkMessage('');
    setBulkSendProgress({ sent: 0, total: 0 });
  }, [bulkSending]);

  useEffect(() => {
    if (!showBulkSMSModal) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !bulkSending) {
        closeBulkSMSModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBulkSMSModal, bulkSending, closeBulkSMSModal]);

  const sendBulkSMS = async () => {
    if (!bulkMessage.trim() || selectedRecipients.size === 0 || bulkSending) {
      if (!bulkSending) {
        setToast({ message: 'Please enter a message and select recipients', type: 'error' });
      }
      return;
    }

    // Group selected registrations by normalized phone number to avoid duplicate texts
    const selectedRows = sortedRegistrations.filter((reg) =>
      selectedRecipients.has(getRegKey(reg))
    );
    const phoneToKeys = new Map();
    for (const row of selectedRows) {
      const key = getRegKey(row);
      const normalizedPhone = formatPhoneNumber(row.phone) || String(row.phone || '').trim();
      if (!normalizedPhone) continue;
      if (!phoneToKeys.has(normalizedPhone)) {
        phoneToKeys.set(normalizedPhone, []);
      }
      phoneToKeys.get(normalizedPhone).push(key);
    }

    const recipients = Array.from(phoneToKeys.entries());
    setBulkSending(true);
    setBulkSendProgress({ sent: 0, total: recipients.length });

    let successCount = 0;
    let errorCount = 0;
    let sessionExpired = false;

    for (let i = 0; i < recipients.length; i++) {
      const [phone, rowKeys] = recipients[i];
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseKey}`,
            'x-admin-token': adminToken,
          },
          body: JSON.stringify({
            phone,
            message: bulkMessage.trim(),
            from: 'MOVEMATE',
          }),
        });

        if (response.status === 401) {
          sessionExpired = true;
          break;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        successCount++;
        setSentSMS((prev) => new Set([...prev, ...rowKeys]));
      } catch (error) {
        console.error(`Failed to send SMS to ${maskPhoneNumber(phone)}:`, error);
        errorCount++;
      }
      setBulkSendProgress({ sent: i + 1, total: recipients.length });
      if (i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    setBulkSending(false);
    setBulkSendProgress({ sent: 0, total: 0 });
    setShowBulkSMSModal(false);
    setSelectedRecipients(new Set());
    setBulkMessage('');

    if (sessionExpired) {
      onSessionExpired?.('Session expired. Please log in again.');
      return;
    }

    if (errorCount === 0) {
      setToast({
        message: `Successfully sent ${successCount} SMS message${successCount === 1 ? '' : 's'}`,
        type: 'success',
      });
    } else {
      setToast({
        message: `Sent ${successCount} message${successCount === 1 ? '' : 's'}, ${errorCount} failed`,
        type: 'error',
      });
    }
  };

  return (
    <div className="container">
      <div className="header admin-top-bar">
        <BackButton onClick={onBack} text="Back to Home" />
        <div className="admin-header-actions">
          <button
            type="button"
            className="privacy-toggle-button"
            onClick={() => setShowPhoneNumbers((prev) => !prev)}
          >
            {showPhoneNumbers ? 'Hide Numbers' : 'Show Numbers'}
          </button>
          {onLogout && (
            <button type="button" className="logout-button" onClick={onLogout}>
              Log out
            </button>
          )}
        </div>
      </div>
      <div className="admin-container">
        <div className="admin-header">
          <h1 className="heading" style={{ margin: 0 }}>
            Admin Dashboard
          </h1>
          <div className="admin-controls">
            <div className="venue-selector">
              <select
                className="venue-dropdown"
                aria-label="Filter by venue"
                value={selectedVenue}
                onChange={(e) => handleVenueChange(e.target.value)}
                disabled={loadingVenues}
              >
                <option value="">All Venues</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={String(venue.id)}>
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
                aria-label="Search registrations"
                placeholder="Search by reg or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="button" onClick={handleRefresh} className="refresh-button">
              <RefreshIcon />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setShowBulkSMSModal(true)}
              className="bulk-sms-button"
              disabled={sortedRegistrations.length === 0}
            >
              <SendIcon />
              <span>Bulk SMS</span>
            </button>
          </div>
        </div>
        <div className="admin-settings-corner">
          <button
            type="button"
            onClick={handleRefresh}
            className="admin-settings-button"
            title="Refresh Dashboard"
            aria-label="Refresh Dashboard"
          >
            <SettingsIcon />
          </button>
        </div>
        <div className="admin-content">
          {dataError ? (
            <div className="error-state">
              <AlertIcon className="error-icon" />
              <p>{dataError}</p>
              <button type="button" onClick={() => fetchRegistrations()} className="button-primary">
                <RefreshIcon />
                <span>Retry</span>
              </button>
            </div>
          ) : loading ? (
            <div className="empty-state">
              <div className="loading-spinner" style={{ margin: '0 auto', borderTopColor: '#007AFF' }} />
            </div>
          ) : sortedRegistrations.length === 0 ? (
            <div className="empty-state">
              <CarIcon className="empty-icon" />
              <p>{searchTerm ? 'No vehicles found matching your search' : 'No vehicles registered yet'}</p>
            </div>
          ) : (
            <div className="registrations-table-container">
              <table className="registrations-table">
                <thead>
                  <tr>
                    <th className="sortable-header" onClick={() => handleSort('reg')}>
                      <div className="header-content">
                        <span>Registration</span>
                        <span className="sort-icon">
                          {sortField === 'reg' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('phone')}>
                      <div className="header-content">
                        <span>Phone</span>
                        <span className="sort-icon">
                          {sortField === 'phone' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('created_at')}>
                      <div className="header-content">
                        <span>Registered</span>
                        <span className="sort-icon">
                          {sortField === 'created_at' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('venue')}>
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
                  {sortedRegistrations.map((reg) => {
                    const regKey = getRegKey(reg);
                    const venue = venues.find((v) => String(v.id) === String(reg.venue_id));
                    const vehicleSummary = formatVehicleSummary(reg.vehicle_data);
                    const isSending = sendingTo === regKey;
                    const isSent = sentSMS.has(regKey);
                    return (
                      <tr key={regKey} className="registration-row">
                        <td className="registration-cell">
                          <div className="reg-display">
                            <CarIcon />
                            <span className="reg-text">{reg.reg}</span>
                          </div>
                        </td>
                        <td className="phone-cell">
                          <span className="phone-text">
                            {showPhoneNumbers ? reg.phone : maskPhoneNumber(reg.phone)}
                          </span>
                        </td>
                        <td className="timestamp-cell">
                          <div className="timestamp-display">
                            <div className="time">{formatTime(reg.created_at)}</div>
                            <div className="date">{formatDate(reg.created_at)}</div>
                            <div className="full-timestamp">{formatFullTimestamp(reg.created_at)}</div>
                          </div>
                        </td>
                        <td className="venue-cell">
                          <span className="venue-text">{venue ? venue.name : 'Unknown'}</span>
                        </td>
                        <td className="vehicle-cell">
                          {vehicleSummary ? (
                            <span className="vehicle-text">{vehicleSummary}</span>
                          ) : (
                            <span className="no-vehicle">No vehicle data</span>
                          )}
                        </td>
                        <td className="sms-status-cell">
                          <div className="sms-status">
                            <span className={`sms-status-text ${isSent ? 'sms-sent' : ''}`}>
                              {isSent ? 'Sent' : 'Ready'}
                            </span>
                          </div>
                        </td>
                        <td className="actions-cell">
                          <div className="actions-cell-inner">
                            <button
                              type="button"
                              className="sms-button sms-button-secondary"
                              onClick={() => confirmSendNotification(reg)}
                              disabled={Boolean(sendingTo)}
                              title="Send SMS notification"
                            >
                              {isSending ? (
                                <>
                                  <div className="loading-spinner" style={{ borderTopColor: '#1e293b' }} />
                                  <span>Sending...</span>
                                </>
                              ) : (
                                <>
                                  <SendIcon />
                                  <span>Send SMS</span>
                                </>
                              )}
                            </button>
                          </div>
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
        onClose={closeSingleModal}
        onConfirm={sendNotification}
        title="Send Move Request?"
        message={`Are you sure you want to send a move request to vehicle ${selectedVehicle?.reg}?`}
        confirmText="Send Notification"
      />

      {/* Bulk SMS Modal */}
      {showBulkSMSModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!bulkSending) closeBulkSMSModal();
          }}
        >
          <div
            className="modal-content bulk-sms-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-sms-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="bulk-sms-title" className="modal-title" style={{ marginBottom: 0 }}>
                <SendIcon style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                Bulk SMS
              </h3>
              <button
                type="button"
                className="close-button"
                onClick={closeBulkSMSModal}
                disabled={bulkSending}
                aria-label="Close Bulk SMS modal"
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="bulk-sms-section">
                <div className="section-header">
                  <h4 className="section-title">Select Recipients</h4>
                  <div className="recipients-summary">
                    <span className="recipients-count">
                      {selectedRecipients.size === 0
                        ? 'No recipients selected'
                        : `${selectedRecipients.size} recipient${selectedRecipients.size === 1 ? '' : 's'} selected`}
                    </span>
                  </div>
                </div>
                <div className="bulk-sms-controls">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="select-all-button"
                    disabled={bulkSending}
                  >
                    {sortedRegistrations.length > 0 &&
                    selectedRecipients.size === sortedRegistrations.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>
                <div className="recipients-list">
                  {sortedRegistrations.map((reg) => {
                    const regKey = getRegKey(reg);
                    const venue = venues.find((v) => String(v.id) === String(reg.venue_id));
                    const isSelected = selectedRecipients.has(regKey);
                    return (
                      <div
                        key={regKey}
                        className={`recipient-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => !bulkSending && handleSelectRecipient(regKey)}
                      >
                        <input
                          type="checkbox"
                          className="recipient-checkbox"
                          aria-label={`Select ${reg.reg}`}
                          checked={isSelected}
                          onChange={() => handleSelectRecipient(regKey)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={bulkSending}
                        />
                        <div className="recipient-info">
                          <div className="recipient-reg">{reg.reg}</div>
                          <div className="recipient-phone">
                            {showPhoneNumbers ? reg.phone : maskPhoneNumber(reg.phone)}
                          </div>
                          {venue && <div className="recipient-venue">{venue.name}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bulk-sms-section">
                <div className="section-header">
                  <h4 className="section-title">Message</h4>
                  <div className="message-counter">{bulkMessage.length}/160 characters</div>
                </div>
                <textarea
                  className="message-textarea"
                  aria-label="Bulk SMS message"
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  placeholder="Enter your message here..."
                  maxLength={160}
                  disabled={bulkSending}
                />
              </div>

              {bulkSending && (
                <div className="bulk-sms-section">
                  <div className="section-header">
                    <h4 className="section-title">Sending Progress</h4>
                  </div>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${
                            bulkSendProgress.total > 0
                              ? (bulkSendProgress.sent / bulkSendProgress.total) * 100
                              : 0
                          }%`,
                        }}
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
                type="button"
                onClick={closeBulkSMSModal}
                className="modal-button modal-button-secondary"
                disabled={bulkSending}
              >
                Cancel
              </button>
              <button
                type="button"
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
                    <span>
                      Send to {selectedRecipients.size}{' '}
                      {selectedRecipients.size === 1 ? 'recipient' : 'recipients'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={handleToastClose} />}
    </div>
  );
};

export { AdminLogin, AdminDashboard };