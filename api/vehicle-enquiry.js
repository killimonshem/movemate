// No need for node-fetch import - using built-in fetch in Node 18+

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
    const { registrationNumber } = req.body;

    if (!registrationNumber) {
      return res.status(400).json({ message: 'Registration number is required' });
    }

    console.log('Making DVLA API request for:', registrationNumber);

    // Using built-in fetch (available in Node 18+)
    const response = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.DVLA_API_KEY,
        'User-Agent': 'movemate-vercel-api'
      },
      body: JSON.stringify({ registrationNumber }),
    });

    const data = await response.json();
    
    console.log('DVLA API response status:', response.status);
    
    // Return the same status and data from DVLA
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ 
      error: 'Proxy error', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
}