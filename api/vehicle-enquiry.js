const fetch = require('node-fetch');

const DEFAULT_ALLOWED_ORIGINS = ['https://movemate.vercel.app', 'http://localhost:3000'];
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const effectiveAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;

const requestCounts = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = requestCounts.get(ip);

  if (!bucket || now > bucket.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_REQUESTS_PER_WINDOW;
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  const isAllowedOrigin = !origin || effectiveAllowedOrigins.includes(origin);
  if (!isAllowedOrigin) {
    return res.status(403).json({ message: 'Origin not allowed' });
  }

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const clientIp = getClientIp(req);
    if (isRateLimited(clientIp)) {
      return res.status(429).json({ message: 'Too many requests. Please retry later.' });
    }

    const { registrationNumber } = req.body;

    if (!registrationNumber) {
      return res.status(400).json({ message: 'Registration number is required' });
    }

    const normalizedReg = String(registrationNumber).replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z0-9]{2,8}$/.test(normalizedReg)) {
      return res.status(400).json({ message: 'Invalid registration format' });
    }

    const response = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.DVLA_API_KEY,
        'User-Agent': 'node-fetch'
      },
      body: JSON.stringify({ registrationNumber: normalizedReg }),
    });

    const data = await response.json();
    
    // Return the same status and data from DVLA
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Proxy error', details: err.message });
  }
};
