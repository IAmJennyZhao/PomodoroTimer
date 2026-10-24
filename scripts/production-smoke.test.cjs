'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const root = path.resolve(__dirname, '..');

async function temporary(t) {
  const temporaryRoot = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(temporaryRoot, 'little-room-smoke-'));
  t.after(async () => {
    assert.equal(path.dirname(directory), temporaryRoot);
    assert.ok(path.basename(directory).startsWith('little-room-smoke-'));
    await fs.rm(directory, { recursive: true, force: true });
  });
  return directory;
}

async function launch(t, dataDir, developmentPort) {
  const development = developmentPort !== undefined;
  const child = spawn(process.execPath, [development ? 'scripts/dev.cjs' : 'server/index.cjs'], {
    cwd: root, env: { ...process.env, CI: 'true', BROWSER: 'none',
      PORT: String(developmentPort || 3000), POMODORO_API_PORT: String(developmentPort || 0), POMODORO_DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stopped = once(child, 'exit');
  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await stopped;
  };
  t.after(stop);
  let output = '';
  const url = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Production startup timed out.')), 15_000);
    const finish = callback => value => { clearTimeout(timeout); callback(value); };
    child.once('error', finish(reject));
    child.once('exit', finish(() => reject(new Error(`Production server exited before readiness: ${output}`))));
    child.stderr.on('data', data => { output += data; });
    child.stdout.on('data', data => {
      output += data;
      const match = output.match(/Little Room (?:is ready at|app:) (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) finish(resolve)(match[1]);
    });
  });
  return { url, stop, get output() { return output; }, get exited() { return child.exitCode !== null || child.signalCode !== null; } };
}

test('the development entry point compiles and proxies saves on its selected frontend port', { timeout: 180_000 }, async t => {
  const directory = await temporary(t);
  const reservation = net.createServer();
  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolve);
  });
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  // The launcher can choose subsequent ports if another process claims this
  // preferred port. Requests always use the actual URL it reports.
  const app = await launch(t, path.join(directory, 'development'), port);
  let html;
  const deadline = Date.now() + 150_000;
  // The launcher prints its selected address before CRA binds the frontend.
  // Poll that exact owned service rather than sleeping for compiler speed.
  while (!html) {
    if (app.exited) throw new Error(`Development process exited before readiness: ${app.output}`);
    try { html = await fetch(app.url, { signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) }); }
    catch (error) {
      if (error.cause?.code !== 'ECONNREFUSED' || Date.now() >= deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  assert.equal(html.status, 200);
  assert.match(await html.text(), /<title>Little Room[^<]*<\/title>/);
  const bundle = await fetch(`${app.url}/static/js/bundle.js`, { signal: AbortSignal.timeout(15_000) });
  assert.equal(bundle.status, 200);
  assert.match(bundle.headers.get('content-type'), /javascript/);
  assert.doesNotMatch(app.output, /Failed to compile/);
  const state = { schemaVersion: 1, scratchpad: 'Fictional development startup note' };
  const write = await fetch(`${app.url}/api/save`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, revision: 0 }), signal: AbortSignal.timeout(15_000) });
  assert.equal(write.status, 200);
  const saved = await fetch(`${app.url}/api/save`, { signal: AbortSignal.timeout(15_000) }).then(response => response.json());
  assert.deepEqual(saved.state, state);
  assert.equal(saved.storagePath, path.join(directory, 'development'));
});

test('platform defaults resolve under an isolated OS profile and honor the data-directory override', async t => {
  const directory = await temporary(t);
  const env = { ...process.env, USERPROFILE: directory, HOME: directory,
    LOCALAPPDATA: path.join(directory, 'local-app-data'), XDG_DATA_HOME: path.join(directory, 'xdg') };
  delete env.POMODORO_DATA_DIR;
  const result = spawnSync(process.execPath, ['-e', "process.stdout.write(require('./server/store.cjs').defaultDataDir())"], {
    cwd: root, env, encoding: 'utf8', timeout: 15_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  const base = process.platform === 'win32' ? env.LOCALAPPDATA
    : process.platform === 'darwin' ? path.join(directory, 'Library', 'Application Support') : env.XDG_DATA_HOME;
  assert.equal(result.stdout, path.join(base, 'PomodoroTimer', 'saves'));
  const dataDir = path.join(directory, 'custom');
  const app = await launch(t, dataDir);
  const saved = await fetch(`${app.url}/api/save`).then(r => r.json());
  assert.equal(saved.storagePath, dataDir);
  assert.equal(saved.state, null);
});

test('the production entry point serves the real build and keeps saves through process restart', async t => {
  const directory = await temporary(t);
  const dataDir = path.join(directory, 'saves');
  const app = await launch(t, dataDir);
  const health = await fetch(`${app.url}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  const html = await fetch(app.url);
  assert.match(html.headers.get('content-type'), /text\/html/);
  assert.equal(await html.text(), await fs.readFile(path.join(root, 'build/index.html'), 'utf8'));
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'build/asset-manifest.json'), 'utf8'));
  const inventory = JSON.parse(await fs.readFile(path.join(root, 'docs/ASSET_INVENTORY.json'), 'utf8'));
  const assets = [...manifest.entrypoints.map(file => `/${file}`),
    ...inventory.assets.filter(asset => asset.path.startsWith('public/')).map(asset => `/${asset.path.slice(7)}`)];
  assert.ok(manifest.entrypoints.some(file => file.endsWith('.js')));
  assert.ok(manifest.entrypoints.some(file => file.endsWith('.css')));
  for (const asset of assets) {
    const response = await fetch(`${app.url}${asset}`);
    assert.equal(response.status, 200, asset);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await fs.readFile(path.join(root, 'build', asset.slice(1))), asset);
  }
  const state = { schemaVersion: 1, scratchpad: 'Fictional clean-install smoke note', gems: 25 };
  const write = await fetch(`${app.url}/api/save`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, revision: 0 }) });
  assert.equal(write.status, 200);
  assert.deepEqual(await write.json(), { revision: 1 });
  await app.stop();
  const restarted = await launch(t, dataDir);
  const restored = await fetch(`${restarted.url}/api/save`).then(r => r.json());
  assert.deepEqual(restored.state, state);
  assert.equal(restored.revision, 1);
  assert.deepEqual((await fetch(`${restarted.url}/api/save`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, revision: 0 }) }).then(r => r.json())).code, 'SAVE_CONFLICT');
});
