const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, resetDatabase, loginAs, closeDatabase, CREDENTIALS } = require('./helpers');

describe('Auth', () => {
  before(resetDatabase);
  after(closeDatabase);

  it('returns a token and the role for valid credentials', async () => {
    const res = await api().post('/api/auth/login').send(CREDENTIALS.admin);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.role, 'admin');
    assert.equal(res.body.data.user.password_hash, undefined);
  });

  it('accepts an email with extra spaces or uppercase letters', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: '  Admin@OrderFlow.dev ', password: CREDENTIALS.admin.password });

    assert.equal(res.status, 200);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: CREDENTIALS.admin.email, password: 'wrong-password' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('rejects an invalid body with 400', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'not-an-email' });
    assert.equal(res.status, 400);
  });

  it('GET /me restores the session from the token', async () => {
    const token = await loginAs('viewer');
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, CREDENTIALS.viewer.email);
    assert.equal(res.body.data.role, 'viewer');
  });

  it('blocks protected routes without a valid token', async () => {
    const missing = await api().get('/api/products');
    const invalid = await api().get('/api/products').set('Authorization', 'Bearer abc.def.ghi');

    assert.equal(missing.status, 401);
    assert.equal(invalid.status, 401);
  });
});
