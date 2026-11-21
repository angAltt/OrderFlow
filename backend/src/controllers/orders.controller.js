const { pool, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const {
  ORDER_STATUSES,
  STATUS_TRANSITIONS,
  LIMITS,
  isNonEmptyString,
  isPositiveInt,
  isValidEmail,
  parseId,
  toLikePattern,
} = require('../utils/validators');

const MAX_ITEMS_PER_ORDER = 50;
const MAX_LIST_LIMIT = 200;

/**
 * Loads one order with its items. Accepts an optional connection
 * so it can be used inside a transaction.
 */
async function findOrderById(id, conn = pool) {
  const [orders] = await conn.query(
    `SELECT o.id, o.order_number, o.customer_name, o.customer_email, o.status,
            o.total_amount, o.created_by, u.name AS created_by_name,
            o.created_at, o.updated_at
     FROM orders o
     LEFT JOIN users u ON u.id = o.created_by
     WHERE o.id = ?`,
    [id],
  );
  if (!orders[0]) return null;

  const [items] = await conn.query(
    `SELECT id, product_id, product_name, unit_price, quantity, subtotal
     FROM order_items
     WHERE order_id = ?
     ORDER BY id ASC`,
    [id],
  );

  return { ...orders[0], items };
}

/**
 * Returns stock to products for every item of an order.
 * Items whose product was deleted (product_id NULL) are skipped.
 */
async function restockOrderItems(conn, orderId) {
  await conn.query(
    `UPDATE products p
     JOIN order_items oi ON oi.product_id = p.id
     SET p.stock = p.stock + oi.quantity
     WHERE oi.order_id = ?`,
    [orderId],
  );
}

/**
 * Validates and normalizes the order payload.
 * Duplicate product lines are merged so stock is checked once per product.
 */
function validateCreatePayload(body = {}) {
  const errors = {};
  const { customerName, customerEmail, items } = body;

  if (!isNonEmptyString(customerName, LIMITS.CUSTOMER_NAME)) {
    errors.customerName = `customerName is required (up to ${LIMITS.CUSTOMER_NAME} characters)`;
  }
  const hasEmail = customerEmail !== undefined && customerEmail !== null && customerEmail !== '';
  if (hasEmail && !isValidEmail(typeof customerEmail === 'string' ? customerEmail.trim() : null)) {
    errors.customerEmail = 'customerEmail must be a valid email';
  }

  const merged = new Map();
  if (!Array.isArray(items) || items.length === 0) {
    errors.items = 'items must be a non-empty array';
  } else if (items.length > MAX_ITEMS_PER_ORDER) {
    errors.items = `An order cannot contain more than ${MAX_ITEMS_PER_ORDER} lines`;
  } else {
    items.forEach((item, index) => {
      const productId = Number(item?.productId);
      const quantity = Number(item?.quantity);
      if (!isPositiveInt(productId) || !isPositiveInt(quantity, LIMITS.MAX_QUANTITY)) {
        errors[`items[${index}]`] =
          `productId must be a positive integer and quantity between 1 and ${LIMITS.MAX_QUANTITY}`;
        return;
      }
      merged.set(productId, (merged.get(productId) || 0) + quantity);
    });
    // Lines for the same product are merged, so the limit is checked again on the total.
    merged.forEach((quantity, productId) => {
      if (quantity > LIMITS.MAX_QUANTITY) {
        errors.items = `Total quantity for product ${productId} cannot exceed ${LIMITS.MAX_QUANTITY}`;
      }
    });
  }

  if (Object.keys(errors).length > 0) {
    throw AppError.badRequest('Validation failed', errors);
  }

  return {
    customerName: customerName.trim(),
    customerEmail: customerEmail ? customerEmail.trim().toLowerCase() : null,
    items: [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity })),
  };
}

/**
 * GET /api/orders
 * Query: status (Pending|Shipped|Delivered|Cancelled), search, limit
 * Returns orders with an item count. Use GET /api/orders/:id for full detail.
 */
