const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, closeDatabase } = require('./helpers');

describe('App', () => {
  after(closeDatabase);

  it('GET /api/health reports status and demo info', async () => {
    const res = await api().get('/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ok');
    assert.equal(res.body.data.database, 'up');
    assert.equal(typeof res.body.data.demo.enabled, 'boolean');
  });

  it('does not send CORS headers to unknown origins', async () => {
    const res = await api().get('/api/health').set('Origin', 'https://unknown-site.com');

    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  it('sends CORS headers to the configured frontend origin', async () => {
    const res = await api().get('/api/health').set('Origin', 'http://localhost:3000');
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:3000');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await api().get('/api/nope');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});
