const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, resetDatabase, loginAs, closeDatabase } = require('./helpers');

describe('Dashboard', () => {
  let token;

  before(async () => {
    await resetDatabase();
    token = await loginAs('viewer');
  });
  after(closeDatabase);

  it('returns the aggregated KPIs from the seed data', async () => {
    const res = await api().get('/api/dashboard/stats').set('Authorization', `Bearer ${token}`);
    const stats = res.body.data;

    assert.equal(res.status, 200);
    // Sum of every seeded order except the Cancelled one (ORD-1004, 249.00)
    assert.equal(stats.totalRevenue, 1510.13);
    assert.equal(stats.pendingOrders, 2);
    assert.equal(stats.lowStockCount, 4);
    assert.equal(stats.totalOrders, 8);
    assert.deepEqual(stats.ordersByStatus, { Pending: 2, Shipped: 2, Delivered: 3, Cancelled: 1 });
    assert.equal(stats.lowStockProducts[0].stock, 0);
    assert.equal(stats.recentOrders.length, 5);
    assert.equal(stats.recentOrders[0].order_number, 'ORD-1008');
  });
});
