const { pool } = require('../config/db');
const env = require('../config/env');

const RECENT_ORDERS_LIMIT = 5;

/**
 * GET /api/dashboard/stats
 * Everything the dashboard view needs in a single request.
 *
 * Revenue rule: sum of all orders that are NOT Cancelled
 * (Pending + Shipped + Delivered). Adjust the WHERE clause if the business
 * wants to recognize revenue only on Delivered orders.
 */
async function getStats(req, res) {
  const threshold = env.lowStockThreshold;

  const queries = [
    pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS totalRevenue
       FROM orders
       WHERE status <> 'Cancelled'`,
    ),
    pool.query(
      `SELECT status, COUNT(*) AS count
       FROM orders
       GROUP BY status`,
    ),
    pool.query(
      `SELECT id, sku, name, category, price, stock
       FROM products
       WHERE stock < ?
       ORDER BY stock ASC, name ASC`,
      [threshold],
    ),
    pool.query(
      `SELECT COUNT(*) AS totalProducts, COALESCE(SUM(stock), 0) AS totalUnits
       FROM products`,
    ),
    pool.query(
      `SELECT id, order_number, customer_name, status, total_amount, created_at
       FROM orders
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [RECENT_ORDERS_LIMIT],
    ),
  ];

  const [revenueRows, statusRows, lowStockRows, productTotals, recentOrders] = (
    await Promise.all(queries)
  ).map(([rows]) => rows);

  const ordersByStatus = { Pending: 0, Shipped: 0, Delivered: 0, Cancelled: 0 };
  statusRows.forEach(({ status, count }) => {
    ordersByStatus[status] = Number(count);
  });

  const totalOrders = Object.values(ordersByStatus).reduce((acc, n) => acc + n, 0);

  res.json({
    success: true,
    data: {
      totalRevenue: Number(revenueRows[0].totalRevenue),
      pendingOrders: ordersByStatus.Pending,
      lowStockCount: lowStockRows.length,
      lowStockThreshold: threshold,
      totalOrders,
      totalProducts: Number(productTotals[0].totalProducts),
      totalUnitsInStock: Number(productTotals[0].totalUnits),
      ordersByStatus,
      lowStockProducts: lowStockRows,
      recentOrders,
    },
  });
}

module.exports = { getStats };
