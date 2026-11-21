const env = require('./config/env');
const app = require('./app');
const { pool, testConnection } = require('./config/db');
const { startDemoResetJob } = require('./jobs/demoReset.job');

async function start() {
  try {
    await testConnection();
    console.log(`[db] Connected to MySQL at ${env.db.host}:${env.db.port}/${env.db.database}`);
  } catch (error) {
    console.error('[db] Unable to connect to MySQL:', error.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(
      `[server] OrderFlow API running on http://localhost:${env.port}/api (${env.nodeEnv})`,
    );
  });

  const demoTimer = startDemoResetJob();

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down gracefully...`);
    if (demoTimer) clearInterval(demoTimer);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
