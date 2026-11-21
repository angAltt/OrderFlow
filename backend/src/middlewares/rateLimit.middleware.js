const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');

/**
 * Brute-force protection for the login endpoint.
 * Only failed attempts count, so the demo button can be used freely.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.loginRateLimit,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes' },
});

module.exports = { loginLimiter };
