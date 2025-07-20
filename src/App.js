import React, { useState, useEffect } from 'react';
import AdminDashboard from './AdminDashboard';
import './App.css';
import './AppStyles.css';

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
    let className = "input";
    if (error) className += " input-error";
    if (success) className += " input-success";
    return className;
  };

  return (
    <div className="input-container">
      <label className="label">{label}</label>
      <div className="input-wrapper">
        {Icon && <Icon className="input-icon" />}
        <input
          type={type}
          className={getInputClassName()}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          {...props}
        />
        {success && <CheckIcon className="success-icon" />}
      </div>
      {error && (
        <div className="error-message">
          <AlertIcon />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// Home Screen Component
const HomeScreen = ({ onNavigate }) => (
  <div className="container">
    <div className="content-wrapper">
      <h1 className="home-title">MoveMate</h1>
      <p className="home-subtitle">
        The smart way to manage vehicle movements at your venue
      </p>
      
      <button 
        className="button-primary"
        onClick={() => onNavigate('driver-registration')}
      >
        <span>Register My Vehicle</span>
        <ArrowRightIcon />
      </button>
      
      <button 
        className="button-secondary"
        onClick={() => onNavigate('blocked-driver')}
      >
        <span>I'm Blocked In</span>
        <ArrowRightIcon />
      </button>
      
      <button 
        className="button-tertiary"
        onClick={() => onNavigate('admin-login')}
      >
        <span>Admin Access</span>
        <ArrowRightIcon />
      </button>
    </div>
  </div>
);

// Welcome Screen Component
const WelcomeScreen = ({ onStart, onBack, title, description, buttonText = "Get Started" }) => (
  <div className="container">
    <div className="header">
      <BackButton onClick={onBack} />
    </div>
    <div className="content-wrapper">
      <h1 className="heading">{title}</h1>
      <p className="subheading">{description}</p>
      
      <button 
        className="button-primary"
        onClick={onStart}
      >
        <span>{buttonText}</span>
        <ArrowRightIcon />
      </button>
    </div>
  </div>
);

// Details Confirmation Screen Component
const DetailsConfirmationScreen = ({ details, onConfirm, onEdit, onBack }) => (
  <div className="container">
    <div className="header">
      <BackButton onClick={onBack} />
    </div>
    <div className="content-wrapper">
      <h1 className="heading">Confirm Your Details</h1>
      <p className="subheading">Please review your information before submitting</p>
      
      <div className="details-card">
        <div className="detail-row">
          <span className="detail-label">Registration:</span>
          <span className="detail-value">{details.reg}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Phone:</span>
          <span className="detail-value">{formatPhoneDisplay(details.phone)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Venue:</span>
          <span className="detail-value">{details.venue}</span>
        </div>
      </div>
      
      <button 
        className="button-primary"
        onClick={onConfirm}
      >
        <span>Confirm & Submit</span>
        <CheckIcon />
      </button>
      
      <button 
        className="button-tertiary"
        onClick={onEdit}
      >
        <span>Edit Details</span>
        <ArrowRightIcon />
      </button>
    </div>
  </div>
);

// Driver Registration Component
const DriverRegistration = ({ onComplete, onBack }) => {
  const [step, setStep] = useState('input');
  const [formData, setFormData] = useState({
    reg: '',
    phone: '',
    venue_id: '',
    venue: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);

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
    } catch (error) {
      console.error('Error fetching venues:', error);
    } finally {
      setLoadingVenues(false);
    }
  };

  const fetchVehicleData = async (reg) => {
    if (!reg) return;
    const regClean = reg.replace(/\s/g, '').toUpperCase();
    
    // Mock vehicle data for demo
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

    if (MOCK_REGISTRATIONS[regClean]) {
      // Vehicle found in mock data
      return MOCK_REGISTRATIONS[regClean];
    }

    // Try DVLA API (if available)
    try {
      const DVLA_PROXY_URL = process.env.REACT_APP_DVLA_PROXY_URL || '/api/vehicle-enquiry';
      const res = await fetch(DVLA_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: regClean }),
      });
      
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.log('DVLA lookup not available');
    }
    
    return null;
  };

  const validateField = (field, value) => {
    switch (field) {
      case 'reg':
        return validateUKReg(value) ? '' : 'Please enter a valid UK registration number';
      case 'phone':
        return validateUKMobile(value) ? '' : 'Please enter a valid UK mobile number';
      case 'venue_id':
        return value ? '' : 'Please select a venue';
      default:
        return '';
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Update venue name when venue_id changes
    if (field === 'venue_id') {
      const venue = venues.find(v => v.id === value);
      setFormData(prev => ({ ...prev, venue: venue ? venue.name : '' }));
    }
  };

  const handleSubmit = async () => {
    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Try to fetch vehicle data
    const vehicleData = await fetchVehicleData(formData.reg);
    
    // Move to confirmation step
    setStep('confirmation');
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/register-vehicle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          reg: formData.reg.toUpperCase().replace(/\s/g, ''),
          phone: formatPhoneNumber(formData.phone),
          venue_id: formData.venue_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      onComplete();
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ submit: error.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditDetails = () => {
    setStep('input');
    setErrors({});
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  if (step === 'confirmation') {
    return (
      <DetailsConfirmationScreen
        details={formData}
        onConfirm={handleConfirmSubmit}
        onEdit={handleEditDetails}
        onBack={() => setStep('input')}
      />
    );
  }

  return (
    <div className="container">
      <div className="header">
        <BackButton onClick={onBack} />
      </div>
      <div className="content-wrapper">
        <h1 className="heading">Register Your Vehicle</h1>
        <p className="subheading">
          Help us keep your venue running smoothly by registering your vehicle details
        </p>
        
        <InputField
          label="Vehicle Registration"
          icon={CarIcon}
          value={formData.reg}
          onChange={(e) => handleChange('reg', e.target.value.toUpperCase())}
          placeholder="AB12 CDE"
          error={errors.reg}
          maxLength={8}
        />
        
        <InputField
          label="Mobile Number"
          icon={PhoneIcon}
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="07123 456789"
          error={errors.phone}
          maxLength={15}
        />
        
        <div className="input-container">
          <label className="label">Venue</label>
          <div className="input-wrapper">
            <select
              className="input"
              value={formData.venue_id}
              onChange={(e) => handleChange('venue_id', e.target.value)}
              disabled={loadingVenues}
            >
              <option value="">Select a venue...</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>
          {errors.venue_id && (
            <div className="error-message">
              <AlertIcon />
              <span>{errors.venue_id}</span>
            </div>
          )}
        </div>
        
        {errors.submit && (
          <div className="error-container">
            <div className="error-message">
              <AlertIcon />
              <span>{errors.submit}</span>
            </div>
          </div>
        )}
        
        <button 
          className="button-primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          <span>{loading ? 'Processing...' : 'Continue'}</span>
          {!loading && <ArrowRightIcon />}
        </button>
      </div>
    </div>
  );
};

// Admin Login Component
const AdminLogin = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const fetchVehicleData = async (reg) => {
    setVehicleError('');
    setVehicleData(null);
    if (!reg) return;
    const regClean = reg.replace(/\s/g, '').toUpperCase();
    
    // Mock vehicle data for demo
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

    if (MOCK_REGISTRATIONS[regClean]) {
      setVehicleData(MOCK_REGISTRATIONS[regClean]);
      return;
    }

    setVehicleLoading(true);
    try {
      const DVLA_PROXY_URL = process.env.REACT_APP_DVLA_PROXY_URL || '/api/vehicle-enquiry';
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
    
    // Debounce the API call
    const timeoutId = setTimeout(() => {
      fetchVehicleData(value);
    }, 600);
    
    return () => clearTimeout(timeoutId);
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
      setError('We couldn\'t send the notification right now. Please try again or ask someone for assistance.');
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
              <div className="loading-spinner"></div>
              <span>Sending notification...</span>
            </>
          ) : (
            <>
              <span>Send Move Request</span>
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
  const [currentView, setCurrentView] = useState('home');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeScreen onNavigate={setCurrentView} />;
      case 'driver-registration':
        return <DriverRegistration onComplete={() => setCurrentView('success')} onBack={() => setCurrentView('home')} />;
      case 'blocked-driver':
        return <BlockedDriverInput onComplete={() => setCurrentView('blocked-success')} onBack={() => setCurrentView('home')} />;
      case 'admin-login':
        return <AdminLogin onLogin={() => setIsAdminLoggedIn(true)} onBack={() => setCurrentView('home')} />;
      case 'admin-dashboard':
        return <AdminDashboard onBack={() => setCurrentView('home')} />;
      case 'success':
        return <SuccessScreen onFinish={() => setCurrentView('home')} title="Registration Complete!" message="Your vehicle has been successfully registered. We'll contact you if we need you to move your vehicle." />;
      case 'blocked-success':
        return <SuccessScreen onFinish={() => setCurrentView('home')} title="Notification Sent!" message="We've sent a move request to the vehicle owner. They should move their vehicle shortly." />;
      default:
        return <HomeScreen onNavigate={setCurrentView} />;
    }
  };

  // Navigate to admin dashboard if logged in
  useEffect(() => {
    if (isAdminLoggedIn) {
      setCurrentView('admin-dashboard');
      setIsAdminLoggedIn(false);
    }
  }, [isAdminLoggedIn]);

  return (
    <div className="App">
      {renderView()}
    </div>
  );
};

export default App;