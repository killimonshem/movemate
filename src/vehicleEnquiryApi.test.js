jest.mock('node-fetch', () => jest.fn());

const fetch = require('node-fetch');
const handler = require('../api/vehicle-enquiry');

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
  return res;
}

describe('api/vehicle-enquiry handler', () => {
  const originalKey = process.env.DVLA_API_KEY;

  beforeEach(() => {
    fetch.mockReset();
    process.env.DVLA_API_KEY = 'test-dvla-key';
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.DVLA_API_KEY;
    } else {
      process.env.DVLA_API_KEY = originalKey;
    }
  });

  test('handles OPTIONS preflight with 200 and CORS headers', async () => {
    const res = createMockRes();
    await handler({ method: 'OPTIONS' }, res);
    expect(res.statusCode).toBe(200);
    expect(res.ended).toBe(true);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  test('rejects non-POST methods with 405', async () => {
    const res = createMockRes();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ message: 'Method not allowed' });
  });

  test('returns 400 when body is undefined or invalid JSON string', async () => {
    const resUndefined = createMockRes();
    await handler({ method: 'POST', body: undefined }, resUndefined);
    expect(resUndefined.statusCode).toBe(400);

    const resBadJson = createMockRes();
    await handler({ method: 'POST', body: '{bad json' }, resBadJson);
    expect(resBadJson.statusCode).toBe(400);
    expect(resBadJson.body).toEqual({ message: 'Invalid JSON request body' });
  });

  test('validates registrationNumber presence and alphanumeric format', async () => {
    const resMissing = createMockRes();
    await handler({ method: 'POST', body: { registrationNumber: '   ' } }, resMissing);
    expect(resMissing.statusCode).toBe(400);
    expect(resMissing.body).toEqual({ message: 'Registration number is required' });

    const resInvalid = createMockRes();
    await handler({ method: 'POST', body: { registrationNumber: 'AB12!@#' } }, resInvalid);
    expect(resInvalid.statusCode).toBe(400);
    expect(resInvalid.body).toEqual({ message: 'Invalid registration number format' });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('returns 500 without calling DVLA when DVLA_API_KEY is missing', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.DVLA_API_KEY;
    const res = createMockRes();

    await handler({ method: 'POST', body: { registrationNumber: 'XY19 ABC' } }, res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'DVLA service is not configured' });
    expect(fetch).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('parses raw JSON string body, normalizes reg, and proxies valid DVLA JSON', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ registrationNumber: 'XY19ABC', make: 'FORD' }),
    });

    const res = createMockRes();
    await handler({ method: 'POST', body: '{"registrationNumber":" xy19 abc "}' }, res);

    expect(fetch).toHaveBeenCalledWith(
      'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-api-key': 'test-dvla-key' }),
        body: JSON.stringify({ registrationNumber: 'XY19ABC' }),
      })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ registrationNumber: 'XY19ABC', make: 'FORD' });
  });

  test('handles non-JSON upstream error responses without crashing', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => '<html>Bad Gateway</html>',
    });

    const res = createMockRes();
    await handler({ method: 'POST', body: { registrationNumber: 'XY19ABC' } }, res);
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ message: '<html>Bad Gateway</html>' });
  });
});
