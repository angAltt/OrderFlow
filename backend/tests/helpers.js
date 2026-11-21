// Must run before anything loads src/config/env.js
process.env.NODE_ENV = 'test';

const request = require('supertest');
const env = require('../src/config/env');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const runSqlFile = require('../src/utils/runSqlFile');

const CREDENTIALS = {
  admin: { email: 'admin@orderflow.dev', password: 'Admin123!' },
  viewer: { email: 'viewer@orderflow.dev', password: 'Viewer123!' },
};

const api = () => request(app);

/** Recreates the schema and loads the seed. Refuses to run on a non-test database. */
async function resetDatabase() {
  if (!env.db.database.endsWith('_test')) {
    throw new Error(
      `Refusing to reset "${env.db.database}". Tests need a database whose name ends with "_test".`,
    );
  }
  await runSqlFile('schema.sql');
  await runSqlFile('seed.sql');
}

async function loginAs(role) {
  const res = await api().post('/api/auth/login').send(CREDENTIALS[role]);
  if (res.status !== 200) throw new Error(`Login as ${role} failed with ${res.status}`);
  return res.body.data.token;
}

async function getStock(productId) {
  const [rows] = await pool.query('SELECT stock FROM products WHERE id = ?', [productId]);
  return rows[0].stock;
}

const closeDatabase = () => pool.end();

module.exports = { api, resetDatabase, loginAs, getStock, closeDatabase, CREDENTIALS };
