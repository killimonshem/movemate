import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import './AppStyles.css';
import { AdminLogin, AdminDashboard } from './AdminDashboard';
import {
  BackButton,
  InputField,
  LockIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SearchIcon,
  RefreshIcon,
  SendIcon,
  SettingsIcon,
  CarIcon,
  PhoneIcon,
  VenueIcon,
  VanIcon,
  CheckIcon,
  AlertIcon,
  Toast,
  Modal,
} from './components/Common';
import { supabaseUrl, supabaseKey } from './config';
import {
  validateUKReg,
  validateUKMobile,
  formatPhoneNumber,
  formatPhoneDisplay,
  normalizeReg,
  formatVehicleSummary,
  lookupVehicleByReg,
} from './utils/vehicleUtils';

const ADMIN_SESSION_STORAGE_KEY = 'movemate_admin_session';

function readStoredAdminSession() {
  try {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token) return null;
    if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function useVehicleLookup() {
  const [vehicleData, setVehicleData] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState('');
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);

  const cancelPending = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelPending(), [cancelPending]);

  const triggerLookup = useCallback(
    (rawReg) => {
      cancelPending();
      const requestId = ++requestIdRef.current;
      const regClean = normalizeReg(rawReg);

      setVehicleData(null);
      setVehicleError('');
      setVehicleLoading(false);

      if (regClean.length < 4) {
        return;
      }

      debounceRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortRef.current = controller;
        setVehicleLoading(true);

        try {
          const result = await lookupVehicleByReg(regClean, { signal: controller.signal });
          if (controller.signal.aborted || requestId !== requestIdRef.current) return;

          if (result.status === 'ok') {
            setVehicleData(result.data);
            setVehicleError('');
          } else if (result.status === 'error') {
            setVehicleData(null);
            setVehicleError(result.error);
          }
        } catch (err) {
          if (err?.name === 'AbortError' || requestId !== requestIdRef.current) return;
          setVehicleData(null);
          setVehicleError('Network error or proxy not running');
        } finally {
          if (requestId === requestIdRef.current) {
            setVehicleLoading(false);
          }
        }
      }, 500);
    },
    [cancelPending]
  );

  return { vehicleData, vehicleLoading, vehicleError, triggerLookup };
}

// Home Screen Component
const HomeScreen = ({ onNavigate }) => (
  <div className="container">
    <div className="home-admin-cta">
      <button
        type="button"
        onClick={() => onNavigate('admin-entry')}
        className="home-admin-button"
        title="Admin Dashboard"
      >
        <LockIcon />
        <span>Admin</span>
      </button>
    </div>

    <div className="content-wrapper">
      <h1 className="home-title">MoveMate</h1>
      <p className="home-subtitle">
        Help us keep parking smooth for everyone - validate your spot today
      </p>

      <div>
        <button
          type="button"
          className="button-primary"
          onClick={() => onNavigate('driver-welcome')}
        >
          <span>Register My Vehicle</span>
          <ArrowRightIcon />
        </button>

        <button
          type="button"
          className="button-secondary"
          onClick={() => onNavigate('blocked-welcome')}
        >
          <span>I've Been Blocked In</span>
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  </div>
);

// Welcome Screen Component
const WelcomeScreen = ({ onStart, onBack, title, description, buttonText = 'Get Started' }) => (
  <div className="container">
    <div className="header">
      <BackButton onClick={onBack} />
    </div>
    <div className="content-wrapper">
      <h1 className="heading">{title}</h1>
      <p className="subheading">{description}</p>

      <button type="button" className="button-primary" onClick={onStart}>
        <span>{buttonText}</span>
        <ArrowRightIcon />
      </button>
    </div>
  </div>
);

