const { pool } = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const {
  LIMITS,
  isNonEmptyString,
  isNonNegativeInt,
  isValidPrice,
  parseId,
  toLikePattern,
} = require('../utils/validators');

const PRODUCT_COLUMNS =
  'id, sku, name, category, description, price, stock, created_at, updated_at';

// Whitelist used for ORDER BY to avoid SQL injection through query params.
const SORTABLE_FIELDS = Object.freeze({
  name: 'name',
  price: 'price',
  stock: 'stock',
  category: 'category',
  createdAt: 'created_at',
});

async function findProductById(id) {
  const [rows] = await pool.query(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ?`, [id]);
  return rows[0] || null;
}

/**
 * Validates the product payload.
 * @param {object} body
 * @param {{ partial: boolean }} options  partial=true for PATCH (only validates provided fields)
 */
function validateProductPayload(body = {}, { partial }) {
  const errors = {};
  const data = {};

  const check = (field, isValid, message, transform = (v) => v) => {
    if (body[field] === undefined) {
      if (!partial) errors[field] = `${field} is required`;
      return;
    }
    if (!isValid(body[field])) {
      errors[field] = message;
      return;
    }
    data[field] = transform(body[field]);
  };

  check(
    'sku',
    (v) => isNonEmptyString(v, LIMITS.SKU),
    `sku must be a non-empty string of up to ${LIMITS.SKU} characters`,
    (v) => v.trim().toUpperCase(),
  );
  check(
    'name',
    (v) => isNonEmptyString(v, LIMITS.PRODUCT_NAME),
    `name must be a non-empty string of up to ${LIMITS.PRODUCT_NAME} characters`,
    (v) => v.trim(),
  );
  check(
    'price',
    isValidPrice,
    `price must be a number between 0 and ${LIMITS.MAX_PRICE}`,
    (v) => Math.round(v * 100) / 100,
  );
  check(
    'stock',
    (v) => isNonNegativeInt(v, LIMITS.MAX_STOCK),
    `stock must be an integer between 0 and ${LIMITS.MAX_STOCK}`,
  );

  // Optional fields
  if (body.category !== undefined) {
    if (!isNonEmptyString(body.category, LIMITS.CATEGORY)) {
      errors.category = `category must be a non-empty string of up to ${LIMITS.CATEGORY} characters`;
    } else {
      data.category = body.category.trim();
    }
  }
  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      errors.description = 'description must be a string or null';
    } else if (body.description && body.description.trim().length > LIMITS.DESCRIPTION) {
      errors.description = `description cannot be longer than ${LIMITS.DESCRIPTION} characters`;
    } else {
      data.description = body.description ? body.description.trim() : null;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw AppError.badRequest('Validation failed', errors);
  }
  return data;
}

/**
 * GET /api/products
 * Query: search, category, lowStock=true, sortBy, order=asc|desc
 */
async function listProducts(req, res) {
  const { search, category, lowStock, sortBy = 'name', order = 'asc' } = req.query;

  const where = [];
  const params = [];

  if (isNonEmptyString(search)) {
    where.push('(name LIKE ? OR sku LIKE ? OR category LIKE ?)');
    const term = toLikePattern(search);
    params.push(term, term, term);
  }
  if (isNonEmptyString(category)) {
    where.push('category = ?');
    params.push(category.trim());
  }
  if (lowStock === 'true') {
    where.push('stock < ?');
    params.push(env.lowStockThreshold);
  }

  const sortColumn = SORTABLE_FIELDS[sortBy] || 'name';
  const sortDirection = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT ${PRODUCT_COLUMNS} FROM products ${whereSql} ORDER BY ${sortColumn} ${sortDirection}, id ASC`,
    params,
  );

  res.json({
    success: true,
    data: rows,
    meta: { count: rows.length, lowStockThreshold: env.lowStockThreshold },
  });
}

/**
 * GET /api/products/:id
 */
async function getProduct(req, res) {
  const id = parseId(req.params.id);
  if (!id) throw AppError.badRequest('Invalid product id');

  const product = await findProductById(id);
  if (!product) throw AppError.notFound('Product not found');

  res.json({ success: true, data: product });
}

/**
 * SKU is the only unique column in products, so a duplicate key error here
 * always means the SKU is taken. The field detail lets the UI show it inline.
 */
async function withSkuCheck(query) {
  try {
    return await query();
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw AppError.conflict('A product with this SKU already exists', {
        sku: 'This SKU is already used by another product',
      });
    }
    throw error;
  }
}

/**
 * POST /api/products   (admin)
 * Body: { sku, name, price, stock, category?, description? }
 */
async function createProduct(req, res) {
  const data = validateProductPayload(req.body, { partial: false });

  const [result] = await withSkuCheck(() =>
    pool.query(
      `INSERT INTO products (sku, name, category, description, price, stock)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.sku,
        data.name,
        data.category || 'General',
        data.description ?? null,
        data.price,
        data.stock,
      ],
    ),
  );

  const product = await findProductById(result.insertId);
  res.status(201).json({ success: true, data: product });
}

/**
 * PUT/PATCH /api/products/:id   (admin)
 * Body: any subset of { sku, name, price, stock, category, description }
 */
async function updateProduct(req, res) {
  const id = parseId(req.params.id);
  if (!id) throw AppError.badRequest('Invalid product id');

  const data = validateProductPayload(req.body, { partial: true });
  const fields = Object.keys(data);
  if (fields.length === 0) {
    throw AppError.badRequest('No valid fields provided to update');
  }

  // Field names come from the validated whitelist above, never from raw input.
  const setSql = fields.map((field) => `${field} = ?`).join(', ');
  const values = fields.map((field) => data[field]);

  const [result] = await withSkuCheck(() =>
    pool.query(`UPDATE products SET ${setSql} WHERE id = ?`, [...values, id]),
  );
  if (result.affectedRows === 0) throw AppError.notFound('Product not found');

  const product = await findProductById(id);
  res.json({ success: true, data: product });
}

/**
 * DELETE /api/products/:id   (admin)
 * Order history is preserved: order_items keeps a name/price snapshot
 * and product_id is set to NULL by the FK rule.
 */
async function deleteProduct(req, res) {
  const id = parseId(req.params.id);
  if (!id) throw AppError.badRequest('Invalid product id');

  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw AppError.notFound('Product not found');

  res.json({ success: true, data: { id } });
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
