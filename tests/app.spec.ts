import { expect, test } from '@playwright/test';
import { fitView, orbitOf, projectedOrbit } from '../src/physics';
import { planets } from '../src/data';

test('initial layout, assets, selection, background clearing and reset', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'スタート', exact: true })).toBeVisible();
  await expect(page.getByTestId('years')).toHaveText('0.00');
  await expect(page.getByLabel('公転速度', { exact: true })).toHaveValue('10');
  await expect(page.getByRole('checkbox', { name: /リアル半径/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /冥王星/ })).not.toBeChecked();
  await expect(page.getByText('天体の模様を読み込んでいます…')).toBeHidden();
  await expect(page.getByText(/画像を読み込めませんでした/)).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const sidebar = await page.getByRole('complementary').boundingBox();
  const canvas = page.locator('canvas');
  const box = (await canvas.boundingBox())!;
  if (testInfo.project.name === 'desktop') expect(box.x).toBeGreaterThanOrEqual(sidebar!.width);
  else expect(box.y).toBeGreaterThan(sidebar!.y);
  await page.getByLabel('情報を表示する天体').selectOption('earth');
  await expect(page.getByRole('heading', { name: '地球', exact: true })).toBeVisible();
  await expect(page.getByText('質量', { exact: true })).toBeVisible();
  await expect(page.getByText('自転時間', { exact: false }).first()).toBeVisible();
  // Select by rendered label/body, without depending on a production debug hook.
  await page.getByRole('button', { name: '全体表示', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await canvas.click({ position: { x: 12, y: 120 } });
  await expect(page.getByLabel('情報を表示する天体')).toHaveValue('');
  await page.getByRole('checkbox', { name: /冥王星/ }).check();
  await page.getByLabel('情報を表示する天体').selectOption('pluto');
  await expect(page.getByText('準惑星', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: /冥王星/ }).uncheck();
  await expect(page.getByLabel('情報を表示する天体')).toHaveValue('');
  await page.getByRole('checkbox', { name: /リアル半径/ }).check();
  await page.getByRole('checkbox', { name: /冥王星/ }).check();
  await page.getByLabel('公転速度', { exact: true }).fill('25');
  await page.getByRole('button', { name: 'リセット', exact: true }).click();
  await expect(page.getByLabel('公転速度', { exact: true })).toHaveValue('25');
  await expect(page.getByRole('checkbox', { name: /リアル半径/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /冥王星/ })).toBeChecked();
  await expect(page.getByTestId('years')).toHaveText('0.00');
  await page.screenshot({ path: `test-results/${testInfo.project.name}-real.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test('time, validation, credits and zoom controls', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-01-01T00:00:10Z'));
  await page.clock.runFor(100);
  await page.getByRole('button', { name: 'スタート', exact: true }).click();
  await page.clock.runFor(5000);
  const elapsed = () => page.getByTestId('years').innerText().then(Number);
  expect(await elapsed()).toBeCloseTo(0.5, 1);
  await page.getByRole('button', { name: 'ストップ', exact: true }).click();
  const paused = await elapsed();
  await page.clock.runFor(5000);
  expect(await elapsed()).toBeCloseTo(paused, 1);
  await page.getByLabel('公転速度', { exact: true }).fill('0');
  await expect(page.getByRole('alert')).toContainText('1～100の整数');
  await expect(page.getByRole('slider', { name: '公転速度スライダー' })).toHaveValue('10');
  await page.getByLabel('公転速度', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'リセット', exact: true }).click();
  await page.getByRole('button', { name: 'スタート', exact: true }).click();
  await page.clock.runFor(1000);
  await page.getByRole('button', { name: 'ストップ', exact: true }).click();
  expect(await elapsed()).toBeCloseTo(1, 1);
  await page.getByRole('button', { name: '拡大', exact: true }).click();
  await expect(page.getByLabel('ズーム倍率')).not.toHaveText('1.0×');
  await page.getByRole('button', { name: '全体表示', exact: true }).click();
  await expect(page.getByLabel('ズーム倍率')).toHaveText('1.0×');
  await page.getByRole('button', { name: '出典・クレジット' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('CC BY 4.0');
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('canvas picking, drag preserves selection, responsive width', async ({ page }, testInfo) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const fit = fitView(box.width, box.height, false, false);
  const earthPoint = { x: fit.center.x + 3 * fit.scale, y: fit.center.y };
  if (testInfo.project.name === 'mobile') await canvas.tap({ position: earthPoint });
  else await canvas.click({ position: earthPoint });
  await expect(page.getByLabel('情報を表示する天体')).toHaveValue('earth');
  await canvas.scrollIntoViewIfNeeded();
  const current = (await canvas.boundingBox())!;
  await page.mouse.move(current.x + 18, current.y + 150);
  await page.mouse.down();
  await page.mouse.move(current.x + 78, current.y + 180, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByLabel('情報を表示する天体')).toHaveValue('earth');
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '全体表示', exact: true }).click();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-narrow.png`, fullPage: true });
});

