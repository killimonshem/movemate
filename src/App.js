import React, { useState, useEffect, useCallback, useRef } from 'react';
// Supabase configuration - using Edge Functions instead of direct client
import './App.css';
import './AppStyles.css';
import DriverWelcome from './DriverWelcome';
import { AdminLogin, AdminDashboard } from './AdminDashboard';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://frxtcfoopvmfhwjezyuf.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyeHRjZm9vcHZtZmh3amV6eXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMTMyMDAsImV4cCI6MjA2NzU4OTIwMH0.5oGZ0rAHFYfzJSF7505r0Q1FFMr6ZOZUcWb1setq-38';

// Note: If you get "Settings table not found" errors, create the admin_settings table in your Supabase database:
// CREATE TABLE admin_settings (
//   id INTEGER PRIMARY KEY,

//   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
// );

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Please check your .env file in the movemate/ directory');
}

async function loadVenues(signal) {
  const response = await fetch(`${supabaseUrl}/functions/v1/fetch-venues`, {
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    signal,
  });

  if (!response.ok) throw new Error('Failed to fetch venues');

  const { data } = await response.json();
  return data || [];
}

// Validation functions
const validateUKReg = (reg) => {
  const pattern = /^[A-Z]{2}[0-9]{2}\s?[A-Z]{3}$|^[A-Z][0-9]{1,3}\s?[A-Z]{3}$|^[A-Z]{3}\s?[0-9]{1,3}[A-Z]$|^[0-9]{1,4}\s?[A-Z]{1,2}$|^[0-9]{1,3}\s?[A-Z]{1,3}$|^[A-Z]{1,2}\s?[0-9]{1,4}$|^[A-Z]{1,3}\s?[0-9]{1,3}$|^[A-Z]{1,3}\s?[0-9]{1,4}$/i;
  return pattern.test(reg.replace(/\s/g, ''));
};



const validateUKMobile = (phone) => {
  const pattern = /^(\+44|0)7[0-9]{9}$/;
  return pattern.test(phone.replace(/\s/g, ''));
};

// Format phone number for display
const formatPhoneDisplay = (phone) => {
  const formatted = formatPhoneNumber(phone);
  // Format as +44 7123 456789
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

// Mask phone number for privacy - show only last 3 digits
const maskPhoneNumber = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 3) return phone;
  return '***' + digits.substring(digits.length - 3);
};

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

