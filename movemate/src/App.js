import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://frxtcfoopvmfhwjezyuf.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyeHRjZm9vcHZtZmh3amV6eXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMTMyMDAsImV4cCI6MjA2NzU4OTIwMH0.5oGZ0rAHFYfzJSF7505r0Q1FFMr6ZOZUcWb1setq-38';

const supabase = createClient(supabaseUrl, supabaseKey);

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

const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+44' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+44')) {
    cleaned = '+44' + cleaned;
  }
  return cleaned;
};

// Mask phone number for privacy
const maskPhoneNumber = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return phone;
  return phone.substring(0, phone.length - 7) + '***' + phone.substring(phone.length - 4);
};

// Styles object
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    paddingTop: '10px'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#007AFF',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  contentWrapper: {
    maxWidth: '400px',
    margin: '0 auto',
    width: '100%',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  heading: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: '8px',
    lineHeight: '1.2'
  },
  subheading: {
    fontSize: '18px',
    color: '#666666',
    textAlign: 'center',
    marginBottom: '48px',
    lineHeight: '1.4'
  },
  homeTitle: {
    fontSize: '42px',
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: '16px'
  },
  homeSubtitle: {
    fontSize: '20px',
    color: '#666666',
    textAlign: 'center',
    marginBottom: '48px'
  },
  buttonPrimary: {
    width: '100%',
    backgroundColor: '#007AFF',
    color: 'white',
    padding: '18px 24px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '18px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.2s ease',
    marginBottom: '16px'
  },
  buttonSecondary: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    color: '#1a1a1a',
    padding: '18px 24px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '18px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.2s ease',
    marginBottom: '16px'
  },
  buttonTertiary: {
    width: '100%',
    backgroundColor: 'white',
    color: '#666666',
    padding: '16px 24px',
    borderRadius: '12px',
    border: '1px solid #e5e5e5',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  inputContainer: {
    marginBottom: '24px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: '8px'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    width: '100%',
    padding: '16px 16px 16px 48px',
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    fontSize: '18px',
    backgroundColor: 'white',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  },
  inputFocus: {
    borderColor: '#007AFF',
    boxShadow: '0 0 0 3px rgba(0, 122, 255, 0.1)'
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5'
  },
  inputSuccess: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4'
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    width: '20px',
    height: '20px',
    color: '#666666',
    zIndex: 1
  },
  successIcon: {
    position: 'absolute',
    right: '16px',
    width: '20px',
    height: '20px',
    color: '#34C759'
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#FF3B30',
    fontSize: '14px',
    marginTop: '8px'
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '24px'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
    accentColor: '#007AFF'
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#666666',
    lineHeight: '1.4'
  },
  successContainer: {
    textAlign: 'center',
    marginBottom: '48px'
  },
  successIconContainer: {
    width: '80px',
    height: '80px',
    backgroundColor: '#E8F5E8',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px'
  },
  loadingSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid transparent',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    backgroundColor: '#FFF5F5',
    border: '1px solid #FFD1D1',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px'
  },
  adminContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
    color: '#495057',
    borderBottom: '1px solid #e9ecef'
  },
  tableCell: {
    padding: '12px',
    borderBottom: '1px solid #e9ecef',
    fontSize: '14px'
  },
  notifyButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  loginForm: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    maxWidth: '300px',
    margin: '0 auto'
  }
};

// Icon Components
const CarIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 18v-2a2 2 0 012-2h4a2 2 0 012 2v2M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m0 8h.01M8 14h.01" />
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

const ClockIcon = ({ className = '' }) => (
  <svg className={className} style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SendIcon = ({ className = '' }) => (
  <svg className={className} style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
    style={styles.backButton} 
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
  ...props 
}) => {
  // const [focused, setFocused] = useState(false);
  
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
          // onFocus={() => setFocused(true)}
          // onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={getInputClassName()}
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
  <div style={styles.container}>
    <div style={styles.contentWrapper}>
      <h1 style={styles.homeTitle}>MoveMate</h1>
      <p style={styles.homeSubtitle}>
        Making church parking stress-free, one notification at a time ✨
      </p>
      
      <div>
        <button
          style={styles.buttonPrimary}
          onClick={() => onNavigate('driver-welcome')}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#0056CC'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#007AFF'}
        >
          <span>Register My Vehicle</span>
          <ArrowRightIcon />
        </button>
        
        <button
          style={styles.buttonSecondary}
          onClick={() => onNavigate('blocked-welcome')}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E5E5'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#F5F5F5'}
        >
          <span>😤 I'm Blocked In</span>
          <ArrowRightIcon />
        </button>
        
        <button
          style={styles.buttonTertiary}
          onClick={() => onNavigate('admin-login')}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#F5F5F5'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
        >
          <span>Admin Dashboard</span>
          <LockIcon />
        </button>
      </div>
    </div>
  </div>
);

