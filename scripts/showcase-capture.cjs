'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium, expect } = require('@playwright/test');
const { createReleaseQa } = require('./release-qa.cjs');
const { showcaseState, CAPTURE_TIME } = require('./showcase-data.cjs');
const { encodeWalkthrough } = require('./showcase-video.cjs');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '.local/showcase/capture');
const stillsOnly = process.argv.slice(2).includes('--stills-only');
if (process.argv.slice(2).some(arg => arg !== '--stills-only')) throw new Error('Use no arguments, or --stills-only.');

async function capture() {
  await fs.access(path.join(root, 'build/index.html'));
  await fs.mkdir(output, { recursive: true });
  const room = await createReleaseQa({ port: 0, scenario: 'fresh' });
  const url = `http://127.0.0.1:${room.port}`;
  const errors = [];
  const artifacts = [];
  let browser;
  let wrapper;
  const saved = async () => {
    const response = await fetch(`${url}/api/save`); assert.ok(response.ok);
    return response.json();
  };
  const seed = async (state) => {
    const response = await fetch(`${url}/api/save`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state, revision: (await saved()).revision }) });
    assert.ok(response.ok, 'Fictional profile seed must be accepted.');
  };
  const watch = page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => errors.push(`${new URL(request.url()).pathname}: ${request.failure()?.errorText}`));
  };
  async function ready(scope) {
    await expect(scope.getByRole('region', { name: 'Focus timer' })).toBeVisible();
    await expect(scope.locator('.loading-screen')).toHaveCount(0);
    await expect.poll(() => scope.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  }
  async function still(name, height, prepare) {
    await seed(showcaseState());
    const context = await browser.newContext({ viewport: { width: 1440, height }, locale: 'en-US', timezoneId: 'UTC', deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(); watch(page); await page.clock.setFixedTime(CAPTURE_TIME);
      await page.goto(url); await ready(page); await prepare?.(page);
      await page.waitForTimeout(650);
      await expect.poll(() => page.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
      const filename = `${name}.jpg`;
      await page.screenshot({ path: path.join(output, filename), type: 'jpeg', quality: 90, animations: 'disabled' });
      artifacts.push({ file: filename, width: 1440, height, kind: 'actual-app-screenshot' });
      console.log(`Captured ${filename}`);
    } finally { await context.close(); }
  }
  const nav = (scope, name) => scope.getByRole('button', { name, exact: true }).click();
  try {
    browser = await chromium.launch({ headless: true });
    await still('room', 1000);
    await still('focus-notes', 1000, async page => {
      await nav(page.getByRole('region', { name: 'Focus timer' }), 'Start');
      await page.clock.setFixedTime(CAPTURE_TIME + 5 * 60_000);
      await page.getByRole('region', { name: 'Focus timer' }).getByRole('button', { name: 'Open Scratchpad', exact: true }).click();
      await expect(page.getByRole('textbox', { name: 'Scratchpad text' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Focus timer' })).toHaveAttribute('data-timer-state', 'focus-running');
    });
    await still('egg-shop', 1200, async page => {
      await nav(page, 'Egg shop');
      await expect(page.getByRole('button', { name: 'Hatch rare egg 2', exact: true })).toBeInViewport({ ratio: 1 });
    });
    await still('pets', 1200, page => nav(page, 'Pets'));
    await still('arrange-room', 1000, async page => {
      await nav(page, 'Decorate'); await nav(page, 'Arrange room');
      await page.getByRole('region', { name: 'Room library' }).getByRole('button', { name: 'Select Maple', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Move Maple', exact: true })).toBeVisible();
    });
    await still('journal', 1200, async page => {
      await nav(page, 'Journal'); await nav(page.getByRole('dialog', { name: 'Journal', exact: true }), '7 days');
      await expect(page.getByRole('region', { name: 'Focus by tag' })).toBeVisible();
    });
    await still('sound', 1000, async page => {
      await nav(page, 'Soundscape mixer');
      await expect(page.getByRole('slider', { name: 'Rain', exact: true })).toBeVisible();
    });

    if (!stillsOnly) {
      const now = Date.now(); const state = showcaseState(now);
      state.settings.workMode = 'countup';
      state.timer = { ...state.timer, workMode: 'countup', status: 'running', startedAt: now - 65_000, endsAt: null, elapsedMs: 0, eggId: state.selectedEggId, gemBonus: 0 };
      await seed(state);
      wrapper = http.createServer((request, response) => {
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Little Room walkthrough</title><style>*{box-sizing:border-box}body{margin:0;background:#fff8e9;color:#35443d;font:16px Georgia,serif}header{height:96px;padding:18px 40px;display:flex;align-items:center;justify-content:space-between}h1{font-size:27px;margin:0 0 5px}p{margin:0}aside{font:14px Arial,sans-serif;color:#657957}iframe{display:block;width:1280px;height:900px;margin:0 40px;border:1px solid #d0bd99;border-radius:8px;background:white}footer{height:60px;padding:18px 40px;font:14px Arial,sans-serif}</style><header><div><h1 id="title">Focus in your little room</h1><p id="caption">A fictional sample session is already underway.</p></div><aside>Little Room · feature walkthrough</aside></header><iframe title="Live Little Room app" src="${url}"></iframe><footer>Fictional demo profile · actual local app · silent recording</footer></html>`);
      });
      await new Promise(resolve => wrapper.listen(0, '127.0.0.1', resolve));
      const context = await browser.newContext({ viewport: { width: 1360, height: 1056 }, locale: 'en-US', timezoneId: 'UTC', recordVideo: { dir: path.join(output, 'raw-video'), size: { width: 1360, height: 1056 } } });
      const page = await context.newPage(); watch(page);
      // Fix only the demo's hatch roll; real time and actual controls run normally.
      await page.addInitScript(() => { Math.random = () => 0.72; });
      const video = page.video(); const timeline = [];
      const started = Date.now();
      const app = page.frameLocator('iframe');
      const pause = milliseconds => page.waitForTimeout(milliseconds);
      async function chapter(title, caption) {
        timeline.push({ seconds: Math.round((Date.now() - started) / 1000), title, caption });
        await page.evaluate(({ title, caption }) => { document.getElementById('title').textContent = title; document.getElementById('caption').textContent = caption; }, { title, caption });
        await pause(1600);
      }
      try {
        await page.goto(`http://127.0.0.1:${wrapper.address().port}`); await ready(app);
        await chapter('01 · Focus, without losing your train of thought', 'A sample count-up session is already underway. Capture a note as you work.');
        await app.getByRole('region', { name: 'Focus timer' }).getByRole('button', { name: 'Open Scratchpad', exact: true }).click();
        const notes = app.getByRole('textbox', { name: 'Scratchpad text' });
        await notes.fill(''); await notes.pressSequentially('A quiet reading break.\nRemember the three takeaways.', { delay: 50 }); await pause(1600);
        await nav(app.getByRole('region', { name: 'Focus timer' }), 'Pause'); await pause(1600);
        await nav(app.getByRole('region', { name: 'Focus timer' }), 'Resume'); await pause(1600);
        await app.getByRole('button', { name: 'Finish session', exact: true }).click();
        await expect.poll(async () => (await saved()).state.timer.status).toBe('complete');
        assert.equal((await saved()).state.history.length, 10);
        await chapter('02 · Turn focus into a growing collection', 'Finishing credits whole minutes. Buy an egg, then hatch a ready one.');
        await app.getByRole('button', { name: 'Minimize Scratchpad', exact: true }).click();
        await nav(app, 'Egg shop'); await pause(1600);
        const beforeBuy = (await saved()).state;
        await app.getByRole('button', { name: 'Buy basic egg for 25 Shilligems' }).click();
        await expect.poll(async () => (await saved()).state.eggs.length).toBe(beforeBuy.eggs.length + 1);
        assert.equal((await saved()).state.gems, beforeBuy.gems - 25);
        await pause(1600);
        await app.getByRole('button', { name: 'Hatch rare egg 2', exact: true }).click(); await pause(2300);
        await app.getByRole('button', { name: 'Close celebration', exact: true }).click();
        await expect.poll(async () => (await saved()).state.animals.find(pet => pet.id === 'demo:fox').upgrades).toBe(3);
        await app.getByRole('dialog', { name: 'Egg shop', exact: true }).getByRole('button', { name: 'Close panel', exact: true }).click();
        await nav(app, 'Pets');
        await chapter('03 · Meet your companions', 'Matching pets unlock animations. Choose an unlocked paw to preview.');
        await app.getByRole('button', { name: 'Preview Hop animation, paw 3', exact: true }).click(); await pause(2300);
        await app.getByRole('dialog', { name: 'Pets', exact: true }).getByRole('button', { name: 'Close panel', exact: true }).click();
        await nav(app, 'Decorate'); await nav(app, 'Arrange room');
        await chapter('04 · Make the room yours', 'Select Maple in the library, nudge with arrow keys, then choose Done.');
        await app.getByRole('region', { name: 'Room library' }).getByRole('button', { name: 'Select Maple', exact: true }).click();
        await app.getByRole('button', { name: 'Move Maple', exact: true }).press('ArrowRight');
        await expect.poll(async () => (await saved()).state.animals.find(pet => pet.id === 'demo:fox').x).toBeGreaterThan(16);
        await pause(1800); await nav(app, 'Done'); await nav(app, 'Journal');
        await nav(app.getByRole('dialog', { name: 'Journal', exact: true }), '7 days');
        await chapter('05 · Look back at your focus', 'Review activity and tags, then open History for tasks and completed minutes.');
        await pause(1800); await nav(app.getByRole('dialog', { name: 'Journal', exact: true }), 'History'); await pause(2000);
        await app.getByRole('dialog', { name: 'Journal', exact: true }).getByRole('button', { name: 'Close panel', exact: true }).click();
        await nav(app, 'Soundscape mixer');
        await chapter('06 · Set the atmosphere', 'Rain, fireplace and brown noise have independent levels that save locally.');
        await app.getByRole('slider', { name: 'Rain', exact: true }).press('ArrowRight');
        await expect.poll(async () => (await saved()).state.settings.ambient.rain).toBe(0.31); await pause(2000);
        await app.getByRole('dialog', { name: 'Sound', exact: true }).getByRole('button', { name: 'Close panel', exact: true }).click();
        await chapter('Little Room · a gentler Pomodoro', 'Focus, collect and make a little space of your own.');
        await pause(2000);
      } finally { await context.close(); }
      const source = path.join(output, 'raw-video/walkthrough-source.webm');
      await video.saveAs(source);
      const encoding = encodeWalkthrough(source, path.join(output, 'walkthrough.webm'));
      await fs.writeFile(path.join(output, 'walkthrough-timeline.json'), JSON.stringify(timeline.map(chapter => ({ ...chapter, seconds: Math.max(0, chapter.seconds - encoding.leadTrimSeconds) })), null, 2) + '\n');
      artifacts.push({ file: 'walkthrough.webm', width: 1360, height: 1056, kind: 'actual-app-walkthrough', silent: true, encoding });
      console.log('Captured walkthrough.webm');
    }
    assert.deepEqual(errors, [], 'Browser requests and page code must succeed.');
    const buildHtml = await fs.readFile(path.join(root, 'build/index.html'));
    const metadata = { sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()), buildHtmlSha256: createHash('sha256').update(buildHtml).digest('hex'), browser: browser.version(), locale: 'en-US', timezone: 'UTC', stillTime: new Date(CAPTURE_TIME).toISOString(), fixture: 'scripts/showcase-data.cjs', generatedAt: new Date().toISOString(), artifacts, browserErrors: errors };
    for (const artifact of artifacts) {
      const buffer = await fs.readFile(path.join(output, artifact.file));
      artifact.bytes = buffer.length; artifact.sha256 = createHash('sha256').update(buffer).digest('hex');
    }
    await fs.writeFile(path.join(output, 'capture.json'), JSON.stringify(metadata, null, 2) + '\n');
    console.log('Capture manifest written to .local/showcase/capture/capture.json');
  } finally {
    await browser?.close(); if (wrapper) await new Promise(resolve => wrapper.close(resolve));
    await room.offline();
    assert.equal(path.dirname(room.dataDir), path.resolve(os.tmpdir()));
    assert.ok(path.basename(room.dataDir).startsWith('little-room-release-qa-'));
    await fs.rm(room.dataDir, { recursive: true, force: true });
  }
}

capture().catch(error => { console.error(error.message); process.exitCode = 1; });
