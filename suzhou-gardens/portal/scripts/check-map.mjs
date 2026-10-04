import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
// Browser tooling is explicitly supplied; this buildless portal has no app dependency.
const playwrightPath = process.argv[2];
if (!playwrightPath || !path.isAbsolute(playwrightPath)) throw Error('Pass the absolute installed Playwright index.mjs path.');
const { chromium } = await import(playwrightPath);
const { PNG } = createRequire(playwrightPath)('pngjs');
const root = path.resolve(import.meta.dirname, '..');
const reviewDirectory = process.env.MAP_REVIEW_DIRECTORY || 'map-1';
if (!/^[a-z0-9-]+$/.test(reviewDirectory)) throw Error('Invalid review directory.');
const output = path.join(root, 'docs/reviews', reviewDirectory);
fs.mkdirSync(output, { recursive: true });
const siteOrigin = process.env.MAP_SITE_ORIGIN || 'http://127.0.0.1:4610';
const packageOrigin = process.env.MAP_PACKAGE_ORIGIN || 'http://127.0.0.1:4192';
const gardens = ['liuyuan', 'zhuozhengyuan', 'shizilin', 'wangshiyuan', 'canglangting'];
const records = [];
const errors = [], failedRequests = [], external = [];
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
page.on('requestfailed', r => failedRequests.push({ url: r.url(), error: r.failure()?.errorText }));
await context.route('**/*', route => {
 const url = route.request().url();
 if (url.startsWith(siteOrigin + '/') || url.startsWith(packageOrigin + '/') || /^(data|blob):/.test(url)) return route.continue();
 external.push(url); return route.abort();
});
const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
const loadedImage = async () => page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
async function illustrationIntact() {
 const image = await page.locator('.map-art').evaluate(e => ({
  natural: [e.naturalWidth, e.naturalHeight],
  width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height,
  fit: getComputedStyle(e).objectFit
 }));
 assert.deepEqual(image.natural, [1254, 1254]);
 assert(Math.abs(image.width - image.height) < 1, 'Illustration stretched or cropped');
 assert.equal(image.fit, 'contain');
 return image;
}
async function markersAccessible() {
 const rects = await page.locator('.garden-marker').evaluateAll(es => es.map(e => {
  const r = e.getBoundingClientRect(); return { name: e.dataset.garden, x: r.x, y: r.y, width: r.width, height: r.height };
 }));
 assert.equal(rects.length, 5);
 const width = await page.evaluate(() => innerWidth);
 for (const r of rects) { assert(r.width >= 44 && r.height >= 44); assert(r.x >= 0 && r.x + r.width <= width); }
 for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
  const a = rects[i], b = rects[j];
  assert(!(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y), `Overlapping markers: ${a.name}, ${b.name}`);
 }
 await noOverflow();
 return rects;
}
async function sceneReady() {
 await page.waitForFunction(() => (window.__LIUYUAN__ || window.__GARDEN__)?.ready && (window.__LIUYUAN__ || window.__GARDEN__).calls > 10 && (window.__LIUYUAN__ || window.__GARDEN__).triangles > 1000, null, { timeout: 60000 });
 return await page.evaluate(() => window.__LIUYUAN__ || window.__GARDEN__);
}
async function realCanvas() {
 const bytes = await page.locator('canvas').screenshot({ type: 'png' });
 const png = PNG.sync.read(bytes); let sum = 0, squared = 0, darks = 0;
 const count = png.width * png.height;
 for (let i = 0; i < png.data.length; i += 4) { const value = (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3; sum += value; squared += value * value; if (value < 100) darks++; }
 const variance = squared / count - (sum / count) ** 2;
 assert(variance > 80 && darks > count * .003, 'Blank or empty WebGL frame');
 return { variance: Math.round(variance), darkPixels: darks, width: png.width, height: png.height };
}
try {
 let response = await page.goto(siteOrigin + '/'); assert.equal(response.status(), 200); await loadedImage();
 assert.equal(await page.locator('.garden-marker').count(), 5);
 const hrefs = await page.locator('.garden-marker').evaluateAll(es => es.map(e => ({ id: e.dataset.garden, href: e.href, target: e.target })));
 assert(hrefs.every(e => e.href.endsWith('.jggagi.chatgpt.site/') && e.target === ''));
 await markersAccessible();
 await page.screenshot({ path: path.join(output, 'map-desktop.jpg'), type: 'jpeg', quality: 86, fullPage: true });
 records.push({ check: 'Sites map desktop', viewport: [1440, 1000], illustration: await illustrationIntact(), realAnchorLinks: hrefs });
 for (const key of gardens) { await page.locator(`[data-garden="${key}"]`).focus(); await loadedImage(); assert((await page.locator('#preview-image').getAttribute('src')).includes(key)); }
 // DOM order is the same five Tab stops as the visible map, Enter is tested below.
 await page.locator('.garden-marker').first().focus();
 for (let i = 1; i < 5; i++) { await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement?.dataset.garden), gardens[i]); }
 records.push({ check: 'Keyboard and five authentic preview images', passed: true });
 await page.setViewportSize({ width: 390, height: 844 }); await page.goto(packageOrigin + '/'); await loadedImage();
 const mobileRects = await markersAccessible();
 await page.screenshot({ path: path.join(output, 'map-mobile.jpg'), type: 'jpeg', quality: 86, fullPage: true });
 records.push({ check: 'Phone map', viewport: [390, 844], illustration: await illustrationIntact(), markers: mobileRects });
 for (const key of gardens) {
  await page.locator(`[data-garden="${key}"]`).focus();
  if (key === 'liuyuan') await page.keyboard.press('Enter'); else await page.locator(`[data-garden="${key}"]`).click();
  await page.waitForURL(packageOrigin + '/' + key + '/');
  let state = await sceneReady(); await noOverflow();
  const pixels = await realCanvas();
  const back = page.getByTestId('return-map'); const r = await back.boundingBox();
  assert(r.width >= 44 && r.height >= 44); assert.equal(await back.getAttribute('href'), packageOrigin + '/#garden=' + key);
  // New portal art reviews keep their evidence inside the portal directory.
  if (reviewDirectory === 'map-1') {
   fs.mkdirSync(path.join(root, '../' + key + '/docs/reviews/map-1'), { recursive: true });
   await page.screenshot({ path: path.join(root, '../' + key + '/docs/reviews/map-1/mobile-return.jpg'), type: 'jpeg', quality: 84, fullPage: true });
  } else if (key === 'liuyuan') {
   await page.screenshot({ path: path.join(output, 'garden-mobile.jpg'), type: 'jpeg', quality: 84, fullPage: true });
  }
  const style = await page.addStyleTag({ content: 'html { font-size:200%; }' }); await noOverflow(); await style.evaluate(e => e.remove());
  const lastView = page.locator('[data-testid^="view-"]').last();
  const view = (await lastView.getAttribute('data-testid')).slice(5); await lastView.click();
  await page.waitForFunction(id => (window.__LIUYUAN__ || window.__GARDEN__)?.ready && (window.__LIUYUAN__ || window.__GARDEN__).view === id, view, { timeout: 45000 });
  await page.getByTestId('reset-view').click(); await sceneReady();
  response = await page.reload(); assert.equal(response.status(), 200); state = await sceneReady();
  await page.getByTestId('return-map').click(); await page.waitForURL(packageOrigin + '/#garden=' + key); await loadedImage();
  assert.equal(await page.locator('.garden-marker.is-current').getAttribute('data-garden'), key);
  assert((await page.locator('#preview-image').getAttribute('src')).includes(key)); await markersAccessible();
  records.push({ check: 'Real phone garden round trip', garden: key, calls: state.calls, triangles: state.triangles, pixels, preset: view, directReload: 200, font200NoOverflow: true, explicitReturnSelection: key });
 }
 await page.screenshot({ path: path.join(output, 'map-mobile-return.jpg'), type: 'jpeg', quality: 86, fullPage: true });
 // Browser back must restore selection too, including a fresh page instead of bfcache.
 await page.locator('[data-garden="liuyuan"]').click(); await sceneReady();
 await page.goBack(); assert.equal(page.url(), packageOrigin + '/#garden=liuyuan');
 assert.equal(await page.locator('.garden-marker.is-current').getAttribute('data-garden'), 'liuyuan');
 await page.goForward(); await sceneReady(); await page.getByTestId('return-map').click();
 records.push({ check: 'Browser back / forward and explicit return', passed: true });
 await page.setViewportSize({ width: 320, height: 700 }); await page.goto(packageOrigin + '/'); await markersAccessible();
 const font = await page.addStyleTag({ content: 'html { font-size:200%; }' }); const largeRects = await markersAccessible();
 records.push({ check: '320px / 200% text', illustration: await illustrationIntact(), markers: largeRects, noOverlap: true, noOverflow: true });
 await page.screenshot({ path: path.join(output, 'map-large-text.jpg'), type: 'jpeg', quality: 86, fullPage: true });
 await font.evaluate(e => e.remove());
 await page.setViewportSize({ width: 844, height: 390 }); await markersAccessible(); records.push({ check: 'Short landscape', noOverlap: true, noOverflow: true });
 // The default destination remains functional for direct links and storage denial.
 await page.setViewportSize({ width: 390, height: 844 });
 await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('Blocked storage'); }; Storage.prototype.setItem = () => { throw new Error('Blocked storage'); }; });
 await page.goto(packageOrigin + '/shizilin/index.html?return=https://evil.test/'); await sceneReady();
 await page.getByTestId('return-map').click(); await page.waitForURL(packageOrigin + '/#garden=shizilin');
 assert.equal(await page.locator('.garden-marker.is-current').getAttribute('data-garden'), 'shizilin');
 await page.locator('[data-garden="wangshiyuan"]').click(); await sceneReady(); await page.goBack();
 assert.equal(await page.locator('.garden-marker.is-current').getAttribute('data-garden'), 'wangshiyuan');
 records.push({ check: 'Direct index link, untrusted return input, storage blocked', passed: true });
 const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
 const staticPage = await noJs.newPage(); await staticPage.goto(packageOrigin + '/');
 assert.equal(await staticPage.locator('.garden-marker').count(), 5);
 assert.deepEqual(await staticPage.locator('.garden-marker').evaluateAll(es => es.map(e => new URL(e.href).pathname)), gardens.map(k => '/' + k + '/'));
 await noJs.close(); records.push({ check: 'Map anchors without JavaScript', passed: true });
 assert.deepEqual(errors, []); assert.deepEqual(failedRequests, []); assert.deepEqual(external, []);
 const receipt = JSON.parse(fs.readFileSync(path.join(root, '.cloudbase-runtime/package-receipt.json'), 'utf8'));
 const result = { date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }), browser: browser.version(), rendering: 'Chromium + SwiftShader, DPR=1, reduced motion', passed: true, checks: records, scriptErrors: errors, failedRequests, externalRequests: external, packageFiles: receipt.files, limits: 'Local final static output. Physical phones, Safari, mainland networks and CloudBase live upload are not verified. Map is a generated hand-painted-style illustration, not measured cartography.' };
 fs.writeFileSync(path.join(output, 'check-results.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ passed: true, checks: records.length, gardens: 5, browser: browser.version(), errors: errors.length, externalRequests: external.length }));
} finally { await browser.close(); }
