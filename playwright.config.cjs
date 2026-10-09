'use strict';
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e', testMatch: '**/*.spec.cjs',
  fullyParallel: true, forbidOnly: Boolean(process.env.CI),
  retries: 0, workers: 1, timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce',
    trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: ['chromium', 'firefox', 'webkit'].map(browserName => ({ name: browserName, use: { browserName } })),
});
