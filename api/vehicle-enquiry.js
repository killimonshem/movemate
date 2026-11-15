const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = body.trim() ? JSON.parse(body) : {};
      } catch (_parseErr) {
        return res.status(400).json({ message: 'Invalid JSON request body' });
      }
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ message: 'Request body must be a JSON object' });
    }

    const rawRegistration = body.registrationNumber;
    const registrationNumber =
      typeof rawRegistration === 'string'
        ? rawRegistration.trim().replace(/\s+/g, '').toUpperCase()
        : '';

    if (!registrationNumber) {
      return res.status(400).json({ message: 'Registration number is required' });
    }

    if (!/^[A-Z0-9]{1,8}$/.test(registrationNumber)) {
      return res.status(400).json({ message: 'Invalid registration number format' });
    }

    if (!process.env.DVLA_API_KEY) {
      console.error('DVLA_API_KEY environment variable is not configured');
      return res.status(500).json({ error: 'DVLA service is not configured' });
    }

    const response = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.DVLA_API_KEY,
        'User-Agent': 'node-fetch'
      },
      body: JSON.stringify({ registrationNumber }),
    });

    const rawText = await response.text();
    let data = null;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch (_jsonErr) {
        if (response.ok) {
          return res.status(502).json({ error: 'Invalid response from DVLA service' });
        }
        return res.status(response.status).json({ message: rawText });
      }
    } else {
      data = response.ok ? {} : { message: 'Empty response from DVLA service' };
    }

    // Return the same status and data from DVLA
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Failed to contact DVLA service' });
  }
};