#!/usr/bin/env node
/**
 * Database CLI. Uses the same DB_* variables as the API, so it works the same
 * way locally and against a hosted MySQL instance.
 *
 *   npm run db:setup   -> schema.sql + seed.sql (drops existing tables)
 *   npm run db:seed    -> seed.sql only (restores demo data)
 */
const runSqlFile = require('../src/utils/runSqlFile');

const COMMANDS = {
  setup: ['schema.sql', 'seed.sql'],
  seed: ['seed.sql'],
};

async function main() {
  const command = process.argv[2];
  const files = COMMANDS[command];

  if (!files) {
    console.error(`Usage: node scripts/db.js <${Object.keys(COMMANDS).join('|')}>`);
    process.exit(1);
  }

  for (const file of files) {
    process.stdout.write(`[db] Running ${file}... `);
    await runSqlFile(file);
    console.log('done');
  }
}

main().catch((error) => {
  console.error(`\n[db] Failed: ${error.message}`);
  process.exit(1);
});
