const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Verifies the Bearer token and attaches the decoded user to req.user.
 * Expected header: Authorization: Bearer <token>
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
    req.user = {
      id: Number(payload.sub),
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token';
    return next(AppError.unauthorized(message));
  }
}

module.exports = { authenticate };
