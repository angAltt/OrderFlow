const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const env = require('../config/env');

const SQL_DIR = path.resolve(__dirname, '../../database');

/**
 * Executes one of the files in /database (schema.sql, seed.sql).
 * Uses a dedicated connection with multipleStatements enabled. The shared pool
 * keeps that option off, so user input can never run stacked queries.
 * @param {'schema.sql'|'seed.sql'} fileName
 */
async function runSqlFile(fileName) {
  const sql = await fs.readFile(path.join(SQL_DIR, fileName), 'utf8');
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    multipleStatements: true,
  });
  try {
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}

module.exports = runSqlFile;
