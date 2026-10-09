'use strict';

const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

function encodeWalkthrough(source, destination) {
  // Playwright 1.64 bundles this registry; it respects PLAYWRIGHT_BROWSERS_PATH
  // and selects the installed FFmpeg binary for the current OS.
  const core = path.dirname(require.resolve('playwright-core/package.json'));
  const { registry } = require(path.join(core, 'lib/coreBundle.js')).registry;
  const ffmpeg = registry.findExecutable('ffmpeg').executablePath();
  assert.ok(fs.existsSync(ffmpeg), 'Run npm run browsers:install first.');
  execFileSync(ffmpeg, ['-y', '-ss', '2', '-i', source, '-an', '-c:v', 'libvpx-vp9', '-b:v', '1400k', '-crf', '26', '-r', '15', '-deadline', 'good', '-cpu-used', '5', destination], { timeout: 300_000, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 });
  const bytes = fs.statSync(destination).size;
  assert.ok(bytes < 8_000_000, 'Review encoding before publishing a walkthrough larger than 8 MB.');
  return { codec: 'VP9', fps: 15, targetBitrate: 1400000, leadTrimSeconds: 2, bytes };
}

module.exports = { encodeWalkthrough };
if (require.main === module) {
  const directory = path.resolve(__dirname, '../.local/showcase/capture');
  try { console.log(JSON.stringify(encodeWalkthrough(path.join(directory, 'raw-video/walkthrough-source.webm'), path.join(directory, 'walkthrough.webm')))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
