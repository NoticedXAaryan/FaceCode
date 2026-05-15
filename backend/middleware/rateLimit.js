const rateLimit = require('express-rate-limit');

const scanRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many scan requests, please slow down.' }
});

module.exports = { scanRateLimit };