async function listOrders(req, res) {
  const { status, search, limit } = req.query;

  const where = [];
  const params = [];

  if (status !== undefined && status !== '' && status !== 'All') {
    if (!ORDER_STATUSES.includes(status)) {
      throw AppError.badRequest(`status must be one of: ${ORDER_STATUSES.join(', ')}`);
    }
    where.push('o.status = ?');
    params.push(status);
  }
  if (isNonEmptyString(search)) {
    where.push('(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ?)');
    const term = toLikePattern(search);
    params.push(term, term, term);
  }

  let limitSql = '';
  if (limit !== undefined) {
    const parsed = parseId(limit);
    if (!parsed) throw AppError.badRequest('limit must be a positive integer');
    limitSql = 'LIMIT ?';
    params.push(Math.min(parsed, MAX_LIST_LIMIT));
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Item totals are aggregated in a derived table, so the outer query needs no GROUP BY
  // and works the same under ONLY_FULL_GROUP_BY on MySQL and MariaDB.
  const [rows] = await pool.query(
    `SELECT o.id, o.order_number, o.customer_name, o.customer_email, o.status,
            o.total_amount, o.created_at, o.updated_at,
            COALESCE(t.total_units, 0) AS total_units,
            COALESCE(t.item_count, 0) AS item_count
     FROM orders o
     LEFT JOIN (
       SELECT order_id, SUM(quantity) AS total_units, COUNT(*) AS item_count
       FROM order_items
       GROUP BY order_id
     ) t ON t.order_id = o.id
     ${whereSql}
     ORDER BY o.created_at DESC, o.id DESC
     ${limitSql}`,
    params,
  );

  const data = rows.map((row) => ({
    ...row,
    total_units: Number(row.total_units),
    item_count: Number(row.item_count),
  }));

  res.json({ success: true, data, meta: { count: data.length } });
}

/**
 * GET /api/orders/:id
 */
async function getOrder(req, res) {
  const id = parseId(req.params.id);
  if (!id) throw AppError.badRequest('Invalid order id');

  const order = await findOrderById(id);
  if (!order) throw AppError.notFound('Order not found');

  res.json({ success: true, data: order });
}

/**
 * POST /api/orders   (admin)
 * Body: { customerName, customerEmail?, items: [{ productId, quantity }] }
 *
 * Runs in a single transaction:
 *   1. Locks the involved product rows (SELECT ... FOR UPDATE) to prevent overselling
 *      when two orders are placed at the same time.
 *   2. Validates that every product exists and has enough stock.
 *   3. Inserts the order and its items with a price snapshot.
 *   4. Deducts stock.
 * Any error triggers a ROLLBACK, so stock and orders stay consistent.
 */
async function createOrder(req, res) {
  const payload = validateCreatePayload(req.body);
  const productIds = payload.items.map((item) => item.productId);

  const orderId = await withTransaction(async (conn) => {
    // Lock rows in a stable order (by id) to reduce deadlock risk.
    const [products] = await conn.query(
      `SELECT id, name, price, stock
       FROM products
       WHERE id IN (?)
       ORDER BY id
       FOR UPDATE`,
      [productIds],
    );
    const productMap = new Map(products.map((p) => [p.id, p]));

    const missing = productIds.filter((id) => !productMap.has(id));
    if (missing.length > 0) {
      throw AppError.badRequest('Some products do not exist', { missingProductIds: missing });
    }

    const insufficient = payload.items
      .filter(({ productId, quantity }) => productMap.get(productId).stock < quantity)
      .map(({ productId, quantity }) => {
        const p = productMap.get(productId);
        return { productId, name: p.name, requested: quantity, available: p.stock };
      });
    if (insufficient.length > 0) {
      throw AppError.conflict('Insufficient stock for one or more products', { insufficient });
    }

    const totalAmount =
      payload.items.reduce((acc, { productId, quantity }) => {
        return acc + Math.round(productMap.get(productId).price * 100) * quantity;
      }, 0) / 100;

    const [orderResult] = await conn.query(
      `INSERT INTO orders (customer_name, customer_email, status, total_amount, created_by)
       VALUES (?, ?, 'Pending', ?, ?)`,
      [payload.customerName, payload.customerEmail, totalAmount, req.user.id],
    );
    const newOrderId = orderResult.insertId;

    await conn.query("UPDATE orders SET order_number = CONCAT('ORD-', 1000 + id) WHERE id = ?", [
      newOrderId,
    ]);

    const itemRows = payload.items.map(({ productId, quantity }) => {
      const p = productMap.get(productId);
      return [newOrderId, p.id, p.name, p.price, quantity];
    });
    await conn.query(
      'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES ?',
      [itemRows],
    );

    for (const { productId, quantity } of payload.items) {
      // The stock >= ? guard is a second safety net on top of the row lock.
      const [updateResult] = await conn.query(
        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [quantity, productId, quantity],
      );
      if (updateResult.affectedRows !== 1) {
        throw AppError.conflict(`Stock changed while processing product ${productId}`);
      }
    }

    return newOrderId;
  });

  const order = await findOrderById(orderId);
  res.status(201).json({ success: true, data: order });
}

/**
 * PATCH /api/orders/:id/status   (admin)
 * Body: { status }
 * Enforces STATUS_TRANSITIONS. Cancelling an order returns its items to stock.
 */
async function updateOrderStatus(req, res) {
  const id = parseId(req.params.id);
  if (!id) throw AppError.badRequest('Invalid order id');

  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) {
    throw AppError.badRequest(`status must be one of: ${ORDER_STATUSES.join(', ')}`);
  }

  const order = await withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [id]);
    const current = rows[0];
    if (!current) throw AppError.notFound('Order not found');

    if (current.status === status) {
      return findOrderById(id, conn);
    }

    const allowed = STATUS_TRANSITIONS[current.status];
    if (!allowed.includes(status)) {
      throw AppError.conflict(`Cannot change status from ${current.status} to ${status}`, {
        allowedTransitions: allowed,
      });
    }

    if (status === 'Cancelled') {
      await restockOrderItems(conn, id);
    }

    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    return findOrderById(id, conn);
  });

  res.json({ success: true, data: order });
}

/**
 * DELETE /api/orders/:id   (admin)
 * Only Pending or Cancelled orders can be deleted, to protect fulfillment history.
 * Deleting a Pending order returns its items to stock.
 */
async function deleteOrder(req, res) {
  const id = parseId(req.params.id);
  if (!id) throw AppError.badRequest('Invalid order id');

  await withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [id]);
    const current = rows[0];
    if (!current) throw AppError.notFound('Order not found');

    if (!['Pending', 'Cancelled'].includes(current.status)) {
      throw AppError.conflict(`Orders with status ${current.status} cannot be deleted`);
    }

    if (current.status === 'Pending') {
      await restockOrderItems(conn, id);
    }

    await conn.query('DELETE FROM orders WHERE id = ?', [id]);
  });

  res.json({ success: true, data: { id } });
}

module.exports = {
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
};
