'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');
const { startServer } = require('../server/index.cjs');

async function main() {
  const devPort = Number(process.env.PORT || 3000);
  const { server, store } = await startServer({ port: 3001, dev: true, devPort });
  console.log(`Private saves: ${store.storagePath}`);
  const child = spawn(process.execPath, [path.join(__dirname, 'start-react.cjs')], {
    stdio: 'inherit',
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(devPort) },
    windowsHide: true,
  });
  let closing = false;
  const close = code => {
    if (closing) return;
    closing = true;
    child.kill();
    server.close(() => { process.exitCode = code; });
    server.closeAllConnections();
  };
  child.on('error', error => { console.error(error.message); close(1); });
  child.on('exit', code => close(code || 0));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => close(0));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
