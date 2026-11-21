const path = require('node:path');

// Tests load .env.test so they never touch the development database.
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
require('dotenv').config({ path: path.resolve(__dirname, '../../', envFile), quiet: true });

const REQUIRED = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // Fail fast: the API cannot run safely without these values.
  console.error(`[config] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 4000,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD) || 10,
  loginRateLimit: Number(process.env.LOGIN_RATE_LIMIT) || 10,
  demo: {
    // When enabled, the database is restored from seed.sql on a fixed interval,
    // so visitors using the public admin account cannot leave the demo broken.
    enabled: process.env.DEMO_MODE === 'true',
    resetIntervalMinutes: Number(process.env.DEMO_RESET_INTERVAL_MINUTES) || 60,
  },
});

module.exports = env;
