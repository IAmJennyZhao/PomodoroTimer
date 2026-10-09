'use strict';
const { test, expect, savedState } = require('./fixtures.cjs');

test('a count-up session starts, pauses, resumes and finishes through the real service', async ({ page, room }) => {
  const timer = page.getByRole('region', { name: 'Focus timer' });
  await expect(timer.getByRole('button', { name: 'Start', exact: true })).toBeEnabled();
  await timer.getByRole('button', { name: 'Count up', exact: true }).click();
  await timer.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(timer).toHaveAttribute('data-timer-state', 'focus-running');
  await timer.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect.poll(async () => (await savedState(room)).timer.status).toBe('paused');
  await timer.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(async () => (await savedState(room)).timer.status).toBe('running');
  await timer.getByRole('button', { name: 'Finish session', exact: true }).click();
  await expect.poll(async () => (await savedState(room)).timer.status).toBe('complete');
  // A session under a minute earns no focus reward or journal minute.
  const saved = await savedState(room);
  expect(saved.history).toHaveLength(8);
  expect(saved.gems).toBe(200);
});

test('notes survive saving, service restart and reload; real build art loads', async ({ page, room }) => {
  await page.getByRole('banner', { name: 'Room controls' }).getByRole('button', { name: 'Open Scratchpad', exact: true }).click();
  const notes = page.getByRole('textbox', { name: 'Scratchpad text' });
  await notes.fill('Fictional browser smoke note');
  await expect.poll(async () => (await savedState(room)).scratchpad).toBe('Fictional browser smoke note');
  await room.offline();
  await room.online();
  await page.reload();
  await page.getByRole('banner', { name: 'Room controls' }).getByRole('button', { name: 'Open Scratchpad', exact: true }).click();
  await expect(notes).toHaveValue('Fictional browser smoke note');
  const images = page.locator('img[src*="/art/atelier/"]');
  await expect(images.first()).toBeVisible();
  await expect.poll(() => images.evaluateAll(elements => elements.every(img => img.complete && img.naturalWidth > 0))).toBeTruthy();
});

test('compact Journal suspends concealed controls and restores History with the note intact (F19)', async ({ page, room }) => {
  await page.setViewportSize({ width: 569, height: 320 });
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  const journal = page.getByRole('dialog', { name: 'Journal', exact: true });
  await journal.getByRole('button', { name: 'History', exact: true }).click();
  await expect(journal.getByRole('heading', { name: 'All sessions' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Scratchpad', exact: true }).click();
  const notes = page.getByRole('textbox', { name: 'Scratchpad text' });
  await notes.fill('Fictional compact Journal note');
  await expect(journal.locator('.drawer-content')).toBeHidden();
  await expect(journal.locator('.drawer-content')).toHaveAttribute('inert', '');
  await expect(journal.getByRole('button', { name: 'History', exact: true })).toHaveCount(0);
  await notes.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Minimize Scratchpad', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(journal.getByRole('button', { name: 'Close panel', exact: true })).toBeFocused();
  await expect(journal.getByRole('button', { name: 'Close panel', exact: true })).toBeInViewport({ ratio: 1 });
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Minimize Scratchpad to use Journal' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(journal.getByRole('heading', { name: 'All sessions' })).toBeVisible();
  await expect(journal.getByRole('button', { name: 'History', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await savedState(room)).scratchpad).toBe('Fictional compact Journal note');
});

test('narrow shop keeps readable purchase labels and persists an egg purchase (F20)', async ({ page, room }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Egg shop', exact: true }).click();
  const purchase = page.getByRole('button', { name: 'Buy basic egg for 25 Shilligems' });
  await expect(purchase).toBeEnabled();
  // Guard the deliberate opaque backing; the release record has the contrast calculation.
  const label = purchase.locator('.purchase-label');
  await expect(label).toHaveCSS('color', 'rgb(53, 68, 61)');
  await expect(label).toHaveCSS('background-color', 'rgb(255, 249, 234)');
  const before = await savedState(room);
  await purchase.click();
  await expect.poll(async () => (await savedState(room)).eggs.length).toBe(before.eggs.length + 1);
  expect((await savedState(room)).gems).toBe(before.gems - 25);
  await page.getByRole('dialog', { name: 'Egg shop', exact: true }).getByRole('button', { name: 'Close panel', exact: true }).click();
  const nest = page.getByRole('button', { name: 'Open nest', exact: true });
  await expect(nest).toBeVisible();
  const target = await nest.boundingBox();
  expect(Math.round(target.width * 100) / 100).toBeGreaterThanOrEqual(44);
  expect(Math.round(target.height * 100) / 100).toBeGreaterThanOrEqual(44);
});

test.describe('active focus', () => {
  test.use({ scenario: 'overtime' });

  test('docked notes keep Finish in the viewport and record the completed session (F21)', async ({ page, room }) => {
    await page.setViewportSize({ width: 1862, height: 843 });
    await page.getByRole('region', { name: 'Focus timer' }).getByRole('button', { name: 'Open Scratchpad', exact: true }).click();
    const finish = page.getByRole('button', { name: 'Finish session', exact: true });
    await expect(finish).toBeInViewport({ ratio: 1 });
    await page.getByRole('textbox', { name: 'Scratchpad text' }).fill('Fictional overtime note');
    await finish.click();
    await expect.poll(async () => (await savedState(room)).timer.status).toBe('complete');
    const saved = await savedState(room);
    expect(saved.history).toHaveLength(1);
    expect(saved.scratchpad).toBe('Fictional overtime note');
  });

  test('compact save outage retains draft and exposes Pause, notes and Retry (F22)', async ({ page, room }) => {
    await page.getByRole('button', { name: 'Leave focus view' }).click();
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await page.getByRole('button', { name: 'Open Scratchpad', exact: true }).click();
    await room.offline();
    const notes = page.getByRole('textbox', { name: 'Scratchpad text' });
    await notes.fill('Fictional draft during a service outage');
    await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 569, height: 320 });
    const pause = page.getByRole('dialog', { name: 'Scratchpad', exact: true }).getByRole('button', { name: /^Pause/ });
    // Resize is asynchronous in WebKit: wait for the sheet's session controls
    // to mount before asserting the keyboard order of that layout.
    await expect(page.locator('.app')).toHaveClass(/notes-compact/);
    await expect(pause).toBeVisible();
    await notes.press('Shift+Tab');
    await expect(pause).toBeFocused();
    await expect(pause).toBeInViewport();
    await pause.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Scratchpad', exact: true }).getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(notes).toBeFocused();
    await expect(notes).toBeInViewport();
    // Firefox can report 43.99998 for an exact 44px CSS minimum.
    expect(Math.round((await notes.boundingBox()).height * 100) / 100).toBeGreaterThanOrEqual(44);
    await expect(notes).toHaveValue('Fictional draft during a service outage');
    await room.online();
    await page.getByRole('button', { name: 'Retry save', exact: true }).click();
    await expect.poll(async () => (await savedState(room)).scratchpad).toBe('Fictional draft during a service outage');
  });
});
