const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const ordersController = require('../controllers/orders.controller');

const router = Router();

router.use(authenticate);

// Read: admin + viewer
router.get('/', asyncHandler(ordersController.listOrders));
router.get('/:id', asyncHandler(ordersController.getOrder));

// Write: admin only
router.post('/', authorize('admin'), asyncHandler(ordersController.createOrder));
router.patch('/:id/status', authorize('admin'), asyncHandler(ordersController.updateOrderStatus));
router.delete('/:id', authorize('admin'), asyncHandler(ordersController.deleteOrder));

module.exports = router;
