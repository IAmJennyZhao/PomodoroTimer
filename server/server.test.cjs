'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { createStore, MAX_SAVE_BYTES } = require('./store.cjs');
const { createAppServer, startServer } = require('./index.cjs');

const state = gems => ({ schemaVersion: 1, gems, notes: 'A test-only task' });

async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pomodoro-server-test-'));
  t.after(async () => {
    // Only remove the exact temporary tree created by this test.
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('pomodoro-server-test-'));
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}

async function running(t, options = {}) {
  const root = await temporary(t);
  const app = await startServer({ port: 0, dataDir: path.join(root, 'saves'), ...options });
  t.after(() => new Promise(resolve => {
    app.server.close(resolve);
    app.server.closeAllConnections();
  }));
  return { ...app, root, port: app.server.address().port };
}

function request(port, { method = 'GET', route = '/api/save', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: route, method, headers }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, headers: res.headers, text, data: (() => { try { return JSON.parse(text); } catch { return null; } })() });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

const put = (port, value, revision, headers = {}) => request(port, {
  method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers }, body: { state: value, revision },
});

test('new saves live outside the repo, persist on restart, and keep a previous revision backup', async t => {
  const root = await temporary(t);
  const store = await createStore({ dataDir: path.join(root, 'saves') });
  assert.deepEqual(await store.read(), { state: null, revision: 0, recovered: false, storagePath: path.join(root, 'saves') });
  assert.deepEqual(await store.write(state(25), 0), { revision: 1 });
  assert.deepEqual(await store.write(state(50), 1), { revision: 2 });
  const reopened = await createStore({ dataDir: store.storagePath });
  assert.equal((await reopened.read()).state.gems, 50);
  const backup = JSON.parse(await fs.readFile(path.join(store.storagePath, 'state.backup.json'), 'utf8'));
  assert.equal(backup.revision, 1);
  assert.equal(backup.state.gems, 25);
  assert.deepEqual((await fs.readdir(store.storagePath)).sort(), ['state.backup.json', 'state.json']);
});

test('corrupt or missing main save recovers atomically from backup', async t => {
  const root = await temporary(t);
  const store = await createStore({ dataDir: path.join(root, 'saves') });
  await store.write(state(25), 0);
  await store.write(state(50), 1);
  const main = path.join(store.storagePath, 'state.json');
  await fs.writeFile(main, '{interrupted');
  assert.deepEqual(await store.read(), { state: state(25), revision: 1, recovered: true, storagePath: store.storagePath });
  assert.equal((await store.read()).recovered, false);
  await fs.unlink(main);
  assert.equal((await store.read()).recovered, true);
  await store.write(state(75), 1);
  assert.equal((await store.read()).state.gems, 75);
});

test('unrecoverable files are preserved and never replaced with an empty save', async t => {
  const root = await temporary(t);
  const store = await createStore({ dataDir: path.join(root, 'saves') });
  const main = path.join(store.storagePath, 'state.json');
  const backup = path.join(store.storagePath, 'state.backup.json');
  await fs.writeFile(main, 'damaged main');
  await fs.writeFile(backup, 'damaged backup');
  await assert.rejects(store.read(), /Existing files were preserved/);
  await assert.rejects(store.write(state(0), 0), /Existing files were preserved/);
  assert.equal(await fs.readFile(main, 'utf8'), 'damaged main');
  assert.equal(await fs.readFile(backup, 'utf8'), 'damaged backup');
});

