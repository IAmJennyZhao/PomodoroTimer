'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { startDevelopment } = require('../scripts/dev.cjs');
const { listenOnAvailablePort, validatePort } = require('../scripts/ports.cjs');

function close(server) {
  return new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections?.();
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server.address().port);
    });
  });
}

// Reserve a short consecutive range, avoiding assumptions about this machine's
// active development servers or ephemeral port allocation.
async function reservedRange(t, length = 4) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const servers = [net.createServer()];
    const first = await listen(servers[0], 0);
    try {
      if (first + length - 1 > 65535) throw Object.assign(new Error('Range exceeds TCP ports.'), { code: 'EADDRINUSE' });
      for (let offset = 1; offset < length; offset += 1) {
        const server = net.createServer();
        servers.push(server);
        await listen(server, first + offset);
      }
      t.after(() => Promise.all(servers.map(close)));
      return { first, servers };
    } catch (error) {
      await Promise.all(servers.map(close));
      if (!['EADDRINUSE', 'EACCES'].includes(error.code)) throw error;
    }
  }
  throw new Error('Could not reserve consecutive ports for this test.');
}

async function temporaryData(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pomodoro-ports-test-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('pomodoro-ports-test-'));
    await fs.rm(root, { recursive: true, force: true });
  });
  return path.join(root, 'saves');
}

function request(port, { route = '/api/health', method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: route, method, headers }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        data: JSON.parse(Buffer.concat(chunks).toString('utf8')),
      }));
    });
    req.on('error', reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

test('port selection skips consecutive occupied ports and keeps the selected port bound', async t => {
  const { first, servers } = await reservedRange(t, 3);
  await close(servers[2]);
  const server = net.createServer();
  t.after(() => close(server));

  assert.equal(await listenOnAvailablePort(server, first), first + 2);
  assert.equal(server.address().address, '127.0.0.1');
  assert.equal(server.address().port, first + 2);
  const competing = net.createServer();
  t.after(() => close(competing));
  await assert.rejects(listen(competing, first + 2), { code: 'EADDRINUSE' });
});

test('development startup selects distinct available frontend and save ports and accepts only their origins', async t => {
  const dataDir = await temporaryData(t);
  const { first, servers } = await reservedRange(t);
  await close(servers[2]);
  await close(servers[3]);
  const app = await startDevelopment({ devPort: first, apiPort: first, dataDir });
  t.after(() => close(app.server));

  assert.equal(app.devPort, first + 2);
  assert.equal(app.apiPort, first + 3);
  assert.equal(app.server.address().port, app.apiPort);
  assert.equal(app.store.storagePath, dataDir);

  const origin = `http://127.0.0.1:${app.devPort}`;
  const headers = { Origin: origin, Host: `localhost:${app.devPort}` };
  const health = await request(app.apiPort, { headers });
  assert.equal(health.status, 200);
  assert.deepEqual(health.data, { ok: true });
  assert.equal(health.headers['access-control-allow-origin'], origin);

  const state = { schemaVersion: 1, gems: 25, notes: 'Temporary port regression test' };
  const saved = await request(app.apiPort, {
    route: '/api/save', method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: { state, revision: 0 },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.revision, 1);
  assert.deepEqual((await request(app.apiPort, { route: '/api/save', headers })).data.state, state);
  assert.equal((await request(app.apiPort, { headers: { Origin: `http://127.0.0.1:${first}` } })).status, 403);
  assert.equal((await request(app.apiPort, { headers: { Origin: 'https://foreign.example' } })).status, 403);
  assert.equal((await request(app.apiPort, { headers: { Host: `localhost:${first}` } })).status, 403);

  // The frontend reservation must be released for CRA to bind the chosen port.
  const frontend = net.createServer();
  t.after(() => close(frontend));
  await listen(frontend, app.devPort);
});

test('requesting the same free port for frontend and API gives the API the next port', async t => {
  const dataDir = await temporaryData(t);
  const { first, servers } = await reservedRange(t, 2);
  await Promise.all(servers.map(close));
  const app = await startDevelopment({ devPort: first, apiPort: first, dataDir });
  t.after(() => close(app.server));
  assert.equal(app.devPort, first);
  assert.equal(app.apiPort, first + 1);
});

test('invalid preferred ports are rejected with the setting name', () => {
  assert.doesNotThrow(() => validatePort(1024, 'PORT'));
  assert.doesNotThrow(() => validatePort(65535, 'POMODORO_API_PORT'));
  for (const port of [NaN, 0, 1023, 65536, 3000.5, 'not-a-port']) {
    assert.throws(() => validatePort(port, 'POMODORO_API_PORT'), /POMODORO_API_PORT/);
  }
});

test('port selection propagates errors other than EADDRINUSE without retrying', async () => {
  const server = net.createServer();
  const failure = Object.assign(new Error('Denied by test.'), { code: 'EACCES' });
  let attempts = 0;
  server.listen = function () {
    attempts += 1;
    process.nextTick(() => this.emit('error', failure));
    return this;
  };
  await assert.rejects(listenOnAvailablePort(server, 3000), error => error === failure);
  assert.equal(attempts, 1);
});

test('port selection stops at 65535 instead of overflowing or wrapping', async () => {
  const server = net.createServer();
  let attempts = 0;
  server.listen = function () {
    attempts += 1;
    process.nextTick(() => this.emit('error', Object.assign(new Error('Occupied by test.'), { code: 'EADDRINUSE' })));
    return this;
  };
  await assert.rejects(listenOnAvailablePort(server, 65535), /port/i);
  assert.equal(attempts, 1);
});
