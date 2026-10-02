'use strict';

const net = require('node:net');
const { createAppServer } = require('../server/index.cjs');
const { listenOnAvailablePort, validatePort } = require('./ports.cjs');
const { startReact } = require('./start-react.cjs');

async function startDevelopment({
  devPort = Number(process.env.PORT || 3000),
  apiPort = Number(process.env.POMODORO_API_PORT || 3001),
  dataDir,
} = {}) {
  validatePort(devPort, 'PORT');
  validatePort(apiPort, 'POMODORO_API_PORT');
  // Hold the frontend port while binding the save service so they cannot select
  // the same port. CRA takes over this port once its chooser resolves.
  const reservation = net.createServer(socket => socket.destroy());
  const selectedDevPort = await listenOnAvailablePort(reservation, devPort);
  try {
    const app = await createAppServer({ dev: true, devPort: selectedDevPort, dataDir });
    const selectedApiPort = await listenOnAvailablePort(app.server, apiPort);
    return { ...app, devPort: selectedDevPort, apiPort: selectedApiPort };
  } finally {
    await new Promise(resolve => reservation.close(resolve));
  }
}

function main() {
  let app;
  startReact({
    choosePort: async () => {
      app = await startDevelopment();
      console.log(`Pomodoro app: http://127.0.0.1:${app.devPort}`);
      console.log(`Local save service: http://127.0.0.1:${app.apiPort}`);
      console.log(`Private saves: ${app.store.storagePath}`);
      for (const signal of ['SIGINT', 'SIGTERM']) {
        process.once(signal, () => {
          app.server.close();
          app.server.closeAllConnections();
        });
      }
      return app.devPort;
    },
    proxyTarget: () => `http://127.0.0.1:${app.apiPort}`,
  });
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { main, startDevelopment };