// Welcome Screen Component
const WelcomeScreen = ({ onStart, onBack, title, description, buttonText = "Get Started" }) => (
  <div style={styles.container}>
    <div style={styles.header}>
      <BackButton onClick={onBack} />
    </div>
    <div style={styles.contentWrapper}>
      <h1 style={styles.heading}>{title}</h1>
      <p style={styles.subheading}>{description}</p>
      
      <button className="button-primary" onClick={onStart}>
        <span>{buttonText}</span>
        <ArrowRightIcon />
      </button>
    </div>
  </div>
);

// Driver Registration Component
const DriverRegistration = ({ onComplete, onBack }) => {
  const [reg, setReg] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [validFields, setValidFields] = useState({});

  const validateField = (field, value) => {
    if (field === 'reg') {
      return validateUKReg(value);
    } else if (field === 'phone') {
      return validateUKMobile(value);
    }
    return false;
  };

  const handleChange = (field, value) => {
    if (field === 'reg') {
      setReg(value.toUpperCase());
    } else if (field === 'phone') {
      setPhone(value);
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
    
    if (!consent) {
      newErrors.consent = 'You must consent to data storage';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('registrations')
        .insert([
          {
            reg: reg.toUpperCase().replace(/\s/g, ''),
            phone: formatPhoneNumber(phone),
            consent_timestamp: new Date().toISOString()
          }
        ]);
      
      if (error) throw error;
      
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            phone: formatPhoneNumber(phone),
            message: `You're all set! Your vehicle ${reg.toUpperCase().replace(/\s/g, '')} is now registered with MoveMate. We'll give you a heads up if you need to move it. Thanks for helping keep our parking smooth!`
          })
        });
      } catch (smsError) {
        console.error('Failed to send confirmation SMS:', smsError);
      }
      
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      setErrors({ submit: 'Oops! Something went wrong. Mind giving it another try?' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <BackButton onClick={onBack} />
      </div>
      <div style={styles.contentWrapper}>
        <h1 style={styles.heading}>Let's Get You Registered!</h1>
        <p style={styles.subheading}>
          Just need a couple of quick details so we can reach you if someone needs to get out
        </p>
        
        <div>
          <InputField
            label="What's your vehicle registration?"
            icon={CarIcon}
            value={reg}
            onChange={(e) => handleChange('reg', e.target.value)}
            placeholder="AB12 CDE"
            error={errors.reg}
            success={validFields.reg}
          />
          
          <InputField
            label="Your mobile number"
            icon={PhoneIcon}
            value={phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="07123 456789"
            type="tel"
            error={errors.phone}
            success={validFields.phone}
          />
          
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
            <label style={styles.checkboxLabel}>
              I'm happy for you to store my details for today's service (we'll automatically delete them after 12 hours - promise!)
            </label>
          </div>
          
          {errors.consent && (
            <div className="error-message">
              <AlertIcon />
              <span>{errors.consent}</span>
            </div>
          )}
          
          {errors.submit && (
            <div className="error-container">
              <div className="error-message">
                <AlertIcon />
                <span>{errors.submit}</span>
              </div>
            </div>
          )}
        </div>
        
        <button className="button-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <span>Getting you registered...</span>
              <div style={styles.loadingSpinner}></div>
            </>
          ) : (
            <>
              <span>Register My Vehicle</span>
              <ArrowRightIcon />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Admin Login Component
const AdminLogin = ({ onLogin, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    // Simple password check - in production, use proper authentication
    if (password === 'admin123') {
      onLogin();
    } else {
      setError('Incorrect password');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <BackButton onClick={onBack} />
      </div>
      <div style={styles.contentWrapper}>
        <div style={styles.loginForm}>
          <h2 style={{ ...styles.heading, fontSize: '24px', marginBottom: '24px' }}>Admin Access</h2>
          <div>
            <InputField
              label="Password"
              icon={LockIcon}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter admin password"
              error={error}
            />
            <button 
              onClick={handleSubmit}
              style={styles.buttonPrimary}
            >
              <span>Login</span>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Admin Dashboard Component
const AdminDashboard = ({ onBack }) => {
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRegistrations(data || []);
      setFilteredRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setToast({ message: 'Failed to fetch registrations', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

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

  const confirmSendNotification = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowModal(true);
  };

  const sendNotification = async () => {
    if (!selectedVehicle) return;
    
    setShowModal(false);
    setSendingTo(selectedVehicle.phone);
    
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          phone: selectedVehicle.phone,
          message: `Your vehicle ${selectedVehicle.reg} may be blocking others. Please check and move if necessary. – MoveMate Team`
        })
      });
      setToast({ message: `Notification sent to ${selectedVehicle.reg}`, type: 'success' });
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
    fetchRegistrations();
  }, []);

  return (
    <div className="container">
      <div className="header">
        <BackButton onClick={onBack} text="Back to Home" />
      </div>
      
      <div className="admin-container">
        <div className="admin-header">
          <h1 className="heading" style={{ margin: 0 }}>Marshal Dashboard</h1>
          
          <div className="admin-controls">
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
          </div>
        </div>
        
        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="empty-state">
            <CarIcon className="empty-icon" />
            <p>{searchTerm ? 'No vehicles found matching your search' : 'No vehicles registered yet'}</p>
          </div>
        ) : (
          <div className="vehicle-grid">
            {filteredRegistrations.map((reg) => (
              <div key={reg.id} className="vehicle-card">
                <div className="vehicle-reg">
                  <CarIcon style={{ width: '24px', height: '24px' }} />
                  {reg.reg}
                </div>
                
                <div className="vehicle-info">
                  <div className="info-row">
                    <PhoneIcon style={{ width: '16px', height: '16px' }} />
                    <span>{maskPhoneNumber(reg.phone)}</span>
                  </div>
                  
                  <div className="info-row">
                    <ClockIcon />
                    <span>{formatTime(reg.created_at)} • {formatDate(reg.created_at)}</span>
                  </div>
                </div>
                
                <button
                  className="notify-button"
                  onClick={() => confirmSendNotification(reg)}
                  disabled={sendingTo === reg.phone}
                >
                  {sendingTo === reg.phone ? (
                    <>
                      <div className="loading-spinner" style={{ borderTopColor: 'white' }}></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <SendIcon />
                      <span>Send Move Request</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
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
        style={styles.buttonPrimary}
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

  const handleSubmit = async () => {
    if (!validateUKReg(reg)) {
      setError('Please enter a valid UK registration number');
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
      setError('Couldn\'t send the notification right now. Please try again or find someone to help!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <BackButton onClick={onBack} />
      </div>
      <div style={styles.contentWrapper}>
        <h1 style={styles.heading}>Oh No! Blocked In?</h1>
        <p style={styles.subheading}>
          Don't worry - we've got you covered! Just tell us which car is blocking you and we'll get them sorted
        </p>
        
        <div>
          <InputField
            label="What's the registration of the car that's blocking you?"
            icon={CarIcon}
            value={reg}
            onChange={(e) => {
              setReg(e.target.value.toUpperCase());
              setError('');
            }}
            placeholder="AB12 CDE"
            error={error}
          />
        </div>
        
        <button
          style={{
            ...styles.buttonPrimary,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <span>Sending notification...</span>
              <div style={styles.loadingSpinner}></div>
            </>
          ) : (
            <>
              <span>Send Notification</span>
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
  // const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  const renderView = () => {
    switch (view) {
      case 'home':
        return <HomeScreen onNavigate={setView} />;
      
      case 'driver-welcome':
        return (
          <WelcomeScreen
            title="Hey There!"
            description="Thanks for joining us today! Let's get your car registered so we can give you a friendly nudge if someone needs to get out."
            onStart={() => setView('driver-register')}
            onBack={() => setView('home')}
            buttonText="Let's Do This!"
          />
        );
      
      case 'driver-register':
        return <DriverRegistration onComplete={() => setView('driver-confirm')} onBack={() => setView('driver-welcome')} />;
      
      case 'driver-confirm':
        return (
          <SuccessScreen
            title="You're All Set!"
            message="Your vehicle is now registered and you should have received a confirmation text. If someone needs to get out, we'll give you a friendly heads up. Thanks for helping keep our parking smooth!"
            onFinish={() => setView('home')}
          />
        );
      
      case 'blocked-welcome':
        return (
          <WelcomeScreen
            title="Stuck Behind Someone?"
            description="We've all been there! No worries - just let us know which car is blocking you and we'll get them moving."
            onStart={() => setView('blocked-input')}
            onBack={() => setView('home')}
            buttonText="Get Me Out!"
          />
        );
      
      case 'blocked-input':
        return <BlockedDriverInput onComplete={() => setView('blocked-confirm')} onBack={() => setView('blocked-welcome')} />;
      
      case 'blocked-confirm':
        return (
          <SuccessScreen
            title="Help is on the Way!"
            message="We've sent a friendly message to the driver. They should be moving their car shortly. Thanks for your patience!"
            onFinish={() => setView('home')}
          />
        );
      
      case 'admin-login':
        return <AdminLogin onLogin={() => setView('admin')} onBack={() => setView('home')} />;
      
      case 'admin':
        return <AdminDashboard onBack={() => setView('home')} />;
      
      default:
        return <HomeScreen onNavigate={setView} />;
    }
  };

  return <>{renderView()}</>;
};

export default App;