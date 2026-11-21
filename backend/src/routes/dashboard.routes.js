const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middlewares/auth.middleware');
const dashboardController = require('../controllers/dashboard.controller');

const router = Router();

router.get('/stats', authenticate, asyncHandler(dashboardController.getStats));

module.exports = router;
