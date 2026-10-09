'use strict';

// The same commands run locally and on every CI platform, without shell globs
// or shell-specific environment assignment / argument forwarding.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

function run(label, args, extraEnv = {}) {
  console.log(`\n${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: root, stdio: 'inherit', timeout: 600_000,
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} failed (${result.signal || result.status}).`);
}

function files(directory, suffix) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true })
    .flatMap(entry => entry.isDirectory() ? files(`${directory}/${entry.name}`, suffix)
      : entry.name.endsWith(suffix) ? [`${directory}/${entry.name}`] : []).sort();
}

const unattended = { CI: 'true', BABEL_ENV: '', NODE_ENV: '',
  DISABLE_ESLINT_PLUGIN: 'false', ESLINT_NO_DEV_ERRORS: 'false',
  TSC_COMPILE_ON_ERROR: 'false', PUBLIC_URL: '', BUILD_PATH: 'build' };

const steps = {
  syntax() {
    for (const file of [...files('server', '.cjs'), ...files('scripts', '.cjs'),
      ...files('e2e', '.cjs'), 'playwright.config.cjs']) run(`Syntax: ${file}`, ['--check', file]);
  },
  frontend() {
    run('Frontend tests', ['node_modules/react-scripts/scripts/test.js', '--watchAll=false', '--runInBand'], unattended);
  },
  server() {
    run('Server and launcher tests', ['--test', ...files('server', '.test.cjs')]);
  },
  build() {
    run('Production build (warnings fail)', ['node_modules/react-scripts/scripts/build.js'], unattended);
  },
  smoke() {
    run('Development / production startup and persistence smoke', ['--test', 'scripts/production-smoke.test.cjs']);
  },
  browser() {
    run('Production browser regressions', ['node_modules/@playwright/test/cli.js', 'test'], { CI: 'true' });
  },
};

try {
  const major = Number(process.versions.node.split('.')[0]);
  if (![22, 24].includes(major)) throw new Error('Use Node.js 22 or 24 LTS (see .nvmrc for the baseline).');
  const selection = process.argv[2] || 'core';
  const selected = selection === 'core' ? ['syntax', 'frontend', 'server', 'build', 'smoke']
    : selection === 'all' ? ['syntax', 'frontend', 'server', 'build', 'smoke', 'browser'] : [selection];
  if (process.argv.length > 3 || selected.some(name => !steps[name])) throw new Error('Use core, all, syntax, frontend, server, build, smoke or browser.');
  console.log(`Little Room checks: Node ${process.version}, ${process.platform}/${process.arch}`);
  for (const name of selected) steps[name]();
  console.log('\nAll selected checks passed.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