// Details Confirmation Screen Component
const DetailsConfirmationScreen = ({ details, loading = false, onConfirm, onEdit, onBack }) => (
  <div className="container">
    <div className="content-wrapper">
      <div
        className="details-confirmation-card"
        tabIndex={0}
        aria-labelledby="details-confirmation-heading"
      >
        <div className="header-row">
          <button
            className="close-button"
            onClick={onBack}
            title="Close"
            aria-label="Close"
            type="button"
            disabled={loading}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <h1 className="heading" id="details-confirmation-heading" style={{ marginTop: 0 }}>
          Are your details correct?
        </h1>
        <p className="subheading">
          Please confirm your details before we register your vehicle
        </p>
        <div className="detail-row">
          <div className="detail-label">
            <VanIcon />
            <span>Registration</span>
          </div>
          <div className="detail-value">{details.reg}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">
            <PhoneIcon />
            <span>Number</span>
          </div>
          <div className="detail-value">{details.phone}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">
            <VenueIcon />
            <span>Venue</span>
          </div>
          <div className="detail-value detail-value-venue">{details.venue}</div>
        </div>
        <div className="confirmation-actions">
          <button
            className="button-secondary"
            onClick={onEdit}
            type="button"
            disabled={loading}
          >
            <ArrowLeftIcon />
            <span>No, let me edit</span>
          </button>
          <button
            className="button-primary"
            onClick={onConfirm}
            type="button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span>Registering your vehicle…</span>
                <div className="loading-spinner" />
              </>
            ) : (
              <>
                <span>Yes, they're correct</span>
                <ArrowRightIcon />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Driver Registration Component
const DriverRegistration = ({ onComplete, onBack }) => {
  const [reg, setReg] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('');
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venuesError, setVenuesError] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [validFields, setValidFields] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { vehicleData, vehicleLoading, vehicleError, triggerLookup } = useVehicleLookup();

  const fetchVenues = useCallback(async () => {
    setLoadingVenues(true);
    setVenuesError('');
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
      setVenuesError('Unable to load venues. Please retry.');
    } finally {
      setLoadingVenues(false);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const validateField = (field, value) => {
    if (field === 'reg') {
      return validateUKReg(value);
    }
    if (field === 'phone') {
      return validateUKMobile(value);
    }
    if (field === 'venue') {
      return Boolean(value && value !== '');
    }
    return false;
  };

  const handleChange = (field, value) => {
    if (field === 'reg') {
      const upper = value.toUpperCase();
      setReg(upper);
      triggerLookup(upper);
    } else if (field === 'phone') {
      setPhone(value);
    } else if (field === 'venue') {
      setSelectedVenue(value);
    }

    setErrors((prev) => ({ ...prev, [field]: '', submit: '' }));
    setValidFields((prev) => ({
      ...prev,
      [field]: Boolean(value && validateField(field, value)),
    }));
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
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

    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (loading) return;
    setLoading(true);
    setErrors({});
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/register-vehicle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reg: normalizeReg(reg),
          phone: formatPhoneNumber(phone),
          venue_id: selectedVenue,
          vehicle_data: vehicleData,
        }),
      });

      if (response.status === 409) {
        setErrors({ reg: 'This vehicle is already registered today.' });
        setShowConfirmation(false);
        return;
      }

      const rawText = await response.text();
      let payload = {};
      if (rawText) {
        try {
          payload = JSON.parse(rawText);
        } catch {
          payload = {};
        }
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Registration failed');
      }

      onComplete(Boolean(payload.smsSent));
    } catch (error) {
      console.error('Error registering vehicle:', error);
      setErrors({ submit: 'Oops! Something went wrong. Mind giving it another try?' });
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDetails = () => {
    if (loading) return;
    setShowConfirmation(false);
  };

  if (showConfirmation) {
    const selectedVenueObj = venues.find((v) => String(v.id) === String(selectedVenue));
    const details = {
      reg: normalizeReg(reg),
      phone: formatPhoneDisplay(phone),
      venue: selectedVenueObj?.name || 'Unknown',
    };

    return (
      <DetailsConfirmationScreen
        details={details}
        loading={loading}
        onConfirm={handleConfirmSubmit}
        onEdit={handleEditDetails}
        onBack={handleEditDetails}
      />
    );
  }

  const vehicleSummary = formatVehicleSummary(vehicleData);
  const regLength = normalizeReg(reg).length;

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

        <form onSubmit={handleSubmit} noValidate>
          <div className="vehicle-field-group">
            <InputField
              id="driver-reg-input"
              label="What's your vehicle registration?"
              icon={CarIcon}
              value={reg}
              onChange={(e) => handleChange('reg', e.target.value)}
              placeholder="AB12 CDE"
              error={errors.reg}
              success={validFields.reg}
              rightAdornment={
                vehicleLoading ? (
                  <span className="vehicle-lookup-spinner" aria-live="polite">
                    <span className="spinner" />
                    Looking up...
                  </span>
                ) : null
              }
            />
            {vehicleSummary && !vehicleLoading && regLength >= 4 && (
              <span className="vehicle-lookup-info">{vehicleSummary}</span>
            )}
            {vehicleError && !vehicleLoading && regLength >= 4 && (
              <span className="vehicle-lookup-error">{vehicleError}</span>
            )}
          </div>

          <InputField
            id="driver-phone-input"
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
            <label className="label" htmlFor="venue-select">
              Select your venue
            </label>
            <div className="input-wrapper">
              <VenueIcon className="input-icon" />
              <select
                id="venue-select"
                className={`input ${errors.venue ? 'input-error' : validFields.venue ? 'input-success' : ''}`}
                value={selectedVenue}
                onChange={(e) => handleChange('venue', e.target.value)}
                disabled={loadingVenues || Boolean(venuesError)}
              >
                <option value="">{loadingVenues ? 'Loading venues...' : 'Choose a venue...'}</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={String(venue.id)}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
            {venuesError && (
              <div className="error-message" role="alert" aria-live="assertive">
                <AlertIcon />
                <span>{venuesError}</span>
                <button type="button" className="inline-retry-button" onClick={fetchVenues}>
                  Retry
                </button>
              </div>
            )}
            {errors.venue && (
              <div className="error-message" role="alert" aria-live="assertive">
                <AlertIcon />
                <span>{errors.venue}</span>
              </div>
            )}
          </div>

          <div className="checkbox-container">
            <input
              id="registration-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                setErrors((prev) => ({ ...prev, consent: '' }));
              }}
              className="checkbox"
            />
            <label htmlFor="registration-consent" className="checkbox-label">
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
              <div className="error-message" role="alert" aria-live="assertive" style={{ marginTop: 0, marginBottom: 0 }}>
                <AlertIcon />
                <span>{errors.submit}</span>
              </div>
            </div>
          )}

          <button type="submit" className="button-primary">
            <span>Register my vehicle</span>
            <ArrowRightIcon />
          </button>
        </form>
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

      <button type="button" className="button-primary" onClick={onFinish}>
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

  const { vehicleData, vehicleLoading, vehicleError, triggerLookup } = useVehicleLookup();

  const handleRegChange = (value) => {
    const upper = value.toUpperCase();
    setReg(upper);
    setError('');
    triggerLookup(upper);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!validateUKReg(reg)) {
      setError('Please enter a valid UK registration number.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          blockedReg: normalizeReg(reg),
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

      if (!response.ok) {
        setError(
          payload.error ||
            'We couldn’t send the notification right now. Please try again or ask someone for assistance.'
        );
        return;
      }

      onComplete();
    } catch (err) {
      console.error('Error sending notification:', err);
      setError(
        'We couldn’t send the notification right now. Please try again or ask someone for assistance.'
      );
    } finally {
      setLoading(false);
    }
  };

  const vehicleSummary = formatVehicleSummary(vehicleData);
  const regLength = normalizeReg(reg).length;

  return (
    <div className="container">
      <div className="header">
        <BackButton onClick={onBack} disabled={loading} />
      </div>
      <div className="content-wrapper">
        <h1 className="heading">Oh no! Blocked in?</h1>
        <p className="subheading">
          Don't worry – we've got you covered! Just tell us which car is blocking you and we'll get them moving.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="vehicle-field-group">
            <InputField
              id="blocked-reg-input"
              label="What is the registration of the car that is blocking you?"
              icon={CarIcon}
              value={reg}
              onChange={(e) => handleRegChange(e.target.value)}
              placeholder="AB12 CDE"
              error={error}
              rightAdornment={
                vehicleLoading ? (
                  <span className="vehicle-lookup-spinner" aria-live="polite">
                    <span className="spinner" />
                    Looking up...
                  </span>
                ) : null
              }
            />
            {vehicleSummary && !vehicleLoading && regLength >= 4 && (
              <span className="vehicle-lookup-info">{vehicleSummary}</span>
            )}
            {vehicleError && !vehicleLoading && regLength >= 4 && (
              <span className="vehicle-lookup-error">{vehicleError}</span>
            )}
          </div>

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? (
              <>
                <span>Sending notification...</span>
                <div className="loading-spinner" />
              </>
            ) : (
              <>
                <span>Send notification</span>
                <ArrowRightIcon />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [view, setView] = useState('home');
  const [registrationSmsSent, setRegistrationSmsSent] = useState(true);
  const [adminSession, setAdminSession] = useState(() => readStoredAdminSession());
  const [adminNotice, setAdminNotice] = useState('');

  const handleNavigate = useCallback(
    (target) => {
      if (target === 'admin-entry') {
        setAdminNotice('');
        setView(adminSession?.token ? 'admin' : 'admin-login');
      } else {
        setView(target);
      }
    },
    [adminSession]
  );

  const handleAdminLogin = useCallback((session) => {
    setAdminSession(session);
    setAdminNotice('');
    try {
      window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore storage errors
    }
    setView('admin');
  }, []);

  const handleAdminLogout = useCallback(() => {
    setAdminSession(null);
    setAdminNotice('');
    try {
      window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    setView('home');
  }, []);

  const handleSessionExpired = useCallback((reason) => {
    setAdminSession(null);
    setAdminNotice(reason || 'Session expired. Please log in again.');
    try {
      window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    setView('admin-login');
  }, []);

  const renderView = () => {
    switch (view) {
      case 'home':
        return <HomeScreen onNavigate={handleNavigate} />;

      case 'driver-welcome':
        return (
          <WelcomeScreen
            title="Hello!"
            description="Thank you for joining us today! Let’s get your car registered so we can give you a polite nudge if someone needs to leave."
            onStart={() => setView('driver-register')}
            onBack={() => setView('home')}
            buttonText="Let’s do this!"
          />
        );

      case 'driver-register':
        return (
          <DriverRegistration
            onComplete={(smsSent) => {
              setRegistrationSmsSent(smsSent);
              setView('driver-confirm');
            }}
            onBack={() => setView('driver-welcome')}
          />
        );

      case 'driver-confirm':
        return (
          <SuccessScreen
            title="You’re all set!"
            message={
              registrationSmsSent
                ? 'Your vehicle is now registered and you should have received a confirmation text. If someone needs to leave, we’ll give you a polite heads up. Thank you for helping keep our parking running smoothly!'
                : 'Your vehicle is now registered. If someone needs to leave, we’ll notify you right away. Thank you for helping keep our parking running smoothly!'
            }
            onFinish={() => setView('home')}
          />
        );

      case 'blocked-welcome':
        return (
          <WelcomeScreen
            title="Stuck behind someone?"
            description="We’ve all been there! No worries – just let us know which car is blocking you and we’ll get them moving."
            onStart={() => setView('blocked-input')}
            onBack={() => setView('home')}
            buttonText="Get me out!"
          />
        );

      case 'blocked-input':
        return (
          <BlockedDriverInput
            onComplete={() => setView('blocked-confirm')}
            onBack={() => setView('blocked-welcome')}
          />
        );

      case 'blocked-confirm':
        return (
          <SuccessScreen
            title="Help is on the way!"
            message="We’ve sent a polite message to the driver. They should be moving their car shortly. Thank you for your patience!"
            onFinish={() => setView('home')}
          />
        );

      case 'admin-login':
        return (
          <AdminLogin
            onLogin={handleAdminLogin}
            onBack={() => setView('home')}
            initialError={adminNotice}
          />
        );

      case 'admin':
        return adminSession?.token ? (
          <AdminDashboard
            adminToken={adminSession.token}
            onBack={() => setView('home')}
            onLogout={handleAdminLogout}
            onSessionExpired={handleSessionExpired}
          />
        ) : (
          <AdminLogin
            onLogin={handleAdminLogin}
            onBack={() => setView('home')}
            initialError={adminNotice}
          />
        );

      default:
        return <HomeScreen onNavigate={handleNavigate} />;
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
  Modal,
};

export default App;