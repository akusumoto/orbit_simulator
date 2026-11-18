import { preview } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const output = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 4175, strictPort: true } });
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  const externalRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4175/')) externalRequests.push(request.url()); });
  await page.goto('http://127.0.0.1:4175/');
  await page.getByText('天体の模様を読み込んでいます…').waitFor({ state: 'hidden' });
  if (await page.getByText(/画像を読み込めませんでした/).count()) throw new Error('An image failed to load');
  await page.screenshot({ path: join(output, 'desktop.png') });
  await page.getByRole('button', { name: 'スタート', exact: true }).click();
  const frameStats = await page.evaluate(() => new Promise(resolve => {
    const times = [];
    function frame(t) {
      times.push(t);
      if (times.length < 121) requestAnimationFrame(frame);
      else {
        const gaps = times.slice(1).map((value, i) => value - times[i]).sort((a, b) => a - b);
        resolve({ frames: 120, durationMs: times.at(-1) - times[0], fps: 120000 / (times.at(-1) - times[0]), medianFrameMs: gaps[60] });
      }
    }
    requestAnimationFrame(frame);
  }));
  await page.getByRole('button', { name: 'ストップ', exact: true }).click();
  await page.getByLabel('情報を表示する天体').selectOption('earth');
  await page.screenshot({ path: join(output, 'desktop-earth.png') });
  await page.getByRole('checkbox', { name: /冥王星/ }).check();
  await page.getByRole('checkbox', { name: /リアル半径/ }).check();
  await page.getByRole('button', { name: 'リセット', exact: true }).click();
  await page.locator('canvas').screenshot({ path: join(output, 'desktop-real-orbits.png') });
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  await mobile.goto('http://127.0.0.1:4175/');
  await mobile.getByText('天体の模様を読み込んでいます…').waitFor({ state: 'hidden' });
  await mobile.locator('.simulation-panel').screenshot({ path: join(output, 'mobile-canvas.png') });
  await mobile.screenshot({ path: join(output, 'mobile.png'), fullPage: true });
  await mobile.getByRole('checkbox', { name: /冥王星/ }).check();
  await mobile.getByRole('checkbox', { name: /リアル半径/ }).check();
  await mobile.locator('canvas').screenshot({ path: join(output, 'mobile-real-orbits.png') });
  let totalBytes = 0, totalGzipBytes = 0;
  async function size(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) await size(file);
      else { const bytes = await readFile(file); totalBytes += bytes.length; totalGzipBytes += gzipSync(bytes).length; }
    }
  }
  await size(fileURLToPath(new URL('../dist/', import.meta.url)));
  const report = {
    browser: browser.version(), engine: 'Microsoft Edge (headless Chromium)', runtime: 'production dist (Vite preview)', viewport: '1440x1000 DPR1',
    frameStats, productionBytes: totalBytes, productionGzipBytes: totalGzipBytes, pageErrors: errors, externalRequests,
    note: 'Frame measurements are for the local headless desktop browser, not physical phone performance.',
  };
  await writeFile(new URL('../docs/preview-report.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
}
