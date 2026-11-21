const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, resetDatabase, loginAs, closeDatabase } = require('./helpers');

describe('Products', () => {
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

  it('lists the 10 seeded products', async () => {
    const res = await asViewer(api().get('/api/products'));

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 10);
  });

  it('filters by search term and by low stock', async () => {
    const search = await asViewer(api().get('/api/products?search=keyboard'));
    const lowStock = await asViewer(api().get('/api/products?lowStock=true'));

    assert.equal(search.body.data.length, 1);
    assert.equal(search.body.data[0].sku, 'ACC-002');
    assert.equal(lowStock.body.data.length, 4);
    assert.ok(lowStock.body.data.every((p) => p.stock < 10));
  });

  it('lets an admin create, update and delete a product', async () => {
    const created = await asAdmin(api().post('/api/products')).send({
      sku: 'acc-099',
      name: 'USB Cable',
      price: 9.99,
      stock: 50,
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.sku, 'ACC-099');
    assert.equal(created.body.data.category, 'General');

    const { id } = created.body.data;
    const updated = await asAdmin(api().patch(`/api/products/${id}`)).send({ stock: 5 });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.stock, 5);
    assert.equal(updated.body.data.price, 9.99);

    const removed = await asAdmin(api().delete(`/api/products/${id}`));
    assert.equal(removed.status, 200);

    const missing = await asAdmin(api().get(`/api/products/${id}`));
    assert.equal(missing.status, 404);
  });

  it('returns 409 for a duplicate SKU', async () => {
    const res = await asAdmin(api().post('/api/products')).send({
      sku: 'ACC-001',
      name: 'Duplicate',
      price: 1,
      stock: 1,
    });
    assert.equal(res.status, 409);
    assert.ok(res.body.details.sku);
  });

  it('returns 400 with field details for invalid data', async () => {
    const res = await asAdmin(api().post('/api/products')).send({
      name: '',
      price: -5,
      stock: 1.5,
    });

    assert.equal(res.status, 400);
    assert.ok(res.body.details.sku);
    assert.ok(res.body.details.price);
    assert.ok(res.body.details.stock);
  });

  it('returns 400 instead of a database error for values over the column limits', async () => {
    const longName = await asAdmin(api().post('/api/products')).send({
      sku: 'LONG-1',
      name: 'x'.repeat(151),
      price: 10,
      stock: 1,
    });
    const hugeStock = await asAdmin(api().patch('/api/products/1')).send({ stock: 5000000000 });

    assert.equal(longName.status, 400);
    assert.ok(longName.body.details.name);
    assert.equal(hugeStock.status, 400);
    assert.ok(hugeStock.body.details.stock);
  });

  it('treats % and _ in the search term as plain text', async () => {
    const percent = await asViewer(api().get('/api/products?search=%25'));
    const underscore = await asViewer(api().get('/api/products?search=_'));

    assert.equal(percent.body.data.length, 0);
    assert.equal(underscore.body.data.length, 0);
  });

  it('forbids write operations for viewers', async () => {
    const create = await asViewer(api().post('/api/products')).send({
      sku: 'X-1',
      name: 'X',
      price: 1,
      stock: 1,
    });
    const update = await asViewer(api().patch('/api/products/1')).send({ stock: 0 });
    const remove = await asViewer(api().delete('/api/products/1'));

    assert.equal(create.status, 403);
    assert.equal(update.status, 403);
    assert.equal(remove.status, 403);
  });
});
