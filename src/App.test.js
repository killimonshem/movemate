import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('MoveMate App flows', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    window.sessionStorage.clear();
  });

  test('renders home screen with driver, blocked driver, and admin entry points', () => {
    render(<App />);
    expect(screen.getByText('MoveMate')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register My Vehicle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I've Been Blocked In/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Admin/i })).toBeInTheDocument();
  });

  test('recovers from venue fetch failure and debounces DVLA vehicle lookup cleanly', async () => {
    jest.useFakeTimers();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    let venueAttempt = 0;
    const lookupCalls = [];

    global.fetch = jest.fn(async (url, options = {}) => {
      if (url.includes('/functions/v1/fetch-venues')) {
        venueAttempt += 1;
        if (venueAttempt === 1) {
          return { ok: false, status: 500, json: async () => ({ error: 'DB down' }) };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: [{ id: 42, name: 'Main Hall' }] }),
        };
      }

      if (url === '/api/vehicle-enquiry') {
        const body = JSON.parse(options.body);
        lookupCalls.push(body.registrationNumber);
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              colour: 'RED',
              engineCapacity: 1598,
              make: 'VOLKSWAGEN',
              model: 'GOLF',
            }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Register My Vehicle/i }));
    fireEvent.click(screen.getByRole('button', { name: /Let’s do this!/i }));

    expect(await screen.findByText(/Unable to load venues\. Please retry\./i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(await screen.findByRole('option', { name: 'Main Hall' })).toBeInTheDocument();

    const regInput = screen.getByLabelText(/What's your vehicle registration\?/i);

    // Fewer than 4 alphanumeric chars should never trigger a lookup
    fireEvent.change(regInput, { target: { value: 'XY1' } });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(lookupCalls).toHaveLength(0);

    // Rapid typing should debounce into a single API call with normalized reg
    fireEvent.change(regInput, { target: { value: 'XY19' } });
    fireEvent.change(regInput, { target: { value: 'XY19 A' } });
    fireEvent.change(regInput, { target: { value: 'xy19 abc' } });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(lookupCalls).toEqual(['XY19ABC']);
    expect(await screen.findByText('RED 1.6L VOLKSWAGEN GOLF')).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  test('validates form, displays numeric venue name on confirmation, prevents double submit, and handles 409 conflict', async () => {
    let registerResolver;
    let registerCalls = 0;

    global.fetch = jest.fn((url) => {
      if (url.includes('/functions/v1/fetch-venues')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: [{ id: 0, name: 'Zero Index Lot' }, { id: 7, name: 'North Yard' }] }),
        });
      }

      if (url.includes('/functions/v1/register-vehicle')) {
        registerCalls += 1;
        if (registerCalls === 1) {
          return new Promise((resolve) => {
            registerResolver = resolve;
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ success: true, smsSent: false }),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({}),
      });
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Register My Vehicle/i }));
    fireEvent.click(screen.getByRole('button', { name: /Let’s do this!/i }));

    await screen.findByRole('option', { name: 'North Yard' });

    fireEvent.change(screen.getByLabelText(/What's your vehicle registration\?/i), {
      target: { value: 'ab12 cde' },
    });
    fireEvent.change(screen.getByLabelText(/Your mobile number/i), {
      target: { value: '07123456789' },
    });
    fireEvent.change(screen.getByLabelText(/Select your venue/i), {
      target: { value: '7' },
    });

    // Click label text to verify htmlFor binding toggles consent checkbox
    const consentCheckbox = screen.getByLabelText(/Yes, use my details/i);
    expect(consentCheckbox).not.toBeChecked();
    fireEvent.click(screen.getByText(/Yes, use my details/i));
    expect(consentCheckbox).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /Register my vehicle/i }));

    expect(await screen.findByText('Are your details correct?')).toBeInTheDocument();
    expect(screen.getByText('AB12CDE')).toBeInTheDocument();
    expect(screen.getByText('+44 7123 456789')).toBeInTheDocument();
    expect(screen.getByText('North Yard')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Yes, they're correct/i });
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    expect(registerCalls).toBe(1);
    expect(confirmBtn).toBeDisabled();

    // First attempt returns 409 duplicate registration
    await act(async () => {
      registerResolver({
        ok: false,
        status: 409,
        text: async () => JSON.stringify({ error: 'Already registered' }),
      });
    });

    expect(await screen.findByText('This vehicle is already registered today.')).toBeInTheDocument();

    // Re-submit succeeds with smsSent: false confirmation copy
    fireEvent.click(screen.getByRole('button', { name: /Register my vehicle/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Yes, they're correct/i }));

    expect(await screen.findByText('You’re all set!')).toBeInTheDocument();
    expect(
      screen.getByText(/Your vehicle is now registered\. If someone needs to leave/i)
    ).toBeInTheDocument();
  });

  test('blocked driver workflow displays 404 errors cleanly and completes on success', async () => {
    let callCount = 0;

    global.fetch = jest.fn(async (url) => {
      if (url.includes('/functions/v1/send-notification')) {
        callCount += 1;
        if (callCount === 1) {
          return {
            ok: false,
            status: 404,
            text: async () =>
              JSON.stringify({ error: 'No active registration was found for that vehicle today.' }),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ success: true }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I've Been Blocked In/i }));
    fireEvent.click(screen.getByRole('button', { name: /Get me out!/i }));

    const regInput = screen.getByLabelText(
      /What is the registration of the car that is blocking you\?/i
    );
    fireEvent.change(regInput, { target: { value: 'AB12CDE' } });
    fireEvent.click(screen.getByRole('button', { name: /Send notification/i }));

    expect(
      await screen.findByText('No active registration was found for that vehicle today.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Send notification/i }));
    expect(await screen.findByText('Help is on the way!')).toBeInTheDocument();
  });

  test('persists admin token in sessionStorage and handles 401 session expiry', async () => {
    const receivedAdminTokens = [];

    global.fetch = jest.fn(async (url, options = {}) => {
      if (url.includes('/functions/v1/admin-auth')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              success: true,
              admin: { id: 1, username: 'admin' },
              token: 'signed.token.value',
              expiresAt: Date.now() + 60_000,
            }),
        };
      }
      if (url.includes('/functions/v1/fetch-venues')) {
        return { ok: true, status: 200, json: async () => ({ data: [] }) };
      }
      if (url.includes('/functions/v1/fetch-registrations')) {
        receivedAdminTokens.push(options.headers['x-admin-token']);
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: 'Expired' }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Admin/i }));

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Log in/i }));

    expect(await screen.findByText('Session expired. Please log in again.')).toBeInTheDocument();
    expect(receivedAdminTokens).toEqual(['signed.token.value']);
    await waitFor(() => {
      expect(window.sessionStorage.getItem('movemate_admin_session')).toBeNull();
    });
  });
});
