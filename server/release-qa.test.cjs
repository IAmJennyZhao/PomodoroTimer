'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { scenarioState, createReleaseQa } = require('../scripts/release-qa.cjs');

test('review scenarios use fictional data and the real timer reducer', () => {
  const journal = scenarioState('journal', 1000000000);
  assert.equal(journal.history.length, 8);
  assert.equal(journal.history[0].task, 'Fictional reading session');
  const overtime = scenarioState('overtime', 1000000000);
  assert.equal(overtime.timer.status, 'running');
  assert.equal(overtime.timer.overtime, true);
  const countup = scenarioState('countup', 1000000000);
  assert.equal(countup.timer.workMode, 'countup');
  const alarm = scenarioState('alarm', 1000000000);
  assert.equal(alarm.timer.status, 'idle');
  assert.equal(alarm.settings.focusMinutes, 1);
  assert.equal(alarm.settings.endBehavior, 'remind');
  assert.throws(() => scenarioState('unknown'), /Choose a scenario/);
});

test('review service isolates its profile and retains edits through offline/online', async t => {
  const qa = await createReleaseQa({ port: 0 });
  t.after(async () => {
    await qa.offline();
    assert.equal(path.dirname(qa.dataDir), path.resolve(os.tmpdir()));
    assert.ok(path.basename(qa.dataDir).startsWith('little-room-release-qa-'));
    await fs.rm(qa.dataDir, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${qa.port}/api/save`;
  const before = await fetch(url).then(r => r.json());
  const state = { ...before.state, scratchpad: 'A fictional edited draft' };
  const saved = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, revision: before.revision }) });
  assert.equal(saved.status, 200);
  await qa.offline();
  await assert.rejects(qa.seed('fresh'), /online before seeding/);
  await qa.online();
  const restored = await fetch(url).then(r => r.json());
  assert.equal(restored.state.scratchpad, 'A fictional edited draft');
  await qa.seed('alarm');
  const reset = await fetch(url).then(r => r.json());
  assert.equal(reset.state.timer.status, 'idle');
  assert.equal(reset.state.settings.focusMinutes, 1);
});
