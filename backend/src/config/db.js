const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  connectionLimit: env.db.connectionLimit,
  waitForConnections: true,
  queueLimit: 0,
  decimalNumbers: true, // return DECIMAL columns as JS numbers instead of strings
  timezone: 'Z',
  dateStrings: false,
});

/**
 * Runs a callback inside a single transaction.
 * Commits if the callback resolves, rolls back if it throws.
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<any>} callback
 */
async function withTransaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}

module.exports = { pool, withTransaction, testConnection };
