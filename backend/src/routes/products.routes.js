const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const productsController = require('../controllers/products.controller');

const router = Router();

// Every product route requires a valid session.
router.use(authenticate);

// Read: admin + viewer
router.get('/', asyncHandler(productsController.listProducts));
router.get('/:id', asyncHandler(productsController.getProduct));

// Write: admin only
router.post('/', authorize('admin'), asyncHandler(productsController.createProduct));
router.put('/:id', authorize('admin'), asyncHandler(productsController.updateProduct));
router.patch('/:id', authorize('admin'), asyncHandler(productsController.updateProduct));
router.delete('/:id', authorize('admin'), asyncHandler(productsController.deleteProduct));

module.exports = router;
