import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { SCENE_OBJECTS, SCENE_SEED } from '../../src/data/garden.layout';
import { getViewPreset, VIEW_PRESETS, type ViewId } from '../../src/data/garden.views';

interface GardenDiagnostics {
  ready: boolean;
  view: ViewId | null;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  position: number[];
  target: number[];
  calls: number;
  triangles: number;
  renderer: string;
  frames: number;
  seed: number;
  objects: number;
}

const diagnostics = (page: Page) => page.evaluate(() =>
  (window as unknown as { __GARDEN__?: GardenDiagnostics }).__GARDEN__ ?? null);

async function waitForScene(page: Page, view?: ViewId | null) {
  await expect.poll(async () => {
    const state = await diagnostics(page);
    return Boolean(state?.ready && state.calls > 0 && state.triangles > 0 && (view === undefined || state.view === view));
  }).toBe(true);
  await expect(page.locator('[data-render-status="ready"]')).toBeVisible();
  return (await diagnostics(page))!;
}

async function selectView(page: Page, id: ViewId) {
  await page.getByTestId(`view-${id}`).click();
  const state = await waitForScene(page, id);
  const preset = getViewPreset(id);
  state.position.forEach((value, index) => expect(value).toBeCloseTo(preset.position[index], 2));
  state.target.forEach((value, index) => expect(value).toBeCloseTo(preset.target[index], 2));
  await expect(page.getByTestId(`view-${id}`)).toHaveAttribute('aria-pressed', 'true');
  return state;
}

async function assertRealCanvas(page: Page, requireWater = false) {
  const buffer = await page.locator('canvas').screenshot({ type: 'png' });
  const png = PNG.sync.read(buffer);
  let sum = 0;
  let squared = 0;
  let greens = 0;
  let teals = 0;
  let darks = 0;
  const pixels = png.width * png.height;
  for (let offset = 0; offset < png.data.length; offset += 4) {
    const [red, green, blue] = [png.data[offset], png.data[offset + 1], png.data[offset + 2]];
    const luminance = (red + green + blue) / 3;
    sum += luminance;
    squared += luminance * luminance;
    if (green > red + 6 && green > blue + 6) greens++;
    if (green > red + 8 && blue > red + 6 && Math.abs(green - blue) < 35) teals++;
    if (red < 125 && green < 125 && blue < 125) darks++;
  }
  const deviation = Math.sqrt(squared / pixels - (sum / pixels) ** 2);
  expect(png.width).toBeGreaterThan(200);
  expect(png.height).toBeGreaterThan(200);
  expect(deviation).toBeGreaterThan(12);
  expect(greens / pixels).toBeGreaterThan(0.002);
  expect(darks / pixels).toBeGreaterThan(0.002);
  if (requireWater) expect(teals / pixels).toBeGreaterThan(0.001);
  return createHash('sha256').update(buffer).digest('hex');
}

async function dragCanvas(page: Page) {
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width * 0.48;
  const y = box!.y + box!.height * 0.42;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 130, y + 45, { steps: 12 });
  await page.mouse.up();
}

