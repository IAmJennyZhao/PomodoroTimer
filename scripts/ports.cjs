'use strict';

function validatePort(port, name) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`${name} must be an integer from 1024 to 65535.`);
  }
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      server.removeListener('error', onError);
      server.removeListener('listening', onListening);
    };
    const onError = error => { cleanup(); reject(error); };
    const onListening = () => { cleanup(); resolve(); };
    server.once('error', onError);
    server.once('listening', onListening);
    try { server.listen(port, '127.0.0.1'); }
    catch (error) { onError(error); }
  });
}

async function listenOnAvailablePort(server, preferredPort) {
  validatePort(preferredPort, 'Port');
  for (let port = preferredPort; port <= 65535; port += 1) {
    try {
      await listen(server, port);
      return port;
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
    }
  }
  throw new Error(`No available port from ${preferredPort} to 65535. Choose a lower starting port.`);
}

module.exports = { listenOnAvailablePort, validatePort };
