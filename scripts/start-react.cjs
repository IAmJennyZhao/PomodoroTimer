'use strict';

function loopbackConfig(createConfig) {
  return (proxy, allowedHost) => ({
    ...createConfig(proxy, allowedHost || '127.0.0.1'),
    host: '127.0.0.1',
    allowedHosts: ['localhost', '127.0.0.1'],
  });
}

function startReact({ choosePort, proxyTarget } = {}) {
  process.env.BABEL_ENV = 'development';
  process.env.NODE_ENV = 'development';
  process.env.HOST = '127.0.0.1';
  require('react-scripts/config/env');

  // CRA chooses the frontend port before preparing its proxy. Start the save
  // service in that step, then point the proxy at its actual bound port.
  const utils = require('react-dev-utils/WebpackDevServerUtils');
  if (choosePort) utils.choosePort = choosePort;
  if (proxyTarget) {
    const prepareProxy = utils.prepareProxy;
    utils.prepareProxy = (_configuredProxy, ...args) => prepareProxy(proxyTarget(), ...args);
  }

  // CRA 5.0.1 passes an undefined LAN hostname when HOST is loopback. With a
  // proxy enabled, that becomes the invalid allowedHosts: [undefined]. Adapt
  // this process's config export while keeping host checks enabled; no installed
  // package files are modified and the normal CRA compiler/startup is retained.
  const configPath = require.resolve('react-scripts/config/webpackDevServer.config');
  const createConfig = require(configPath);
  require.cache[configPath].exports = loopbackConfig(createConfig);
  require('react-scripts/scripts/start');
}

module.exports = { loopbackConfig, startReact };

if (require.main === module) require('./dev.cjs').main();
