const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config({ path: '/Users/miyamckoy/Documents/movemate/.env' });

const app = express();
app.use(cors());
app.use(express.json());

const DVLA_API_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';
const DVLA_API_KEY = process.env.DVLA_API_KEY;

app.post('/api/vehicle-enquiry', async (req, res) => {
  try {
    const { registrationNumber } = req.body;
    const response = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.DVLA_API_KEY,
        'User-Agent': 'node-fetch'
      },
      body: JSON.stringify({ registrationNumber }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`)); 