const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, resetDatabase, loginAs, getStock, closeDatabase } = require('./helpers');

// Seed reference: product 1 has 120 units, product 8 has 3 units.
// Order 1 is Pending (2x product 1, 1x product 2), order 3 is Delivered.

describe('Orders', () => {
  let adminToken;
  let viewerToken;

  before(async () => {
    await resetDatabase();
    adminToken = await loginAs('admin');
    viewerToken = await loginAs('viewer');
  });
  after(closeDatabase);

  const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
  const asViewer = (req) => req.set('Authorization', `Bearer ${viewerToken}`);

  describe('listing', () => {
    it('filters orders by status', async () => {
      const res = await asViewer(api().get('/api/orders?status=Delivered'));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 3);
      assert.ok(res.body.data.every((o) => o.status === 'Delivered'));
    });

    it('rejects an unknown status', async () => {
      const res = await asViewer(api().get('/api/orders?status=Lost'));
      assert.equal(res.status, 400);
    });

    it('returns full detail with items', async () => {
      const res = await asViewer(api().get('/api/orders/1'));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.order_number, 'ORD-1001');
      assert.equal(res.body.data.items.length, 2);
    });
  });

  describe('creation (transaction)', () => {
    it('creates the order, snapshots prices and deducts stock', async () => {
      const before1 = await getStock(1);
      const before8 = await getStock(8);

      const res = await asAdmin(api().post('/api/orders')).send({
        customerName: 'Grace Lee',
        customerEmail: 'GRACE@example.com',
        items: [
          { productId: 1, quantity: 2 },
          { productId: 8, quantity: 1 },
          { productId: 1, quantity: 1 }, // duplicated lines are merged
        ],
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'Pending');
      assert.equal(res.body.data.order_number, 'ORD-1009');
      assert.equal(res.body.data.customer_email, 'grace@example.com');
      assert.equal(res.body.data.items.length, 2);
      assert.equal(res.body.data.total_amount, 183.97); // 3 x 24.99 + 109.00
      assert.equal(await getStock(1), before1 - 3);
      assert.equal(await getStock(8), before8 - 1);
    });

    it('rolls back everything when one product has insufficient stock', async () => {
      const before1 = await getStock(1);
      const before8 = await getStock(8);
      const countBefore = (await asAdmin(api().get('/api/orders'))).body.data.length;

      const res = await asAdmin(api().post('/api/orders')).send({
        customerName: 'Too Many',
        items: [
          { productId: 1, quantity: 1 },
          { productId: 8, quantity: 999 },
        ],
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.details.insufficient[0].productId, 8);
      assert.equal(await getStock(1), before1);
      assert.equal(await getStock(8), before8);
      const countAfter = (await asAdmin(api().get('/api/orders'))).body.data.length;
      assert.equal(countAfter, countBefore);
    });

    it('does not oversell when two orders compete for the last units', async () => {
      const available = await getStock(8);
      const order = { customerName: 'Race', items: [{ productId: 8, quantity: available }] };

      const results = await Promise.all([
        asAdmin(api().post('/api/orders')).send(order),
        asAdmin(api().post('/api/orders')).send(order),
      ]);

      const statuses = results.map((r) => r.status).sort();
      assert.deepEqual(statuses, [201, 409]);
      assert.equal(await getStock(8), 0);
    });

    it('returns 400 for an unknown product', async () => {
      const res = await asAdmin(api().post('/api/orders')).send({
        customerName: 'Ghost',
        items: [{ productId: 9999, quantity: 1 }],
      });
      assert.equal(res.status, 400);
      assert.deepEqual(res.body.details.missingProductIds, [9999]);
    });

    it('forbids viewers from creating orders', async () => {
      const res = await asViewer(api().post('/api/orders')).send({
        customerName: 'Viewer',
        items: [{ productId: 1, quantity: 1 }],
      });
      assert.equal(res.status, 403);
    });
  });

  describe('status updates', () => {
    it('moves an order forward through valid transitions', async () => {
      const shipped = await asAdmin(api().patch('/api/orders/5/status')).send({
        status: 'Shipped',
      });
      const delivered = await asAdmin(api().patch('/api/orders/5/status')).send({
        status: 'Delivered',
      });

      assert.equal(shipped.status, 200);
      assert.equal(delivered.body.data.status, 'Delivered');
    });

    it('rejects an invalid transition with 409', async () => {
      const res = await asAdmin(api().patch('/api/orders/3/status')).send({ status: 'Pending' });

      assert.equal(res.status, 409);
      assert.deepEqual(res.body.details.allowedTransitions, []);
    });

    it('returns items to stock when an order is cancelled', async () => {
      const before1 = await getStock(1);
      const before2 = await getStock(2);

      const res = await asAdmin(api().patch('/api/orders/1/status')).send({ status: 'Cancelled' });

      assert.equal(res.status, 200);
      assert.equal(await getStock(1), before1 + 2);
      assert.equal(await getStock(2), before2 + 1);
    });

    it('does not allow cancelling a Shipped order', async () => {
      const res = await asAdmin(api().patch('/api/orders/7/status')).send({ status: 'Cancelled' });

      assert.equal(res.status, 409);
      assert.deepEqual(res.body.details.allowedTransitions, ['Delivered']);
    });

    it('forbids viewers from changing the status', async () => {
      const res = await asViewer(api().patch('/api/orders/7/status')).send({ status: 'Delivered' });
      assert.equal(res.status, 403);
    });
  });

  describe('validation', () => {
    it('returns 400 instead of a database error for a customer name that is too long', async () => {
      const res = await asAdmin(api().post('/api/orders')).send({
        customerName: 'x'.repeat(121),
        items: [{ productId: 1, quantity: 1 }],
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.details.customerName);
    });

    it('rejects a quantity above the limit, also when lines are merged', async () => {
      const single = await asAdmin(api().post('/api/orders')).send({
        customerName: 'Big Buyer',
        items: [{ productId: 1, quantity: 1001 }],
      });
      const merged = await asAdmin(api().post('/api/orders')).send({
        customerName: 'Big Buyer',
        items: [
          { productId: 1, quantity: 600 },
          { productId: 1, quantity: 600 },
        ],
      });

      assert.equal(single.status, 400);
      assert.equal(merged.status, 400);
    });
  });

  describe('deletion', () => {
    it('deletes a Pending order and returns its items to stock', async () => {
      const stockBefore = await getStock(1);
      const created = await asAdmin(api().post('/api/orders')).send({
        customerName: 'Temp Customer',
        items: [{ productId: 1, quantity: 3 }],
      });
      assert.equal(await getStock(1), stockBefore - 3);

      const res = await asAdmin(api().delete(`/api/orders/${created.body.data.id}`));
      const detail = await asAdmin(api().get(`/api/orders/${created.body.data.id}`));

      assert.equal(res.status, 200);
      assert.equal(detail.status, 404);
      assert.equal(await getStock(1), stockBefore);
    });

    it('refuses to delete a Delivered order', async () => {
      const res = await asAdmin(api().delete('/api/orders/3'));
      assert.equal(res.status, 409);
    });

    it('deletes a Cancelled order without changing stock', async () => {
      const stockBefore = await getStock(9);
      const res = await asAdmin(api().delete('/api/orders/4'));

      assert.equal(res.status, 200);
      assert.equal(await getStock(9), stockBefore);
    });
  });
});
