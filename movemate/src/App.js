import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

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
const CarIcon = ({ style = {} }) => (
  <svg style={{ ...styles.inputIcon, ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 18v-2a2 2 0 012-2h4a2 2 0 012 2v2M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m0 8h.01M8 14h.01" />
  </svg>
);

const PhoneIcon = ({ style = {} }) => (
  <svg style={{ ...styles.inputIcon, ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const ArrowRightIcon = ({ style = {} }) => (
  <svg style={{ width: '20px', height: '20px', ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ArrowLeftIcon = ({ style = {} }) => (
  <svg style={{ width: '20px', height: '20px', ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const CheckIcon = ({ style = {} }) => (
  <svg style={{ width: '20px', height: '20px', ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = ({ style = {} }) => (
  <svg style={{ width: '16px', height: '16px', ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const LockIcon = ({ style = {} }) => (
  <svg style={{ width: '16px', height: '16px', ...style }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

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
  const [focused, setFocused] = useState(false);
  
  const getInputStyle = () => {
    if (error) return { ...styles.input, ...styles.inputError };
    if (success) return { ...styles.input, ...styles.inputSuccess };
    if (focused) return { ...styles.input, ...styles.inputFocus };
    return styles.input;
  };

  return (
    <div style={styles.inputContainer}>
      <label style={styles.label}>{label}</label>
      <div style={styles.inputWrapper}>
        <Icon style={{ ...styles.inputIcon, color: error ? '#FF3B30' : success ? '#34C759' : '#666666' }} />
        <input
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={getInputStyle()}
          {...props}
        />
        {success && (
          <CheckIcon style={styles.successIcon} />
        )}
      </div>
      {error && (
        <div style={styles.errorMessage}>
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
      
      <button
        style={styles.buttonPrimary}
        onClick={onStart}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#0056CC'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#007AFF'}
      >
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

  const buttonStyle = {
    ...styles.buttonPrimary,
    opacity: loading ? 0.6 : 1,
    cursor: loading ? 'not-allowed' : 'pointer'
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
          
          <div style={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                setErrors(prev => ({ ...prev, consent: '' }));
              }}
              style={styles.checkbox}
            />
            <label style={styles.checkboxLabel}>
              I'm happy for you to store my details for today's service (we'll automatically delete them after 12 hours - promise!)
            </label>
          </div>
          
          {errors.consent && (
            <div style={styles.errorMessage}>
              <AlertIcon />
              <span>{errors.consent}</span>
            </div>
          )}
          
          {errors.submit && (
            <div style={styles.errorContainer}>
              <div style={styles.errorMessage}>
                <AlertIcon />
                <span>{errors.submit}</span>
              </div>
            </div>
          )}
        </div>
        
        <button
          style={buttonStyle}
          onClick={handleSubmit}
          disabled={loading}
        >
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

// Admin Dashboard Component
const AdminDashboard = ({ onBack }) => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState(null);

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (phone, reg) => {
    setSendingTo(phone);
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          phone,
          message: `Hi there! Your vehicle ${reg} might be blocking someone in. Could you please check and move it if needed? Thanks so much! - MoveMate`
        })
      });
      alert('Notification sent successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to send notification. Please try again.');
    } finally {
      setSendingTo(null);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <BackButton onClick={onBack} text="Back to Home" />
      </div>
      <div style={styles.adminContainer}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h1 style={styles.heading}>Registered Vehicles</h1>
          <button 
            onClick={fetchRegistrations}
            style={{ ...styles.buttonPrimary, width: 'auto', padding: '12px 16px', fontSize: '14px' }}
          >
            Refresh
          </button>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={styles.loadingSpinner}></div>
          </div>
        ) : registrations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>No vehicles registered yet</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Vehicle Reg</th>
                <th style={styles.tableHeader}>Phone</th>
                <th style={styles.tableHeader}>Registered Time</th>
                <th style={styles.tableHeader}>Action</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => (
                <tr key={reg.id}>
                  <td style={styles.tableCell}>{reg.reg}</td>
                  <td style={styles.tableCell}>{reg.phone}</td>
                  <td style={styles.tableCell}>
                    {new Date(reg.created_at).toLocaleString()}
                  </td>
                  <td style={styles.tableCell}>
                    <button
                      style={styles.notifyButton}
                      onClick={() => sendNotification(reg.phone, reg.reg)}
                      disabled={sendingTo === reg.phone}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#0056CC'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#007AFF'}
                    >
                      {sendingTo === reg.phone ? 'Sending...' : 'Notify'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Success Screen Component
const SuccessScreen = ({ onFinish, title, message }) => (
  <div style={styles.container}>
    <div style={styles.contentWrapper}>
      <div style={styles.successContainer}>
        <div style={styles.successIconContainer}>
          <CheckIcon style={{ width: '40px', height: '40px', color: '#34C759' }} />
        </div>
        <h1 style={styles.heading}>{title}</h1>
        <p style={styles.subheading}>{message}</p>
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
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Add CSS animation for spinner
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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