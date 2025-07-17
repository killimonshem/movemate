// pages/api/vehicle-enquiry.js
export default async function handler(req, res) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
  
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const { registrationNumber } = req.body;
      
      if (!registrationNumber) {
        return res.status(400).json({ error: 'Registration number is required' });
      }
  
      console.log('Making DVLA API request for:', registrationNumber);
      
      const response = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.DVLA_API_KEY,
          'User-Agent': 'movemate-app'
        },
        body: JSON.stringify({ registrationNumber }),
      });
      
      const data = await response.json();
      
      console.log('DVLA API response status:', response.status);
      
      return res.status(response.status).json(data);
    } catch (error) {
      console.error('DVLA API Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }