'use strict';
const { test: base, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createReleaseQa } = require('../scripts/release-qa.cjs');

const test = base.extend({
  scenario: ['journal', { option: true }],
  room: async ({ scenario }, use) => {
    // Each test owns its server, ephemeral port and profile. No fixed QA port,
    // personal save directory or existing browser session is reused.
    const room = await createReleaseQa({ port: 0, scenario });
    try { await use({ ...room, url: `http://127.0.0.1:${room.port}` }); }
    finally {
      await room.offline();
      assert.equal(path.dirname(room.dataDir), path.resolve(os.tmpdir()));
      assert.ok(path.basename(room.dataDir).startsWith('little-room-release-qa-'));
      await fs.rm(room.dataDir, { recursive: true, force: true });
    }
  },
  page: async ({ page, room }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(room.url);
    await expect(page.getByRole('region', { name: 'Focus timer' })).toBeVisible();
    await expect(page.locator('.loading-screen')).toHaveCount(0);
    await use(page);
    expect(errors, 'uncaught browser errors').toEqual([]);
  },
});

async function savedState(room) {
  const response = await fetch(`${room.url}/api/save`);
  expect(response.ok).toBeTruthy();
  return (await response.json()).state;
}

module.exports = { test, expect, savedState };
