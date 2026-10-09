'use strict';

// Render media layouts with native HTML/CSS and actual captured app images.
// The optional GIF encoder is installed separately under ignored local tools.
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { chromium } = require('@playwright/test');
const { GIFEncoder, quantize, applyPalette } = require('../.local/showcase/tools/node_modules/gifenc');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.local/showcase/capture');
const scenes = [
  ['room', 'A little room of your own', 'Countdown or count-up, a daily goal and companions by your side.'],
  ['focus-notes', 'Focus, with room for a thought', 'A quiet timer view and saved Scratchpad keep your work in reach.'],
  ['egg-shop', 'Let your collection grow', 'Choose an egg, focus with it and hatch it when it is ready.'],
  ['pets', 'Meet your companions', 'Matching pets unlock animations; accessories add a personal touch.'],
  ['arrange-room', 'Make it yours', 'Arrange furniture, pets, the timer and your daily goal.'],
  ['journal', 'Look back at your focus', 'Review sessions, activity and tags in the Journal.'],
];

async function render() {
  const capture = JSON.parse(await fs.readFile(path.join(output, 'capture.json'), 'utf8'));
  const template = await fs.readFile(path.join(__dirname, 'showcase/social-preview.html'), 'utf8');
  const errors = [];
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/social') { response.setHeader('content-type', 'text/html; charset=utf-8'); response.end(template); return; }
      if (url.pathname === '/scene') {
        const index = Number(url.searchParams.get('index')); assert.ok(Number.isInteger(index) && index >= 0 && index < scenes.length);
        const [file, title, caption] = scenes[index];
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Little Room feature preview</title><style>*{box-sizing:border-box}body{margin:0;background:#fff8e9;color:#35443d;font:16px Georgia,serif}header{height:88px;padding:17px 28px;border-bottom:1px solid #d9c8a8}h1{margin:0 0 6px;font-size:27px}p{margin:0;font:15px Arial,sans-serif}main{height:634px;padding:12px 20px;display:flex;justify-content:center}img{height:100%;max-width:100%;object-fit:contain;box-shadow:0 2px 8px #5e624326}footer{height:38px;padding:10px 28px;font:13px Arial,sans-serif;color:#6f775e;display:flex;justify-content:space-between}</style><header><h1>${title}</h1><p>${caption}</p></header><main><img src="/${file}.jpg" alt="${title}"></main><footer><span>Little Room · actual app screenshots · fictional demo data</span><span>${index+1} / ${scenes.length}</span></footer></html>`); return;
      }
      if (/^\/[a-z-]+\.jpg$/.test(url.pathname)) {
        response.setHeader('content-type', 'image/jpeg'); response.end(await fs.readFile(path.join(output, url.pathname.slice(1)))); return;
      }
      response.writeHead(404); response.end();
    } catch (_) { response.writeHead(500); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(error.message));
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(`${url}/social`); await page.locator('img').evaluate(img => img.decode());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1280);
    await page.screenshot({ path: path.join(output, 'social-preview.png') });
    const socialBytes = (await fs.stat(path.join(output, 'social-preview.png'))).size;
    assert.ok(socialBytes < 1_000_000, 'GitHub social preview must be under 1 MB.');
    const gif = GIFEncoder();
    await page.setViewportSize({ width: 1000, height: 760 });
    for (let index = 0; index < scenes.length; index++) {
      await page.goto(`${url}/scene?index=${index}`); await page.locator('img').evaluate(img => img.decode());
      const screenshot = await page.screenshot();
      const pixels = await page.evaluate(async base64 => {
        const img = new Image(); img.src = `data:image/png;base64,${base64}`; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
        const rgba = ctx.getImageData(0, 0, img.width, img.height).data;
        let binary = ''; for (let offset = 0; offset < rgba.length; offset += 16384) binary += String.fromCharCode(...rgba.subarray(offset, offset+16384));
        return btoa(binary);
      }, screenshot.toString('base64'));
      const rgba = new Uint8Array(Buffer.from(pixels, 'base64'));
      const palette = quantize(rgba, 256);
      gif.writeFrame(applyPalette(rgba, palette), 1000, 760, { palette, delay: 3500, repeat: 0 });
      await fs.writeFile(path.join(output, `preview-frame-${index+1}.png`), screenshot);
    }
    gif.finish(); await fs.writeFile(path.join(output, 'feature-tour.gif'), gif.bytesView());
    assert.deepEqual(errors, []);
    const artifacts = [];
    for (const [file, width, height, kind] of [['social-preview.png',1280,640,'social-layout'], ['feature-tour.gif',1000,760,'captioned-screenshot-preview']]) {
      const buffer = await fs.readFile(path.join(output, file));
      artifacts.push({ file, width, height, kind, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') });
    }
    await fs.writeFile(path.join(output, 'media-render.json'), JSON.stringify({ captureRevision: capture.sourceRevision, gifEncoder: 'gifenc 1.0.3', gifFrames: scenes.length, frameDelayMs: 3500, artifacts, errors }, null, 2) + '\n');
    console.log(JSON.stringify({ rendered: artifacts.map(item => ({file:item.file,bytes:item.bytes})), gifFrames: scenes.length, errors }));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
render().catch(error => { console.error(error.message); process.exitCode = 1; });
