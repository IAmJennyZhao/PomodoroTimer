'use strict';

// Exercise the production service with fictional data in a separate profile.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const readline = require('node:readline');
const { startServer } = require('../server/index.cjs');

const SCENARIOS = ['fresh', 'journal', 'overtime', 'countup', 'alarm'];
let game;
function loadGame() {
  if (game) return game;
  const filename = path.resolve(__dirname, '../src/game.js');
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = module.paths;
  compiled._compile(require('@babel/core').transformFileSync(filename, {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code, filename);
  game = compiled.exports;
  return game;
}

function scenarioState(scenario, now = Date.now()) {
  if (!SCENARIOS.includes(scenario)) throw new Error(`Choose a scenario: ${SCENARIOS.join(', ')}.`);
  const { createInitialState, gameReducer } = loadGame();
  let state = createInitialState(now);
  state.scratchpad = 'Fictional review note: read a chapter, then take a tea break.';
  if (scenario === 'journal') {
    state.history = Array.from({ length: 8 }, (_, i) => ({
      id: `qa:history:${i}`, task: 'Fictional reading session',
      tasks: [{ id: 'qa:task', text: 'Review notes', done: true }], tags: ['Reading'],
      minutes: 25, gems: 25, completedAt: now - i * 86400000,
    }));
  }
  if (['alarm', 'overtime', 'countup'].includes(scenario)) {
    state = gameReducer(state, { type: 'SET_SETTINGS', settings: {
      focusMinutes: 1, breakMinutes: 1, workMode: scenario === 'countup' ? 'countup' : 'pomodoro',
      endBehavior: scenario === 'alarm' ? 'remind' : 'overtime',
    }, now });
    state = gameReducer(state, { type: 'SET_TASKS', tasks: [
      { id: 'qa:a', text: 'Review chapter notes', done: true },
      { id: 'qa:b', text: 'Complete practice questions', done: false },
    ], now });
    state = gameReducer(state, { type: 'SET_TAGS', tags: ['Review'], now });
    if (scenario !== 'alarm') {
      state = gameReducer(state, { type: 'START', now: now - 65000 });
      state = gameReducer(state, { type: 'TICK', now });
    }
  }
  return state;
}

async function createReleaseQa({ port = 5111, scenario = 'journal' } = {}) {
  const initial = scenarioState(scenario); // Validate before creating any profile.
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'little-room-release-qa-'));
  let app;
  let selectedPort = port;
  async function online() {
    if (app?.server.listening) return;
    app = await startServer({ port: selectedPort, dataDir });
    selectedPort = app.server.address().port;
  }
  async function offline() {
    if (!app?.server.listening) return;
    app.server.closeAllConnections();
    await new Promise(resolve => app.server.close(resolve));
  }
  async function seed(name) {
    const state = scenarioState(name);
    if (!app?.server.listening) throw new Error('Type online before seeding.');
    return app.store.write(state, (await app.store.read()).revision);
  }
  try {
    await online();
    await app.store.write(initial, (await app.store.read()).revision);
  } catch (error) {
    await offline();
    throw error;
  }
  return { dataDir, get port() { return selectedPort; }, online, offline, seed };
}

async function main() {
  const scenario = process.argv[2] || 'journal';
  const qa = await createReleaseQa({ scenario });
  console.log(`Review room: http://127.0.0.1:${qa.port}/ (${scenario}, fictional data)`);
  console.log('Close its browser tabs before seeding another scenario.');
  console.log(`Commands: seed ${SCENARIOS.join(' | seed ')}, offline, online, quit`);
  console.log('offline/online affect only this QA service. Ctrl+C stops it.');
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  let chain = Promise.resolve();
  input.on('line', line => {
    chain = chain.then(async () => {
      const command = line.trim();
      if (command === 'quit') input.close();
      else if (command === 'offline') { await qa.offline(); console.log('QA service offline.'); }
      else if (command === 'online') { await qa.online(); console.log('QA service online.'); }
      else if (command.startsWith('seed ')) { await qa.seed(command.slice(5)); console.log('Scenario reset. Reload the review tab.'); }
      else console.log('Use seed <scenario>, offline, online, or quit.');
    }).catch(error => console.error(error.message));
  });
  input.on('close', () => { chain.then(() => qa.offline()); });
  process.once('SIGINT', () => input.close());
  process.once('SIGTERM', () => input.close());
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { scenarioState, createReleaseQa };
