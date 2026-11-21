const env = require('../config/env');
const runSqlFile = require('../utils/runSqlFile');

const state = {
  lastResetAt: null,
  nextResetAt: null,
};

/**
 * Restores the demo data from seed.sql every N minutes when DEMO_MODE=true.
 * Seed dates are relative to NOW(), so the dashboard always looks recent.
 * @returns {NodeJS.Timeout | null}
 */
function startDemoResetJob() {
  if (!env.demo.enabled) return null;

  const intervalMs = env.demo.resetIntervalMinutes * 60 * 1000;
  state.nextResetAt = new Date(Date.now() + intervalMs);

  const timer = setInterval(async () => {
    try {
      await runSqlFile('seed.sql');
      state.lastResetAt = new Date();
      console.log(`[demo] Data restored at ${state.lastResetAt.toISOString()}`);
    } catch (error) {
      console.error('[demo] Data reset failed:', error.message);
    } finally {
      state.nextResetAt = new Date(Date.now() + intervalMs);
    }
  }, intervalMs);

  timer.unref();
  console.log(`[demo] Demo mode on. Data resets every ${env.demo.resetIntervalMinutes} min.`);
  return timer;
}

/** Public info used by GET /api/health, so the frontend can show a demo banner. */
function getDemoStatus() {
  return {
    enabled: env.demo.enabled,
    ...(env.demo.enabled && {
      resetIntervalMinutes: env.demo.resetIntervalMinutes,
      lastResetAt: state.lastResetAt,
      nextResetAt: state.nextResetAt,
    }),
  };
}

module.exports = { startDemoResetJob, getDemoStatus };
