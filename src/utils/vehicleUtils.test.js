import {
  MOCK_REGISTRATIONS,
  normalizeReg,
  validateUKReg,
  validateUKMobile,
  formatPhoneNumber,
  formatPhoneDisplay,
  maskPhoneNumber,
  formatVehicleSummary,
  matchesSearchTerm,
  lookupVehicleByReg,
} from './vehicleUtils';

describe('vehicleUtils', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('normalizeReg', () => {
    test('strips whitespace, uppercases, and handles non-strings', () => {
      expect(normalizeReg('  ab12 cde ')).toBe('AB12CDE');
      expect(normalizeReg('xy99\tabc')).toBe('XY99ABC');
      expect(normalizeReg(null)).toBe('');
      expect(normalizeReg(undefined)).toBe('');
      expect(normalizeReg(123)).toBe('');
    });
  });

  describe('validateUKReg', () => {
    test('accepts standard current, prefix, suffix, and dateless UK formats', () => {
      expect(validateUKReg('AB12 CDE')).toBe(true);
      expect(validateUKReg('ab12cde')).toBe(true);
      expect(validateUKReg('A123 BCD')).toBe(true);
      expect(validateUKReg('ABC 123D')).toBe(true);
      expect(validateUKReg('12 AB')).toBe(true);
      expect(validateUKReg('AB 12')).toBe(true);
    });

    test('rejects empty or invalid registration plates', () => {
      expect(validateUKReg('')).toBe(false);
      expect(validateUKReg('   ')).toBe(false);
      expect(validateUKReg('12345678')).toBe(false);
      expect(validateUKReg('AB12!CD')).toBe(false);
      expect(validateUKReg('TOOLONG123')).toBe(false);
    });
  });

  describe('validateUKMobile & phone formatting', () => {
    test('validates 07 and +447 UK mobile numbers regardless of spacing', () => {
      expect(validateUKMobile('07123 456789')).toBe(true);
      expect(validateUKMobile('+44 7123 456789')).toBe(true);
      expect(validateUKMobile('020 7946 0958')).toBe(false);
      expect(validateUKMobile('07123')).toBe(false);
      expect(validateUKMobile(null)).toBe(false);
    });

    test('formats phone numbers to +44 E.164 and readable display format', () => {
      expect(formatPhoneNumber('07123 456789')).toBe('+447123456789');
      expect(formatPhoneNumber('+447123456789')).toBe('+447123456789');
      expect(formatPhoneNumber('7123456789')).toBe('+447123456789');
      expect(formatPhoneNumber('   ')).toBe('');
      expect(formatPhoneDisplay('07123456789')).toBe('+44 7123 456789');
    });

    test('masks phone numbers leaving only the last 3 digits', () => {
      expect(maskPhoneNumber('+447123456789')).toBe('***789');
      expect(maskPhoneNumber('07123 456789')).toBe('***789');
      expect(maskPhoneNumber('12')).toBe('12');
      expect(maskPhoneNumber('')).toBe('');
    });
  });

  describe('formatVehicleSummary', () => {
    test('formats colour, engine capacity in litres, make, and model', () => {
      expect(
        formatVehicleSummary({
          colour: 'BLUE',
          engineCapacity: 1998,
          make: 'BMW',
          model: '320d',
        })
      ).toBe('BLUE 2.0L BMW 320d');

      expect(formatVehicleSummary({ colour: 'WHITE', make: 'FORD' })).toBe('WHITE FORD');
      expect(formatVehicleSummary(null)).toBe('');
      expect(formatVehicleSummary('invalid')).toBe('');
    });
  });

  describe('matchesSearchTerm', () => {
    test('matches spaced registration plates and local 07 queries against +44 numbers', () => {
      const reg = { reg: 'AB12CDE', phone: '+447123456789' };

      expect(matchesSearchTerm(reg, '')).toBe(true);
      expect(matchesSearchTerm(reg, 'ab12 cde')).toBe(true);
      expect(matchesSearchTerm(reg, '12cd')).toBe(true);
      expect(matchesSearchTerm(reg, '07123 456')).toBe(true);
      expect(matchesSearchTerm(reg, '+447123')).toBe(true);
      expect(matchesSearchTerm(reg, 'ZZ99ZZZ')).toBe(false);
    });
  });

  describe('lookupVehicleByReg', () => {
    test('skips inputs shorter than 4 alphanumeric characters', async () => {
      global.fetch = jest.fn();
      const result = await lookupVehicleByReg('AB 1');
      expect(result).toEqual({ status: 'skipped', data: null, error: '' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('returns mock data immediately without calling fetch', async () => {
      global.fetch = jest.fn();
      const result = await lookupVehicleByReg('ab12 cde');
      expect(result).toEqual({ status: 'ok', data: MOCK_REGISTRATIONS.AB12CDE, error: '' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('calls proxy and returns parsed vehicle payload on 200', async () => {
      const mockPayload = { colour: 'SILVER', make: 'AUDI', engineCapacity: 1498 };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockPayload),
      });

      const result = await lookupVehicleByReg('xy19 abc', { proxyUrl: '/api/vehicle-enquiry' });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vehicle-enquiry',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ registrationNumber: 'XY19ABC' }),
        })
      );
      expect(result).toEqual({ status: 'ok', data: mockPayload, error: '' });
    });

    test('extracts DVLA structured errors and handles non-JSON errors safely', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        text: async () => JSON.stringify({ errors: [{ detail: 'Vehicle not found' }] }),
      });

      const first = await lookupVehicleByReg('XY19ABC');
      expect(first).toEqual({ status: 'error', data: null, error: 'Vehicle not found' });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        text: async () => '<html>Bad Gateway</html>',
      });

      const second = await lookupVehicleByReg('XY19ABC');
      expect(second).toEqual({
        status: 'error',
        data: null,
        error: 'Vehicle not found or DVLA error',
      });
    });
  });
});
