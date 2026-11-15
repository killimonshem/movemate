import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AdminDashboard, AdminLogin } from './AdminDashboard';
import { Toast } from './components/Common';

const SAMPLE_VENUES = [
  { id: 0, name: 'Annex Lot' },
  { id: 1, name: 'Main Car Park' },
];

const SAMPLE_REGISTRATIONS = [
  {
    id: 101,
    reg: 'AB12CDE',
    phone: '+447111111111',
    venue_id: 1,
    created_at: '2026-11-15T10:30:00.000Z',
    vehicle_data: { colour: 'BLUE', engineCapacity: 1995, make: 'BMW', model: '320d' },
  },
  {
    id: 102,
    reg: 'CD34EFG',
    phone: '+447111111111', // intentionally shares phone with 101 to verify ID-keyed tracking and SMS deduplication
    venue_id: 0,
    created_at: null,
    vehicle_data: null,
  },
  {
    id: 103,
    reg: 'EF56HIJ',
    phone: '+447222222222',
    venue_id: 1,
    created_at: '2026-11-15T11:00:00.000Z',
    vehicle_data: { colour: 'WHITE', make: 'FORD', model: 'Fiesta' },
  },
];

describe('AdminLogin & AdminDashboard', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('AdminLogin prevents duplicate submits while in flight and handles errors cleanly', async () => {
    let resolveAuth;
    let authCalls = 0;

    global.fetch = jest.fn(() => {
      authCalls += 1;
      return new Promise((resolve) => {
        resolveAuth = resolve;
      });
    });

    const onLogin = jest.fn();
    render(<AdminLogin onLogin={onLogin} onBack={jest.fn()} />);

    // Empty validation
    fireEvent.click(screen.getByRole('button', { name: /Log in/i }));
    expect(screen.getByText('Please enter your username.')).toBeInTheDocument();
    expect(screen.getByText('Please enter your password.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'superadmin' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pass123' } });

    const submitBtn = screen.getByRole('button', { name: /Log in/i });
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(authCalls).toBe(1);
    expect(screen.getByRole('button', { name: /Logging in\.\.\./i })).toBeDisabled();

    await act(async () => {
      resolveAuth({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            admin: { id: 1, username: 'superadmin' },
            token: 'tok.123',
            expiresAt: 9999999999999,
          }),
      });
    });

    expect(onLogin).toHaveBeenCalledWith({
      admin: { id: 1, username: 'superadmin' },
      token: 'tok.123',
      expiresAt: 9999999999999,
    });
  });

  test('masks phone numbers by default, supports spaced plate & 07 phone search, preserves search on refresh, and sends x-admin-token', async () => {
    const regFetchUrls = [];
    const regTokens = [];

    global.fetch = jest.fn(async (url, options = {}) => {
      if (url.includes('/functions/v1/fetch-venues')) {
        return { ok: true, status: 200, json: async () => ({ data: SAMPLE_VENUES }) };
      }
      if (url.includes('/functions/v1/fetch-registrations')) {
        regTokens.push(options.headers['x-admin-token']);
        regFetchUrls.push(url);
        return { ok: true, status: 200, json: async () => ({ data: SAMPLE_REGISTRATIONS }) };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    render(<AdminDashboard adminToken="admin-jwt" onBack={jest.fn()} onLogout={jest.fn()} />);

    expect(await screen.findByText('AB12CDE')).toBeInTheDocument();
    expect(regTokens.length).toBeGreaterThan(0);
    expect(regTokens.every((t) => t === 'admin-jwt')).toBe(true);
    expect(screen.getByText('BLUE 2.0L BMW 320d')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Annex Lot')).toBeInTheDocument(); // venue_id === 0 preserved
    expect(screen.getByText('No vehicle data')).toBeInTheDocument();

    // Phone numbers masked by default
    expect(screen.getAllByText('***111')).toHaveLength(2);
    expect(screen.queryByText('+447111111111')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show Numbers' }));
    expect(screen.getAllByText('+447111111111')).toHaveLength(2);

    // Search with spaced plate query
    const searchInput = screen.getByLabelText('Search registrations');
    fireEvent.change(searchInput, { target: { value: 'ab12 cde' } });
    expect(screen.getByText('AB12CDE')).toBeInTheDocument();
    expect(screen.queryByText('EF56HIJ')).not.toBeInTheDocument();

    // Search with local 07 mobile prefix against +44 stored number
    fireEvent.change(searchInput, { target: { value: '07222 222' } });
    expect(screen.getByText('EF56HIJ')).toBeInTheDocument();
    expect(screen.queryByText('AB12CDE')).not.toBeInTheDocument();

    // Changing venue filter triggers one single fetch for venue_id=1 and preserves searchTerm
    const callCountBeforeVenueChange = regFetchUrls.length;
    fireEvent.change(screen.getByLabelText('Filter by venue'), { target: { value: '1' } });

    await waitFor(() => {
      expect(regFetchUrls.length).toBe(callCountBeforeVenueChange + 1);
    });
    expect(regFetchUrls[regFetchUrls.length - 1]).toContain('venue_id=1');
    expect(searchInput.value).toBe('07222 222');
  });

  test('checks response.ok before marking single SMS sent and tracks sent status per row ID even with shared phones', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let smsCall = 0;
    const smsTokens = [];

    global.fetch = jest.fn(async (url, options = {}) => {
      if (url.includes('/functions/v1/fetch-venues')) {
        return { ok: true, status: 200, json: async () => ({ data: SAMPLE_VENUES }) };
      }
      if (url.includes('/functions/v1/fetch-registrations')) {
        return { ok: true, status: 200, json: async () => ({ data: SAMPLE_REGISTRATIONS.slice(0, 2) }) };
      }
      if (url.includes('/functions/v1/send-sms')) {
        smsTokens.push(options.headers['x-admin-token']);
        smsCall += 1;
        if (smsCall === 1) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'SMS gateway down' }),
          };
        }
        return { ok: true, status: 200, json: async () => ({ success: true }) };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    render(<AdminDashboard adminToken="admin-jwt" onBack={jest.fn()} />);
    await screen.findByText('AB12CDE');

    // First attempt returns HTTP 500 -> should show error toast and stay 'Ready'
    const sendButtons = screen.getAllByRole('button', { name: /Send SMS/i });
    fireEvent.click(sendButtons[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Send Notification' }));

    expect(await screen.findByText('SMS gateway down')).toBeInTheDocument();
    expect(screen.queryByText('Sent')).not.toBeInTheDocument();

    // Second attempt succeeds -> ONLY row 101 becomes 'Sent'; row 102 stays 'Ready' despite same phone
    fireEvent.click(screen.getAllByRole('button', { name: /Send SMS/i })[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Send Notification' }));

    expect(await screen.findByText('Notification sent to AB12CDE')).toBeInTheDocument();
    expect(smsTokens).toEqual(['admin-jwt', 'admin-jwt']);
    expect(screen.getAllByText('Sent')).toHaveLength(1);
    expect(screen.getAllByText('Ready')).toHaveLength(1);
    consoleErrorSpy.mockRestore();
  });

  test('Bulk SMS Select All works with shared phones, deduplicates SMS sends, and locks backdrop while sending', async () => {
    const sentPhones = [];
    let resolveSecondSms;

    global.fetch = jest.fn(async (url, options = {}) => {
      if (url.includes('/functions/v1/fetch-venues')) {
        return { ok: true, status: 200, json: async () => ({ data: SAMPLE_VENUES }) };
      }
      if (url.includes('/functions/v1/fetch-registrations')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              ...SAMPLE_REGISTRATIONS.slice(0, 2),
              {
                id: 104,
                reg: 'XY99ZZZ',
                phone: '07111111111', // local format equivalent to +447111111111
                venue_id: 1,
                created_at: '2026-11-15T11:30:00.000Z',
                vehicle_data: null,
              },
              SAMPLE_REGISTRATIONS[2],
            ],
          }),
        };
      }
      if (url.includes('/functions/v1/send-sms')) {
        const body = JSON.parse(options.body);
        sentPhones.push(body.phone);
        if (sentPhones.length === 1) {
          return { ok: true, status: 200, json: async () => ({ success: true }) };
        }
        return new Promise((resolve) => {
          resolveSecondSms = resolve;
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    render(<AdminDashboard adminToken="admin-jwt" onBack={jest.fn()} />);
    await screen.findByText('AB12CDE');

    fireEvent.click(screen.getByRole('button', { name: /Bulk SMS/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Select All' }));

    expect(screen.getByText('4 recipients selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deselect All' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Bulk SMS message'), {
      target: { value: 'Car park closes at 10pm' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send to 4 recipients/i }));

    // While in flight: Escape and close button should not dismiss modal
    await waitFor(() => {
      expect(sentPhones).toHaveLength(2);
    });
    expect(sentPhones).toEqual(['+447111111111', '+447222222222']);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Close Bulk SMS modal')).toBeDisabled();

    await act(async () => {
      resolveSecondSms({ ok: true, status: 200, json: async () => ({ success: true }) });
    });

    expect(await screen.findByText('Successfully sent 2 SMS messages')).toBeInTheDocument();
    expect(screen.getAllByText('Sent')).toHaveLength(4);
  });

  test('Toast auto-dismiss timer does not reset when parent re-renders with new inline callbacks', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();

    const { rerender } = render(<Toast message="Saved!" type="success" onClose={onClose} />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    // Simulate parent re-render passing a brand-new callback closure reference
    rerender(<Toast message="Saved!" type="success" onClose={() => onClose()} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
