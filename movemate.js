import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// UK registration number validation
const validateUKReg = (reg) => {
  const pattern = /^[A-Z]{2}[0-9]{2}\s?[A-Z]{3}$|^[A-Z][0-9]{1,3}\s?[A-Z]{3}$|^[A-Z]{3}\s?[0-9]{1,3}[A-Z]$|^[0-9]{1,4}\s?[A-Z]{1,2}$|^[0-9]{1,3}\s?[A-Z]{1,3}$|^[A-Z]{1,2}\s?[0-9]{1,4}$|^[A-Z]{1,3}\s?[0-9]{1,3}$|^[A-Z]{1,3}\s?[0-9]{1,4}$/i;
  return pattern.test(reg.replace(/\s/g, ''));
};

// UK mobile number validation
const validateUKMobile = (phone) => {
  const pattern = /^(\+44|0)7[0-9]{9}$/;
  return pattern.test(phone.replace(/\s/g, ''));
};

// Format phone number to E.164
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+44' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+44')) {
    cleaned = '+44' + cleaned;
  }
  return cleaned;
};

// Welcome Screen Component
const WelcomeScreen = ({ onStart, title, description, buttonText = "Start" }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
      <div className="text-center">
        <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">{description}</p>
        <button
          onClick={onStart}
          className="w-full bg-indigo-600 text-white py-4 px-8 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition duration-200 transform hover:scale-105"
        >
          {buttonText}
        </button>
      </div>
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
      
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      setErrors({ submit: 'Failed to register. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Register Your Vehicle</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Registration Number
            </label>
            <input
              type="text"
              value={reg}
              onChange={(e) => {
                setReg(e.target.value.toUpperCase());
                setErrors({ ...errors, reg: '' });
              }}
              placeholder="AB12 CDE"
              className={`w-full px-4 py-3 border rounded-lg text-lg ${
                errors.reg ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
            />
            {errors.reg && (
              <p className="mt-2 text-sm text-red-600">{errors.reg}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors({ ...errors, phone: '' });
              }}
              placeholder="07123 456789"
              className={`w-full px-4 py-3 border rounded-lg text-lg ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
            />
            {errors.phone && (
              <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>
          
          <div>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  setErrors({ ...errors, consent: '' });
                }}
                className="mt-1 h-5 w-5 text-indigo-600 rounded"
              />
              <span className="ml-3 text-sm text-gray-600">
                I consent to my data being stored for up to 12 hours to manage parking. It will be deleted afterwards.
              </span>
            </label>
            {errors.consent && (
              <p className="mt-2 text-sm text-red-600">{errors.consent}</p>
            )}
          </div>
          
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {errors.submit}
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 px-8 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registering...' : 'Register Vehicle'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Confirmation Screen Component
const ConfirmationScreen = ({ onFinish, title, message }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
      <div className="text-center">
        <div className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">{message}</p>
        <button
          onClick={onFinish}
          className="w-full bg-indigo-600 text-white py-4 px-8 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition duration-200"
        >
          Finish
        </button>
      </div>
    </div>
  </div>
);

// Blocked Driver Input Component
const BlockedDriverInput = ({ onComplete }) => {
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
      // Send notification via Edge Function
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
      setError('Failed to send notification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Report Blocked Vehicle</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Blocking Vehicle Registration
            </label>
            <input
              type="text"
              value={reg}
              onChange={(e) => {
                setReg(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="AB12 CDE"
              className={`w-full px-4 py-3 border rounded-lg text-lg ${
                error ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-purple-600 text-white py-4 px-8 rounded-lg text-lg font-semibold hover:bg-purple-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Notification'}
          </button>
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

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const sendSMS = async (phone, reg) => {
    setSendingTo(phone);
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          phone,
          message: `Your vehicle ${reg} is blocking another car. Please move it as soon as possible. – MoveMate`
        })
      });
      
      if (!response.ok) throw new Error('Failed to send SMS');
      
      alert('SMS sent successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to send SMS');
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Registered Vehicles</h2>
            <div className="flex gap-3">
              <button
                onClick={fetchRegistrations}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Refresh
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Back to Home
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : registrations.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No vehicles registered</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Registration</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Phone</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => (
                    <tr key={reg.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono">{reg.reg}</td>
                      <td className="py-3 px-4">{reg.phone}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(reg.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => sendSMS(reg.phone, reg.reg)}
                          disabled={sendingTo === reg.phone}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {sendingTo === reg.phone ? 'Sending...' : 'Send SMS'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [view, setView] = useState('home');

  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">MoveMate</h1>
                <p className="text-gray-600">Smart Parking Management</p>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={() => setView('driver-welcome')}
                  className="w-full bg-indigo-600 text-white py-4 px-8 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition duration-200"
                >
                  Register My Vehicle
                </button>
                
                <button
                  onClick={() => setView('blocked-welcome')}
                  className="w-full bg-purple-600 text-white py-4 px-8 rounded-lg text-lg font-semibold hover:bg-purple-700 transition duration-200"
                >
                  I'm Blocked In
                </button>
                
                <button
                  onClick={() => setView('admin')}
                  className="w-full bg-gray-200 text-gray-700 py-4 px-8 rounded-lg text-lg font-semibold hover:bg-gray-300 transition duration-200"
                >
                  Admin Dashboard
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'driver-welcome':
        return (
          <WelcomeScreen
            title="Welcome to MoveMate"
            description="Register your car today to help us keep parking running smoothly."
            onStart={() => setView('driver-register')}
          />
        );
      
      case 'driver-register':
        return <DriverRegistration onComplete={() => setView('driver-confirm')} />;
      
      case 'driver-confirm':
        return (
          <ConfirmationScreen
            title="Thank You!"
            message="Your vehicle is now registered. If it blocks anyone, you will receive a text to move it. Your data will be deleted after 12 hours."
            onFinish={() => setView('home')}
          />
        );
      
      case 'blocked-welcome':
        return (
          <WelcomeScreen
            title="Blocked In?"
            description="Enter your reg and we'll contact the driver blocking you."
            onStart={() => setView('blocked-input')}
          />
        );
      
      case 'blocked-input':
        return <BlockedDriverInput onComplete={() => setView('blocked-confirm')} />;
      
      case 'blocked-confirm':
        return (
          <ConfirmationScreen
            title="Notification Sent"
            message="We've contacted the owner of the vehicle blocking you. Please wait while they move their car."
            onFinish={() => setView('home')}
          />
        );
      
      case 'admin':
        return <AdminDashboard onBack={() => setView('home')} />;
      
      default:
        return null;
    }
  };

  return <>{renderView()}</>;
};

export default App;