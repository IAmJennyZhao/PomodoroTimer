'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createStore, MAX_SAVE_BYTES, SaveError, inside } = require('./store.cjs');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

function localAuthority(authority, ports) {
  try {
    const url = new URL(`http://${authority}`);
    return !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      && ports.includes(Number(url.port || 80));
  } catch { return false; }
}

function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
    throw new SaveError('Send application/json.', 415);
  }
  if (Number(request.headers['content-length']) > MAX_SAVE_BYTES) throw new SaveError('Request exceeds the 1 MB limit.', 413);
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_SAVE_BYTES) throw new SaveError('Request exceeds the 1 MB limit.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new SaveError('Request contains invalid JSON.', 400); }
}

async function serveStatic(request, response, buildDir, pathname) {
  if (!['GET', 'HEAD'].includes(request.method)) return json(response, 405, { error: 'Method not allowed.' });
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return json(response, 400, { error: 'Invalid path.' }); }
  if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').includes('..')) {
    return json(response, 400, { error: 'Invalid path.' });
  }
  const root = path.resolve(buildDir);
  let target = path.resolve(root, `.${decoded}`);
  if (!inside(target, root)) return json(response, 403, { error: 'Invalid path.' });
  if (decoded.endsWith('/')) target = path.join(target, 'index.html');
  try {
    let stat;
    try { stat = await fs.stat(target); }
    catch (error) {
      if (error.code !== 'ENOENT' || path.extname(decoded)) throw error;
      target = path.join(root, 'index.html');
      stat = await fs.stat(target);
    }
    if (!stat.isFile() || !inside(await fs.realpath(target), await fs.realpath(root))) {
      return json(response, 404, { error: 'File not found.' });
    }
    const content = await fs.readFile(target);
    response.writeHead(200, {
      'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': content.length,
      'Cache-Control': path.basename(target) === 'index.html' ? 'no-cache' : 'public, max-age=3600',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    if (error.code === 'ENOENT') return json(response, 404, { error: 'File not found. Run npm run build before npm run serve.' });
    throw error;
  }
}

async function createAppServer({ dataDir, buildDir = path.resolve(__dirname, '..', 'build'), dev = false, devPort = 3000 } = {}) {
  if (dev && (!Number.isInteger(devPort) || devPort < 1024 || devPort > 65535)) {
    throw new Error('PORT must be an integer from 1024 to 65535.');
  }
  const store = await createStore({ dataDir });
  const server = http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    const port = server.address()?.port;
    const ports = dev ? [port, devPort] : [port];
    if (!localAuthority(request.headers.host, ports)) return json(response, 403, { error: 'Only local requests are allowed.' });
    const origin = request.headers.origin;
    if (origin) {
      let allowed = false;
      try {
        const parsed = new URL(origin);
        allowed = parsed.protocol === 'http:' && origin === parsed.origin && localAuthority(parsed.host, ports);
      } catch {}
      if (!allowed) return json(response, 403, { error: 'This origin is not allowed.' });
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
    }
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname.startsWith('/api/')) {
        if (request.method === 'OPTIONS') {
          response.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
          return response.end();
        }
        if (pathname === '/api/health' && request.method === 'GET') return json(response, 200, { ok: true });
        if (pathname === '/api/save') {
          if (request.method === 'GET') return json(response, 200, await store.read());
          if (request.method === 'PUT') {
            const body = await readJson(request);
            if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SaveError('Invalid save request.', 400);
            return json(response, 200, await store.write(body.state, body.revision));
          }
          return json(response, 405, { error: 'Method not allowed.' });
        }
        return json(response, 404, { error: 'Unknown API route.' });
      }
      if (dev) return json(response, 404, { error: `Open the app on http://127.0.0.1:${devPort}.` });
      return await serveStatic(request, response, buildDir, pathname);
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error('Local save service:', error.message);
      const storageFailure = ['EACCES', 'EPERM', 'ENOSPC', 'EROFS', 'EIO', 'ENOENT'].includes(error.code);
      return json(response, status, {
        error: status === 500 && !(error instanceof SaveError) ? 'The local service could not complete this request.' : error.message,
        code: error instanceof SaveError ? error.code : storageFailure ? 'SAVE_STORAGE_UNAVAILABLE' : 'SAVE_SERVICE_ERROR',
        ...(['SAVE_UNREADABLE', 'SAVE_STORAGE_UNAVAILABLE', 'SAVE_DIRECTORY_CHANGED'].includes(error.code) || storageFailure ? { storagePath: store.storagePath } : {}),
      });
    }
  });
  server.requestTimeout = 15_000;
  return { server, store };
}

async function startServer(options = {}) {
  const { port = Number(process.env.POMODORO_API_PORT || 3001) } = options;
  const app = await createAppServer(options);
  await new Promise((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(port, '127.0.0.1', resolve);
  });
  return app;
}

if (require.main === module) {
  startServer().then(({ server, store }) => {
    console.log(`Pomodoro is ready at http://127.0.0.1:${server.address().port}`);
    console.log(`Private saves: ${store.storagePath}`);
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { createAppServer, startServer };