const ArrowRightIcon = ({ className = '' }) => (
  <svg className={className} style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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

const LockIcon = ({ className = '' }) => (
  <svg className={className} style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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

const VenueIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

// Van Icon for vehicle registration
const VanIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="7" width="13" height="10" rx="2" strokeWidth="1.5" />
    <path d="M16 11h2.5a1 1 0 01.95.684l1.1 3.3A1 1 0 0120.6 16H19" strokeWidth="1.5" />
    <circle cx="7.5" cy="17" r="1.5" strokeWidth="1.5" />
    <circle cx="17.5" cy="17" r="1.5" strokeWidth="1.5" />
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

// Input Field Component
const InputField = ({ 
  label, 
  icon: Icon, 
  value, 
  onChange, 
  placeholder, 
  type = "text", 
  error, 
  success,
  maxLength,
  ...props 
}) => {
  const getInputClassName = () => {
    let className = 'input';
    if (error) className += ' input-error';
    else if (success) className += ' input-success';
    return className;
  };

  return (
    <div className="input-container">
      <label className="label">{label}</label>
      <div className="input-wrapper">
        <Icon className={`input-icon ${error ? 'error' : success ? 'success' : ''}`} />
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={getInputClassName()}
          maxLength={maxLength}
          {...props}
        />
        {success && <CheckIcon className="success-icon" />}
      </div>
      {error && (
        <div className="error-message" role="alert" aria-live="assertive">
          <AlertIcon />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

const DetailsConfirmationScreen = ({ details, onConfirm, onEdit, onBack }) => (
  <div className="container">
    <div className="content-wrapper">
      <div className="details-confirmation-card" tabIndex={0} aria-labelledby="details-confirmation-heading">
        <div className="header-row">
          <button 
            className="close-button" 
            onClick={onBack}
            title="Close"
            aria-label="Close"
            type="button"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <h1 className="heading" id="details-confirmation-heading" style={{ marginTop: 0 }}>Are your details correct?</h1>
        <p className="subheading">
          Please confirm your details before we register your vehicle
        </p>
        <div className="detail-row">
          <div className="detail-label">
            <VanIcon aria-hidden="true" />
            <span>Registration</span>
          </div>
          <div className="detail-value">{details.reg}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">
            <PhoneIcon aria-hidden="true" />
            <span>Number</span>
          </div>
          <div className="detail-value">{details.phone}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">
            <VenueIcon aria-hidden="true" />
            <span>Venue</span>
          </div>
          <div className="detail-value detail-value-venue">{details.venue}</div>
        </div>
        <div className="confirmation-actions">
          <button 
            className="button-secondary" 
            onClick={onEdit}
            type="button"
          >
            <ArrowLeftIcon aria-hidden="true" />
            <span>No, let me edit</span>
          </button>
          <button 
            className="button-primary" 
            onClick={onConfirm}
            type="button"
          >
            <span>Yes, they're correct</span>
            <ArrowRightIcon aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Driver Registration Component
const DriverRegistration = ({ onComplete, onBack, venueId }) => {
  const [reg, setReg] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('');
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [validFields, setValidFields] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [vehicleData, setVehicleData] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState('');
  const debounceRef = useRef();

  const DVLA_PROXY_URL = process.env.REACT_APP_DVLA_PROXY_URL || '/api/vehicle-enquiry';
    const MOCK_REGISTRATIONS = {
    'AB12CDE': { colour: 'BLACK', make: 'BMW', model: '3 Series', registrationNumber: 'AB12CDE' },
    'CD34EFG': { colour: 'WHITE', make: 'FORD', model: 'Fiesta', registrationNumber: 'CD34EFG' },
    'EF56HIJ': { colour: 'BLUE', make: 'TOYOTA', model: 'Corolla', registrationNumber: 'EF56HIJ' },
    'GH78KLM': { colour: 'RED', make: 'AUDI', model: 'A3', registrationNumber: 'GH78KLM' },
    'IJ90NOP': { colour: 'GREY', make: 'MERCEDES', model: 'C Class', registrationNumber: 'IJ90NOP' },
    'KL12QRS': { colour: 'SILVER', make: 'HONDA', model: 'Civic', registrationNumber: 'KL12QRS' },
    'MN34TUV': { colour: 'GREEN', make: 'NISSAN', model: 'Qashqai', registrationNumber: 'MN34TUV' },
    'OP56WXY': { colour: 'YELLOW', make: 'RENAULT', model: 'Clio', registrationNumber: 'OP56WXY' },
    'QR78ZAB': { colour: 'ORANGE', make: 'VOLKSWAGEN', model: 'Golf', registrationNumber: 'QR78ZAB' },
    'ST90CDE': { colour: 'BROWN', make: 'KIA', model: 'Sportage', registrationNumber: 'ST90CDE' },
  };

  const fetchVehicleData = async (reg) => {
    setVehicleError('');
    setVehicleData(null);
    if (!reg) return; // Only skip if empty
    const regClean = reg.replace(/\s/g, '').toUpperCase();
    if (MOCK_REGISTRATIONS[regClean]) {
      setVehicleData(MOCK_REGISTRATIONS[regClean]);
      return;
    }
    setVehicleLoading(true);
    try {
      console.log('Calling DVLA API for:', regClean);
      const res = await fetch(DVLA_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: regClean }),
      });

      if (!res.ok) {
        // Try to parse error details from the response
        let errorMsg = 'Vehicle not found or DVLA error';
        try {
          const errorData = await res.json();
          if (errorData.errors && errorData.errors[0] && errorData.errors[0].detail) {
            errorMsg = errorData.errors[0].detail;
          } else if (errorData.message) {
            errorMsg = errorData.message;
          }
        } catch (e) {
          // Ignore JSON parse errors, use default errorMsg
        }
        setVehicleError(errorMsg);
        setVehicleData(null);
        return;
      }

      const data = await res.json();
      setVehicleData(data);
      setVehicleError('');
    } catch (err) {
      setVehicleError('Network error or proxy not running');
      setVehicleData(null);
    } finally {
      setVehicleLoading(false);
    }
  };


  const validateField = (field, value) => {
    if (field === 'reg') {
      return validateUKReg(value);
    } else if (field === 'phone') {
      return validateUKMobile(value);
    } else if (field === 'venue') {
      return value && value !== '';
    }
    return false;
  };

  const handleChange = (field, value) => {
    if (field === 'reg') {
      setReg(value.toUpperCase());
      setVehicleData(null);
      setVehicleError('');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchVehicleData(value);
      }, 600);
    } else if (field === 'phone') {
      setPhone(value);
    } else if (field === 'venue') {
      setSelectedVenue(value);
    }
    
    setErrors(prev => ({ ...prev, [field]: '' }));
    setValidFields(prev => ({ 
      ...prev, 
      [field]: value && validateField(field, value) 
    }));
  };

  const handleSubmit = async () => {
    const newErrors = {};
    
    if (!validateUKReg(reg)) {
      newErrors.reg = 'Please enter a valid UK registration number';
    }
    
    if (!validateUKMobile(phone)) {
      newErrors.phone = 'Please enter a valid UK mobile number';
    }
    
    if (!selectedVenue) {
      newErrors.venue = 'Please select a venue';
    }
    
    if (!consent) {
      newErrors.consent = 'You must consent to data storage';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Only show confirmation screen, do not register yet
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setErrors({});
    try {
      // Check for existing registration for this reg today
      const response = await fetch(`${supabaseUrl}/functions/v1/register-vehicle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reg: reg.toUpperCase().replace(/\s/g, ''),
          phone: formatPhoneNumber(phone),
          venue_id: selectedVenue,
          vehicle_data: vehicleData
        })
      });

      if (response.status === 409) {
        setErrors({ reg: 'This vehicle is already registered today.' });
        setShowConfirmation(false);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      
      try {
        // Get venue name for personalization
        let venueName = '';
        if (selectedVenue) {
          const venue = venues.find(v => v.id === selectedVenue);
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
            phone: formatPhoneNumber(phone),
            message: `MoveMate: Your vehicle ${reg.toUpperCase().replace(/\s/g, '')}${venueText} is validated with MoveMate. You'll receive immediate notifications if your vehicle blocks access. Privacy: tiny.cc/movemate`,
            from: 'MOVEMATE'
          })
        });
      } catch (smsError) {
        console.error('Failed to send confirmation SMS:', smsError);
      }
      
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      setErrors({ submit: 'Oops! Something went wrong. Mind giving it another try?' });
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDetails = () => {
    setShowConfirmation(false);
  };

  useEffect(() => {
    const request = new AbortController();
    setLoadingVenues(true);
    loadVenues(request.signal)
      .then((availableVenues) => {
        if (request.signal.aborted) return;
        setVenues(availableVenues);
        const linkedVenue = availableVenues.find((venue) => String(venue.id) === venueId);
        setSelectedVenue((current) => current || linkedVenue?.id || '');
      })
      .catch((error) => {
        if (!request.signal.aborted) console.error('Error fetching venues:', error);
      })
      .finally(() => {
        if (!request.signal.aborted) setLoadingVenues(false);
      });
    return () => request.abort();
  }, [venueId]);

  // If showing confirmation screen, render that instead
  if (showConfirmation) {
    const selectedVenueName = venues.find(v => v.id === selectedVenue)?.name || 'Unknown';
    const details = {
      reg: reg.toUpperCase().replace(/\s/g, ''),
      phone: formatPhoneDisplay(phone),
      venue: selectedVenueName
    };
    
    return (
      <DetailsConfirmationScreen
        details={details}
        onConfirm={handleConfirmSubmit}
        onEdit={handleEditDetails}
        onBack={handleEditDetails}
      />
    );
  }

  return (
    <div className="container">
      <div className="header">
        <BackButton onClick={onBack} />
      </div>
      <div className="content-wrapper">
        <h1 className="heading">Let's Get You Registered!</h1>
        <p className="subheading">
          Just need a couple of quick details so we can reach you if someone needs to get out
        </p>
        
        <div>
          <div style={{ position: 'relative' }}>
            <InputField
              label="What's your vehicle registration?"
              icon={CarIcon}
              value={reg}
              onChange={(e) => {
                handleChange('reg', e.target.value);
                // Live update: fetch vehicle details if 4+ chars
                const value = e.target.value.replace(/\s/g, '');
                if (value.length >= 4) {
                  fetchVehicleData(value);
                } else {
                  setVehicleData(null);
                  setVehicleError('');
                }
              }}
              placeholder="AB12 CDE"
              error={errors.reg}
              success={validFields.reg}
            />
            {/* Inline loading indicator */}
            {reg.replace(/\s/g, '').length >= 5 && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                {vehicleLoading && (
                  <span className="vehicle-info vehicle-info-loading" style={{ color: '#64748b', fontSize: '0.95rem' }}>
                    <span className="spinner" style={{
                      display: 'inline-block',
                      width: 16,
                      height: 16,
                      border: '2px solid #cbd5e1',
                      borderTop: '2px solid #64748b',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginRight: 6,
                      verticalAlign: 'middle'
                    }} />
                    Looking up...
                  </span>
                )}
              </div>
            )}
            {/* Vehicle info or error below input */}
            {vehicleData && !vehicleLoading && reg.replace(/\s/g, '').length >= 4 && (
              <span className="vehicle-info" style={{ display: 'block', marginTop: 4, color: '#64748b', fontSize: '0.95rem' }}>
                {`
                  ${vehicleData.colour || ''}
                  ${vehicleData.engineCapacity ? (vehicleData.engineCapacity / 1000).toFixed(1) + 'L' : ''}
                  ${vehicleData.make || ''}
                  ${vehicleData.model || ''}
                `.replace(/ +/g, ' ').trim()}
              </span>
            )}
            {vehicleError && !vehicleLoading && reg.replace(/\s/g, '').length >= 4 && (
              <span className="vehicle-info vehicle-info-error" style={{ display: 'block', marginTop: 4, color: '#d32f2f', fontSize: '0.95rem' }}>
                {vehicleError}
              </span>
            )}
          </div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg);}
                100% { transform: rotate(360deg);}
              }
            `}
          </style>
          <InputField
            label="Your mobile number"
            icon={PhoneIcon}
            value={phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="07123 456789"
            type="tel"
            error={errors.phone}
            success={validFields.phone}
            maxLength={15}
          />
          
          <div className="input-container">
            <label className="label">
              Select your venue
            </label>
            <div className="input-wrapper">
              <VenueIcon className="input-icon" />
              <select
                className={`input`}
                value={selectedVenue}
                onChange={(e) => handleChange('venue', e.target.value)}
                disabled={loadingVenues}
              >
                <option value="">Choose a venue...</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.venue && (
              <div className="error-message" role="alert" aria-live="assertive">
                <AlertIcon />
                <span>{errors.venue}</span>
              </div>
            )}
          </div>
          
          <div className="checkbox-container">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                setErrors(prev => ({ ...prev, consent: '' }));
              }}
              className="checkbox"
            />
            <label className="checkbox-label">
            Yes, use my details for today's parking validation (deleted automatically after today)
            </label>
          </div>
          
          {errors.consent && (
            <div className="error-message" role="alert" aria-live="assertive">
              <AlertIcon />
              <span>{errors.consent}</span>
            </div>
          )}
          
          {errors.submit && (
            <div className="error-container">
              <div className="error-message" role="alert" aria-live="assertive">
                <AlertIcon />
                <span>{errors.submit}</span>
              </div>
            </div>
          )}
        </div>
        
        <button className="button-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <span>Registering your vehicle…</span>
              <div className="loading-spinner"></div>
            </>
          ) : (
            <>
              <span>Register my vehicle</span>
              <ArrowRightIcon />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Success Screen Component
const SuccessScreen = ({ onFinish, title, message }) => (
  <div className="container">
    <div className="content-wrapper">
      <div className="success-container">
        <div className="success-icon-container">
          <CheckIcon style={{ width: '40px', height: '40px', color: '#34C759' }} />
        </div>
        <h1 className="heading">{title}</h1>
        <p className="subheading">{message}</p>
      </div>
      
      <button
        className="button-primary"
        onClick={onFinish}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#0056CC'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#007AFF'}
      >
        <span>Perfect!</span>
        <CheckIcon />
      </button>
    </div>
  </div>
);

// Blocked Driver Input Component
const BlockedDriverInput = ({ onComplete, onBack }) => {
  const [reg, setReg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState('');
  const debounceRef = useRef();

  // DVLA lookup logic (copied from DriverRegistration)
  const DVLA_PROXY_URL = process.env.REACT_APP_DVLA_PROXY_URL || '/api/vehicle-enquiry';
  const MOCK_REGISTRATIONS = {
    'AB12CDE': { colour: 'BLACK', make: 'BMW', model: '3 Series', registrationNumber: 'AB12CDE' },
    'CD34EFG': { colour: 'WHITE', make: 'FORD', model: 'Fiesta', registrationNumber: 'CD34EFG' },
    'EF56HIJ': { colour: 'BLUE', make: 'TOYOTA', model: 'Corolla', registrationNumber: 'EF56HIJ' },
    'GH78KLM': { colour: 'RED', make: 'AUDI', model: 'A3', registrationNumber: 'GH78KLM' },
    'IJ90NOP': { colour: 'GREY', make: 'MERCEDES', model: 'C Class', registrationNumber: 'IJ90NOP' },
    'KL12QRS': { colour: 'SILVER', make: 'HONDA', model: 'Civic', registrationNumber: 'KL12QRS' },
    'MN34TUV': { colour: 'GREEN', make: 'NISSAN', model: 'Qashqai', registrationNumber: 'MN34TUV' },
    'OP56WXY': { colour: 'YELLOW', make: 'RENAULT', model: 'Clio', registrationNumber: 'OP56WXY' },
    'QR78ZAB': { colour: 'ORANGE', make: 'VOLKSWAGEN', model: 'Golf', registrationNumber: 'QR78ZAB' },
    'ST90CDE': { colour: 'BROWN', make: 'KIA', model: 'Sportage', registrationNumber: 'ST90CDE' },
  };

  const fetchVehicleData = async (reg) => {
    setVehicleError('');
    setVehicleData(null);
    if (!reg) return;
    const regClean = reg.replace(/\s/g, '').toUpperCase();
    if (MOCK_REGISTRATIONS[regClean]) {
      setVehicleData(MOCK_REGISTRATIONS[regClean]);
      return;
    }
    setVehicleLoading(true);
    try {
      const res = await fetch(DVLA_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: regClean }),
      });
      if (!res.ok) {
        let errorMsg = 'Vehicle not found or DVLA error';
        try {
          const errorData = await res.json();
          if (errorData.errors && errorData.errors[0] && errorData.errors[0].detail) {
            errorMsg = errorData.errors[0].detail;
          } else if (errorData.message) {
            errorMsg = errorData.message;
          }
        } catch (e) {}
        setVehicleError(errorMsg);
        setVehicleData(null);
        return;
      }
      const data = await res.json();
      setVehicleData(data);
      setVehicleError('');
    } catch (err) {
      setVehicleError('Network error or proxy not running');
      setVehicleData(null);
    } finally {
      setVehicleLoading(false);
    }
  };

  const handleRegChange = (value) => {
    setReg(value.toUpperCase());
    setError('');
    setVehicleData(null);
    setVehicleError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchVehicleData(value);
    }, 600);
  };

  const handleSubmit = async () => {
    if (!validateUKReg(reg)) {
      setError('Please enter a valid UK registration number.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          blockedReg: reg.toUpperCase().replace(/\s/g, '')
        })
      });
      if (!response.ok) throw new Error('Failed to send notification');
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      setError('We couldn’t send the notification right now. Please try again or ask someone for assistance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <BackButton onClick={onBack} />
      </div>
      <div className="content-wrapper">
        <h1 className="heading">Oh no! Blocked in?</h1>
        <p className="subheading">
          Don't worry – we've got you covered! Just tell us which car is blocking you and we'll handle the rest sorted.
        </p>
        <div style={{ position: 'relative' }}>
          <InputField
            label="What is the registration of the car that is blocking you?"
            icon={CarIcon}
            value={reg}
            onChange={(e) => handleRegChange(e.target.value)}
            placeholder="AB12 CDE"
            error={error}
          />
          {/* Inline loading indicator */}
          {reg.replace(/\s/g, '').length >= 4 && (
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
              {vehicleLoading && (
                <span className="vehicle-info vehicle-info-loading" style={{ color: '#64748b', fontSize: '0.95rem' }}>
                  <span className="spinner" style={{
                    display: 'inline-block',
                    width: 16,
                    height: 16,
                    border: '2px solid #cbd5e1',
                    borderTop: '2px solid #64748b',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: 6,
                    verticalAlign: 'middle'
                  }} />
                  Looking up...
                </span>
              )}
            </div>
          )}
          {/* Vehicle info or error below input */}
          {vehicleData && !vehicleLoading && reg.replace(/\s/g, '').length >= 4 && (
            <span className="vehicle-info" style={{ display: 'block', marginTop: 4, color: '#64748b', fontSize: '0.95rem' }}>
              {`
                ${vehicleData.colour || ''}
                ${vehicleData.engineCapacity ? (vehicleData.engineCapacity / 1000).toFixed(1) + 'L' : ''}
                ${vehicleData.make || ''}
                ${vehicleData.model || ''}
              `.replace(/ +/g, ' ').trim()}
            </span>
          )}
          {vehicleError && !vehicleLoading && reg.replace(/\s/g, '').length >= 4 && (
            <span className="vehicle-info vehicle-info-error" style={{ display: 'block', marginTop: 4, color: '#d32f2f', fontSize: '0.95rem' }}>
              {vehicleError}
            </span>
          )}
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg);}
              100% { transform: rotate(360deg);}
            }
          `}
        </style>
        <button
          className="button-primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <span>Sending notification...</span>
              <div className="loading-spinner"></div>
            </>
          ) : (
            <>
              <span>Send notification</span>
              <ArrowRightIcon />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [view, setView] = useState('home');
  const [venueId] = useState(() => new URLSearchParams(window.location.search).get('venue_id'));
  const [venueName, setVenueName] = useState('');

  useEffect(() => {
    if (!venueId) return;
    const request = new AbortController();
    loadVenues(request.signal)
      .then((venues) => {
        const venue = venues.find((item) => String(item.id) === venueId);
        if (!request.signal.aborted && venue) setVenueName(venue.name);
      })
      .catch((error) => {
        if (!request.signal.aborted) console.error('Error fetching venue context:', error);
      });
    return () => request.abort();
  }, [venueId]);

  const renderView = () => {
    switch (view) {
      case 'home':
        return <DriverWelcome onNavigate={setView} venueName={venueName} />;
      
      case 'driver-register':
        return <DriverRegistration venueId={venueId} onComplete={() => setView('driver-confirm')} onBack={() => setView('home')} />;
      
      case 'driver-confirm':
        return (
          <SuccessScreen
            title="You’re all set!"
            message="Your vehicle is now registered and you should have received a confirmation text. If someone needs to leave, we’ll give you a polite heads up. Thank you for helping keep our parking running smoothly!"
            onFinish={() => setView('home')}
          />
        );
      
      case 'blocked-input':
        return <BlockedDriverInput onComplete={() => setView('blocked-confirm')} onBack={() => setView('home')} />;
      
      case 'blocked-confirm':
        return (
          <SuccessScreen
            title="Help is on the way!"
            message="We’ve sent a polite message to the driver. They should be moving their car shortly. Thank you for your patience!"
            onFinish={() => setView('home')}
          />
        );
      
      case 'admin-login':
        return <AdminLogin onLogin={() => setView('admin')} onBack={() => setView('home')} />;
      
      case 'admin':
        return <AdminDashboard onBack={() => setView('home')} />;
      
      default:
        return <DriverWelcome onNavigate={setView} venueName={venueName} />;
    }
  };

  return <>{renderView()}</>;
};

export {
  BackButton,
  InputField,
  LockIcon,
  ArrowRightIcon,
  SearchIcon,
  RefreshIcon,
  SendIcon,
  SettingsIcon,
  CarIcon,
  AlertIcon,
  Toast,
  Modal
};

export default App;