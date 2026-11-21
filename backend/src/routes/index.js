const { Router } = require('express');
const authRoutes = require('./auth.routes');
const dashboardRoutes = require('./dashboard.routes');
const productsRoutes = require('./products.routes');
const ordersRoutes = require('./orders.routes');
const { getDemoStatus } = require('../jobs/demoReset.job');
const { testConnection } = require('../config/db');

const router = Router();

// Used by the hosting platform health check and by the frontend demo banner.
// Returns 503 when MySQL is unreachable, so the platform can restart or alert.
router.get('/health', async (req, res) => {
  let database = 'up';
  try {
    await testConnection();
  } catch {
    database = 'down';
  }

  const healthy = database === 'up';
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? 'ok' : 'degraded',
      database,
      timestamp: new Date().toISOString(),
      demo: getDemoStatus(),
    },
  });
});

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);

module.exports = router;