test('repository folders and symlink aliases into the repo cannot hold personal saves', async t => {
  const repo = path.resolve(__dirname, '..');
  await assert.rejects(createStore({ dataDir: path.join(repo, 'saves') }), /outside the repository/);
  const root = await temporary(t);
  const link = path.join(root, 'repo-alias');
  await fs.symlink(repo, link, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(createStore({ dataDir: path.join(link, 'saves') }), /outside the repository/);
});

test('HTTP save contract and concurrent revision conflict protect against overwrites', async t => {
  const { port } = await running(t);
  assert.deepEqual((await request(port, { route: '/api/health' })).data, { ok: true });
  assert.equal((await request(port)).data.state, null);
  const results = await Promise.all([put(port, state(25), 0), put(port, state(50), 0)]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const saved = await request(port);
  assert.equal(saved.status, 200);
  assert.equal(saved.data.revision, 1);
  assert.ok([25, 50].includes(saved.data.state.gems));
  assert.match(saved.headers['cache-control'], /no-store/);
  assert.equal((await put(port, state(75), 1)).status, 200);
  assert.equal((await request(port)).data.state.gems, 75);
});

test('foreign Hosts and Origins are rejected while local development requests work', async t => {
  const { port } = await running(t, { dev: true });
  for (const host of ['evil.example', `evil.example:${port}`, `localhost.evil.example:${port}`, 'localhost:9000']) {
    assert.equal((await request(port, { headers: { Host: host } })).status, 403);
  }
  for (const origin of ['https://evil.example', 'null', 'http://localhost:9000', 'http://localhost:3000/']) {
    assert.equal((await put(port, state(25), 0, { Origin: origin })).status, 403);
  }
  assert.equal((await request(port, { headers: { Origin: 'http://localhost:3000', Host: 'localhost:3000' } })).status, 200);
  assert.equal((await put(port, state(25), 0, { Origin: 'http://127.0.0.1:3000' })).status, 200);
  assert.equal((await request(port, { method: 'OPTIONS', headers: { Origin: 'http://localhost:3000' } })).status, 204);
});

test('invalid schema, revisions, media types, malformed JSON and oversized writes are rejected', async t => {
  const { port } = await running(t);
  assert.equal((await put(port, { schemaVersion: 2 }, 0)).status, 400);
  assert.equal((await put(port, state(1), -1)).status, 400);
  assert.equal((await put(port, state(1))).status, 400);
  assert.equal((await request(port, { method: 'PUT', body: '{}' })).status, 415);
  assert.equal((await request(port, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  const body = JSON.stringify({ state: { schemaVersion: 1, notes: 'x'.repeat(MAX_SAVE_BYTES) }, revision: 0 });
  assert.equal((await request(port, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, body })).status, 413);
  assert.equal((await request(port, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })).status, 413);
  assert.equal((await request(port)).data.revision, 0);
});

test('custom frontend ports are validated and only the configured development origin is allowed', async t => {
  const { port } = await running(t, { dev: true, devPort: 3002 });
  assert.equal((await request(port, { headers: { Origin: 'http://127.0.0.1:3002', Host: 'localhost:3002' } })).status, 200);
  assert.equal((await put(port, state(25), 0, { Origin: 'http://localhost:3002' })).status, 200);
  assert.equal((await request(port, { headers: { Origin: 'http://localhost:3000' } })).status, 403);
  assert.match((await request(port, { route: '/' })).data.error, /127\.0\.0\.1:3002/);
  for (const devPort of [NaN, 0, 1023, 65536, 3002.5]) {
    await assert.rejects(createAppServer({ dev: true, devPort }), /PORT must be an integer/);
  }
});

test('production serves only build files, supports SPA routes and rejects traversal', async t => {
  const root = await temporary(t);
  const buildDir = path.join(root, 'build');
  await fs.mkdir(buildDir);
  await fs.writeFile(path.join(buildDir, 'index.html'), '<html>test app</html>');
  await fs.writeFile(path.join(buildDir, 'app.js'), 'test();');
  await fs.writeFile(path.join(root, 'private.json'), '{"private":true}');
  const { port } = await running(t, { buildDir });
  assert.equal((await request(port, { route: '/' })).text, '<html>test app</html>');
  assert.equal((await request(port, { route: '/collection' })).text, '<html>test app</html>');
  assert.equal((await request(port, { route: '/app.js' })).headers['content-type'], 'text/javascript; charset=utf-8');
  assert.equal((await request(port, { route: '/private.json' })).status, 404);
  assert.equal((await request(port, { route: '/%2e%2e%2fprivate.json' })).status, 400);
  assert.equal((await request(port, { route: '/%5c..%5cprivate.json' })).status, 400);
  assert.equal((await request(port, { route: '/app.js', method: 'HEAD' })).text, '');
  assert.equal((await request(port, { route: '/api/unknown' })).status, 404);
  assert.equal((await request(port, { headers: { Origin: 'http://localhost:3000' } })).status, 403);
});
