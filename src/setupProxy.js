const express = require('express');
require('dotenv').config();

const vehicleEnquiryHandler = require('../api/vehicle-enquiry');
const testHandler = require('../api/test');
const simpleTestHandler = require('../api/simple-test');

/**
 * Local development middleware for Create React App (`npm start`), mounting
 * Vercel `/api/*` handlers so DVLA lookups work locally without `vercel dev`.
 */
module.exports = function setupProxy(app) {
  app.use('/api/vehicle-enquiry', express.json(), (req, res) => vehicleEnquiryHandler(req, res));
  app.use('/api/test', express.json(), (req, res) => testHandler(req, res));
  app.use('/api/simple-test', express.json(), (req, res) => simpleTestHandler(req, res));
};
