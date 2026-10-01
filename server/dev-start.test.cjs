'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loopbackConfig } = require('../scripts/start-react.cjs');

test('CRA loopback config supplies the missing proxy hostname and retains firewall checks', () => {
  const createConfig = require('react-scripts/config/webpackDevServer.config');
  const proxy = [{ context: '/api', target: 'http://127.0.0.1:3001' }];
  const localConfig = loopbackConfig(createConfig)(proxy, undefined);
  assert.deepEqual(localConfig.allowedHosts, ['localhost', '127.0.0.1']);
  assert.equal(localConfig.host, '127.0.0.1');
  assert.equal(localConfig.proxy, proxy);
  assert.equal(typeof localConfig.onBeforeSetupMiddleware, 'function');
  assert.equal(typeof localConfig.onAfterSetupMiddleware, 'function');
});

test('the wrapper cannot inherit disabled firewall checks or an external bind address', () => {
  const unrestricted = () => ({ allowedHosts: 'all', host: '0.0.0.0', compress: true });
  const config = loopbackConfig(unrestricted)(undefined, 'some-network-host');
  assert.deepEqual(config.allowedHosts, ['localhost', '127.0.0.1']);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.compress, true);
});