test('schematic Pluto starts outside Uranus and can be selected there', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('checkbox', { name: /冥王星/ }).check();
  const canvas = page.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(page.getByText('天体の模様を読み込んでいます…')).toBeHidden();
  const box = (await canvas.boundingBox())!;
  const fit = fitView(box.width, box.height, false, true);
  const point = { x: fit.center.x + 7.5 * fit.scale, y: fit.center.y };
  if (testInfo.project.name === 'mobile') await canvas.tap({ position: point });
  else await canvas.click({ position: point });
  await expect(page.getByLabel('情報を表示する天体')).toHaveValue('pluto');
  await canvas.scrollIntoViewIfNeeded();
  await canvas.screenshot({ path: `test-results/${testInfo.project.name}-pluto.png` });
});

test('real mode renders each inclined J2000 ellipse and keeps selection', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { __orbitTracks: Record<string, number[]> };
    state.__orbitTracks = {};
    const original = CanvasRenderingContext2D.prototype.ellipse;
    CanvasRenderingContext2D.prototype.ellipse = function (...args: Parameters<typeof original>) {
      if (this.lineWidth === 1) state.__orbitTracks[String(this.strokeStyle)] = args.slice(0, 5) as number[];
      return original.apply(this, args);
    };
  });
  await page.goto('/');
  await page.getByRole('checkbox', { name: /冥王星/ }).check();
  await page.getByRole('checkbox', { name: /リアル半径/ }).check();
  await expect(page.getByText('軌道の形・傾き・向きを反映した2D投影です。内側の惑星は拡大してご覧ください。')).toBeVisible();
  const canvas = page.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const fit = fitView(box.width, box.height, true, true);
  const expected = planets.map(p => {
    const ellipse = projectedOrbit(orbitOf(p, true));
    return [fit.center.x + ellipse.center.x * fit.scale, fit.center.y - ellipse.center.y * fit.scale, ellipse.radiusX * fit.scale, ellipse.radiusY * fit.scale, -ellipse.rotation];
  });
  await expect.poll(async () => {
    const actual = await page.evaluate(() => Object.values((window as typeof window & { __orbitTracks: Record<string, number[]> }).__orbitTracks));
    return expected.every(track => actual.some(args => track.every((value, i) => Math.abs(value - args[i]) < 1e-5)));
  }).toBe(true);
  await canvas.screenshot({ path: `test-results/${testInfo.project.name}-real-orbits.png` });
  await page.getByLabel('情報を表示する天体').selectOption('mercury');
  await expect(page.getByRole('link', { name: /NASA\/JPL/ })).toBeVisible();
  await page.getByRole('checkbox', { name: /リアル半径/ }).uncheck();
  await expect(page.getByLabel('情報を表示する天体')).toHaveValue('mercury');
  await expect(page.getByTestId('years')).toHaveText('0.00');
});

test('touch pinch zooms without rotating or clearing selection', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touch input is checked in the mobile project.');
  await page.goto('/');
  await page.getByLabel('情報を表示する天体').selectOption('earth');
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const box = (await page.locator('canvas').boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const client = await context.newCDPSession(page);
  const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', radius: number, angle = 0) => {
    const dx = Math.cos(angle) * radius, dy = Math.sin(angle) * radius;
    await client.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: cx - dx, y: cy - dy, id: 0 }, { x: cx + dx, y: cy + dy, id: 1 }] });
  };
  await touch('touchStart', 30);
  for (let r = 35; r <= 60; r += 5) await touch('touchMove', r);
  await touch('touchEnd', 0);
  await expect(page.getByLabel('ズーム倍率')).toHaveText('2.0×');
  await expect(page.getByLabel('情報を表示する天体')).toHaveValue('earth');
  const before = await page.locator('canvas').screenshot();
  await touch('touchStart', 50);
  for (let i = 1; i <= 6; i++) await touch('touchMove', 50, Math.PI / 2 * i / 6);
  await touch('touchEnd', 0);
  await expect(page.getByLabel('ズーム倍率')).toHaveText('2.0×');
  const after = await page.locator('canvas').screenshot();
  // Fixed orientation is verified visually as well as by the unchanged zoom.
  expect(after.equals(before)).toBe(true);
  await expect(page.getByLabel('情報を表示する天体')).toHaveValue('earth');
  await client.detach();
});