test('真实渲染四个机位，并交付固定视口的五张压缩截图', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:5176/') && !request.url().startsWith('data:')) externalRequests.push(request.url());
  });
  await page.goto('/');
  const initial = await waitForScene(page, 'overview');
  expect(initial.seed).toBe(SCENE_SEED);
  expect(initial.objects).toBeGreaterThanOrEqual(SCENE_OBJECTS.length);
  expect(initial.frames).toBeGreaterThan(4);
  expect(initial.renderer.length).toBeGreaterThan(0);

  const screenshotDirectory = resolve('docs/reviews/m1');
  await mkdir(screenshotDirectory, { recursive: true });
  const hashes = [];
  for (const view of VIEW_PRESETS) {
    const state = await selectView(page, view.id);
    hashes.push(await assertRealCanvas(page, view.id === 'overview' || /pool|waterside|lotus/.test(view.id)));
    console.info('真实渲染记录', JSON.stringify({ browser: browser.version(), viewport: '1440×1000', dpr: 1, ...state }));
    await page.screenshot({ path: resolve(screenshotDirectory, `desktop-${view.id}.jpg`), type: 'jpeg', quality: 84, fullPage: true });
  }
  expect(new Set(hashes).size).toBe(4);

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto('/');
  const mobileState = await waitForScene(mobile, 'overview');
  await assertRealCanvas(mobile, true);
  console.info('真实渲染记录', JSON.stringify({ browser: browser.version(), viewport: '390×844', dpr: 1, ...mobileState }));
  await expect(mobile.getByTestId('view-overview')).toBeInViewport();
  await expect(mobile.getByTestId('reset-view')).toBeInViewport();
  expect(await mobile.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await mobile.screenshot({ path: resolve(screenshotDirectory, 'mobile-overview.jpg'), type: 'jpeg', quality: 84, fullPage: true });
  await mobileContext.close();
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('连续请求以最后一次生效，手动拖动中断转场，复位恢复全园', async ({ page }) => {
  await page.goto('/');
  const initial = await waitForScene(page, 'overview');
  for (const id of [VIEW_PRESETS[1].id, VIEW_PRESETS[2].id, VIEW_PRESETS[0].id, VIEW_PRESETS[3].id]) await page.getByTestId(`view-${id}`).click();
  await waitForScene(page, VIEW_PRESETS[3].id);
  await selectView(page, VIEW_PRESETS[3].id);

  await page.getByTestId(`view-${VIEW_PRESETS[1].id}`).click();
  await dragCanvas(page);
  const interrupted = await waitForScene(page, null);
  await expect(page.getByText('自由观察', { exact: true })).toBeVisible();
  for (const view of VIEW_PRESETS) await expect(page.getByTestId(`view-${view.id}`)).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(400);
  const stopped = (await diagnostics(page))!;
  expect(stopped.view).toBeNull();
  stopped.position.forEach((value, index) => expect(value).toBeCloseTo(interrupted.position[index], 3));

  await page.getByTestId('reset-view').click();
  const reset = await waitForScene(page, 'overview');
  reset.position.forEach((value, index) => expect(value).toBeCloseTo(initial.position[index], 2));
  reset.target.forEach((value, index) => expect(value).toBeCloseTo(initial.target[index], 2));
  expect(reset.zoom).toBeCloseTo(initial.zoom, 2);
});

test('真实滚轮操作达到两端缩放边界，保持目标且复位可恢复', async ({ page }) => {
  await page.goto('/');
  const initial = await waitForScene(page, 'overview');
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.move(canvas!.x + canvas!.width / 2, canvas!.y + canvas!.height * 0.45);
  await page.mouse.wheel(0, -12_000);
  const zoomedIn = await waitForScene(page, null);
  expect(zoomedIn.zoom).toBeCloseTo(zoomedIn.maxZoom, 2);
  zoomedIn.target.forEach((value, index) => expect(value).toBeCloseTo(initial.target[index], 2));
  await page.mouse.wheel(0, 12_000);
  const zoomedOut = await waitForScene(page, null);
  expect(zoomedOut.zoom).toBeCloseTo(zoomedOut.minZoom, 2);
  expect(zoomedOut.zoom).toBeLessThan(zoomedIn.zoom);
  await page.getByTestId('reset-view').click();
  expect((await waitForScene(page, 'overview')).zoom).toBeCloseTo(initial.zoom, 2);
});

test('横竖屏 resize 重新适配正交范围，按钮与场景仍可操作', async ({ page }) => {
  await page.goto('/');
  const desktop = await waitForScene(page, 'overview');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await diagnostics(page))?.zoom ?? Infinity).toBeLessThan(desktop.zoom);
  const portrait = await waitForScene(page, 'overview');
  expect(portrait.zoom).toBeLessThan(desktop.zoom);
  await assertRealCanvas(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await selectView(page, VIEW_PRESETS[3].id);
  await page.setViewportSize({ width: 844, height: 390 });
  await waitForScene(page, VIEW_PRESETS[3].id);
  await expect(page.getByTestId('reset-view')).toBeInViewport();
  await page.getByTestId('reset-view').click();
  await waitForScene(page, 'overview');
});

test('reduced motion 直接切换，DOM 按钮可由键盘操作', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await waitForScene(page, 'overview');
  await page.getByTestId(`view-${VIEW_PRESETS[3].id}`).focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => {
    const position = (await diagnostics(page))?.position;
    return position ? Math.max(...position.map((value, index) => Math.abs(value - getViewPreset(VIEW_PRESETS[3].id).position[index]))) : Infinity;
  }, { timeout: 800, intervals: [50] }).toBeLessThan(0.001);
  await waitForScene(page, VIEW_PRESETS[3].id);
  await expect(page.getByTestId(`view-${VIEW_PRESETS[3].id}`)).toBeFocused();
  await page.getByTestId('reset-view').focus();
  await page.keyboard.press('Space');
  await waitForScene(page, 'overview');
});

test('手机触摸模拟可单指旋转与双指缩放', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  const initial = await waitForScene(page, 'overview');
  const box = (await page.locator('canvas').boundingBox())!;
  const session = await context.newCDPSession(page);
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height * 0.45;
  const touch = (id: number, x: number, y: number) => ({ id, x, y, radiusX: 2, radiusY: 2, force: 1 });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch(0, centerX, centerY)] });
  for (let step = 1; step <= 8; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touch(0, centerX + step * 10, centerY + step * 2)] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const rotated = await waitForScene(page, null);
  expect(Math.max(...rotated.position.map((value, index) => Math.abs(value - initial.position[index])))).toBeGreaterThan(1);

  await page.getByTestId('reset-view').tap();
  const reset = await waitForScene(page, 'overview');
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch(0, centerX - 25, centerY), touch(1, centerX + 25, centerY)] });
  for (let step = 1; step <= 8; step++) {
    const spread = 25 + step * 6;
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touch(0, centerX - spread, centerY), touch(1, centerX + spread, centerY)] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const pinched = await waitForScene(page, null);
  expect(pinched.zoom).toBeGreaterThan(reset.zoom * 1.2);
  expect(pinched.zoom).toBeLessThanOrEqual(pinched.maxZoom + 0.001);
  await context.close();
});

test('WebGL 不可用时显示可读错误和刷新指引', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return getContext.call(this, type as '2d', ...args as []);
    } as typeof getContext;
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(/WebGL/);
  await expect(page.getByRole('alert')).toContainText(/刷新|重试/);
  await expect(page.locator('[data-render-status="ready"]')).toHaveCount(0);
});
