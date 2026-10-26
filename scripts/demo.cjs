'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createStore } = require('../server/store.cjs');
const { demoState } = require('./demo-data.cjs');

async function main() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'little-room-demo-'));
  const store = await createStore({ dataDir });
  await store.write(demoState(), 0);
  process.env.POMODORO_DATA_DIR = dataDir;
  process.env.REACT_APP_DEMO = 'true';
  process.env.PORT = process.env.PORT || '3002';
  process.env.POMODORO_API_PORT = process.env.POMODORO_API_PORT || '3003';
  console.log('Little Room demo: fictional progress in a separate profile.');
  require('./dev.cjs').main();
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { main };
