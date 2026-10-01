'use strict';

const { spawn } = require('node:child_process');
const { startServer } = require('../server/index.cjs');

async function main() {
  const { server, store } = await startServer({ port: 3001, dev: true });
  console.log(`Private saves: ${store.storagePath}`);
  const child = spawn(process.execPath, [require.resolve('react-scripts/scripts/start')], {
    stdio: 'inherit',
    env: { ...process.env, HOST: '127.0.0.1', PORT: '3000' },
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
