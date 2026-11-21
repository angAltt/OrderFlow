const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { isNonEmptyString, isValidEmail } = require('../utils/validators');

// Used to keep response time similar when the email does not exist (mitigates user enumeration).
const DUMMY_HASH = '$2b$10$Db.ngm/77Zn01AfRD.Eqce2Pp.6gu6PvkxBKTQ1SQzWu9HmIEu.VG';

const toPublicUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
});

const signToken = (user) =>
  jwt.sign({ name: user.name, email: user.email, role: user.role }, env.jwt.secret, {
    algorithm: 'HS256',
    subject: String(user.id),
    expiresIn: env.jwt.expiresIn,
  });

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  const { password } = req.body || {};
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  // bcrypt only uses the first 72 bytes, so longer values are rejected instead of truncated.
  if (!isValidEmail(email) || !isNonEmptyString(password) || Buffer.byteLength(password) > 72) {
    throw AppError.badRequest('A valid email and password are required');
  }

  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
    [email],
  );
  const userRow = rows[0];

  const passwordOk = await bcrypt.compare(password, userRow ? userRow.password_hash : DUMMY_HASH);
  if (!userRow || !passwordOk) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const user = toPublicUser(userRow);
  const token = signToken(user);

  res.json({
    success: true,
    data: { token, role: user.role, user, expiresIn: env.jwt.expiresIn },
  });
}

/**
 * GET /api/auth/me
 * Returns the current user from the database (useful to restore the session on page reload).
 */
async function me(req, res) {
  const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1', [
    req.user.id,
  ]);
  if (!rows[0]) {
    throw AppError.unauthorized('User no longer exists');
  }
  res.json({ success: true, data: toPublicUser(rows[0]) });
}

module.exports = { login, me };
