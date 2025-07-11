import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

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
    justifyContent: 'center',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  contentWrapper: {
    maxWidth: '400px',
    margin: '0 auto',
    width: '100%'
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
    transition: 'all 0.2s ease'
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
    transition: 'all 0.2s ease'
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
  successIcon: {
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
      <p style={styles.homeSubtitle}>Smart parking management for your community</p>
      
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
          <span>I'm Blocked In</span>
          <ArrowRightIcon />
        </button>
        
        <button
          style={styles.buttonTertiary}
          onClick={() => onNavigate('admin')}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#F5F5F5'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
        >
          Admin Dashboard
        </button>
      </div>
    </div>
  </div>
);

// Welcome Screen Component
const WelcomeScreen = ({ onStart, title, description, buttonText = "Get Started" }) => (
  <div style={styles.container}>
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
const DriverRegistration = ({ onComplete }) => {
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
            message: `✅ Registration confirmed! Your vehicle ${reg.toUpperCase().replace(/\s/g, '')} is now registered with MoveMate. You'll receive a text if you need to move it. Data will be deleted after 12 hours.`
          })
        });
      } catch (smsError) {
        console.error('Failed to send confirmation SMS:', smsError);
      }
      
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      setErrors({ submit: 'Failed to register. Please try again.' });
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
      <div style={styles.contentWrapper}>
        <h1 style={styles.heading}>Register Your Vehicle</h1>
        <p style={styles.subheading}>We'll notify you if you need to move your car</p>
        
        <div>
          <InputField
            label="Vehicle Registration"
            icon={CarIcon}
            value={reg}
            onChange={(e) => handleChange('reg', e.target.value)}
            placeholder="AB12 CDE"
            error={errors.reg}
            success={validFields.reg}
          />
          
          <InputField
            label="Mobile Number"
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
              I consent to my data being stored for up to 12 hours to manage parking. 
              It will be automatically deleted afterwards.
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
              <span>Registering...</span>
              <div style={styles.loadingSpinner}></div>
            </>
          ) : (
            <>
              <span>Register Vehicle</span>
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
  <div style={styles.container}>
    <div style={styles.contentWrapper}>
      <div style={styles.successContainer}>
        <div style={styles.successIcon}>
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
        <span>Done</span>
        <CheckIcon />
      </button>
    </div>
  </div>
);

// Main App Component
const App = () => {
  const [view, setView] = useState('home');

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
            title="Welcome to MoveMate"
            description="Register your vehicle to help keep parking smooth for everyone."
            onStart={() => setView('driver-register')}
            buttonText="Register Vehicle"
          />
        );
      
      case 'driver-register':
        return <DriverRegistration onComplete={() => setView('driver-confirm')} />;
      
      case 'driver-confirm':
        return (
          <SuccessScreen
            title="All Set!"
            message="Your vehicle is now registered. You'll receive a text if you need to move it. Your data will be automatically deleted after 12 hours."
            onFinish={() => setView('home')}
          />
        );
      
      case 'blocked-welcome':
        return (
          <WelcomeScreen
            title="Blocked In?"
            description="Let us contact the driver who's blocking you."
            onStart={() => setView('blocked-input')}
            buttonText="Report Vehicle"
          />
        );
      
      default:
        return <HomeScreen onNavigate={setView} />;
    }
  };

  return <>{renderView()}</>;
};

export default App;