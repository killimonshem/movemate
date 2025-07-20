import React, { useState, useEffect, useCallback } from 'react';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://frxtcfoopvmfhwjezyuf.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyeHRjZm9vcHZtZmh3amV6eXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMTMyMDAsImV4cCI6MjA2NzU4OTIwMH0.5oGZ0rAHFYfzJSF7505r0Q1FFMr6ZOZUcWb1setq-38';

// Icon Components
const CarIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-14 0a2 2 0 012-2h10a2 2 0 012 2m0 0v2m0-2a2 2 0 012 2v2m-2 2h.01M9 12h.01M9 16h.01M9 20h.01M15 12h.01M15 16h.01M15 20h.01" />
  </svg>
);

const PhoneIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const ArrowLeftIcon = ({ className = '' }) => (
  <svg className={className} style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const CheckIcon = ({ className = '' }) => (
  <svg className={className} style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = ({ className = '' }) => (
  <svg className={className} style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const SearchIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const RefreshIcon = ({ className = '' }) => (
  <svg className={className} style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const SendIcon = ({ className = '' }) => (
  <svg className={className} style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const SettingsIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// Toast Component
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      {type === 'success' ? <CheckIcon /> : <AlertIcon />}
      <span>{message}</span>
    </div>
  );
};

// Modal Component
const Modal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="modal-button modal-button-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button className="modal-button modal-button-primary" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Back Button Component
const BackButton = ({ onClick, text = "Back" }) => (
  <button 
    className="back-button" 
    onClick={onClick}
    onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
  >
    <ArrowLeftIcon />
    <span>{text}</span>
  </button>
);

// Utility functions
const formatPhoneDisplay = (phone) => {
  const formatted = formatPhoneNumber(phone);
  if (formatted.startsWith('+44')) {
    const digits = formatted.substring(3);
    return `+44 ${digits.substring(0, 4)} ${digits.substring(4)}`;
  }
  return formatted;
};

const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+44' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+44')) {
    cleaned = '+44' + cleaned;
  }
  return cleaned;
};

const maskPhoneNumber = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 3) return phone;
  return '***' + digits.substring(digits.length - 3);
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

  // Bulk SMS state
  const [showBulkSMSModal, setShowBulkSMSModal] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState(new Set());
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkSendProgress, setBulkSendProgress] = useState({ sent: 0, total: 0 });

  const [dataError, setDataError] = useState(null);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [sentSMS, setSentSMS] = useState(new Set());

  // Bulk SMS functions
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
      
      // Small delay to avoid rate limiting
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
    
    setSendingTo(selectedVehicle.phone);
    setShowModal(false);
    
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

            <button 
              onClick={() => setShowBulkSMSModal(true)} 
              className="bulk-sms-button"
              disabled={filteredRegistrations.length === 0}
            >
              <SendIcon />
              <span>Bulk SMS</span>
            </button>
          </div>
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
                          <span className="phone-text">{maskPhoneNumber(reg.phone)}</span>
                        </td>
                        <td className="timestamp-cell">
                          <div className="timestamp-display">
                            <div className="time">{formatTime(reg.created_at)}</div>
                            <div className="date">{formatDate(reg.created_at)}</div>
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
                          <div className="recipient-phone">{formatPhoneDisplay(reg.phone)}</div>
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
      
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={sendNotification}
        title="Send Move Request?"
        message={`Are you sure you want to send a move request to vehicle ${selectedVehicle?.reg}?`}
        confirmText="Send Notification"
      />
      
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

export default AdminDashboard; 