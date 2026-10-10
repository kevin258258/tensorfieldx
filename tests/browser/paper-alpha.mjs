/**
 * Browser regression for WebKit bug 200026 (Apple's unpremultiplied canvas
 * compositing). Run with a Playwright browser supplied by the test runner:
 *   await verifyPaperAlpha(browser, 'http://127.0.0.1:4325');
 * Or run `npm run test:browser:alpha` against a running preview. Playwright
 * must be available; PLAYWRIGHT_MODULE can point to an existing installation.
 * This uses the actual cover renderer and shader, then both real navigation
 * paths. It injects only the documented premultiplied compositor behavior.
 */
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('astro/package.json'))('esbuild');

async function brightness(page) {
  const { width, height } = page.viewportSize();
  const { data, info } = await sharp(await page.screenshot())
    .extract({ left: 20, top: 70, width: width - 40, height: height - 154 })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const luminance = [];
  for (let i = 0; i < data.length; i += info.channels) {
    luminance.push(data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722);
  }
  luminance.sort((a, b) => a - b);
  return luminance[Math.floor(luminance.length * .9)];
}

async function sampleTransition(page, trigger) {
  const before = await brightness(page);
  const action = trigger();
  let peak = before;
  for (let i = 0; i < 14; i++) peak = Math.max(peak, await brightness(page));
  await action;
  await page.waitForFunction(() => [...document.querySelectorAll('[data-paper-cover]')]
    .every(element => getComputedStyle(element).opacity === '0'));
  const after = await brightness(page);
  assert(peak <= Math.max(before, after) + 5,
    `Paper transition flashes: peak ${peak.toFixed(1)}, steady ${Math.max(before, after).toFixed(1)}`);
  return { before, after, peak };
}

export async function verifyPaperAlpha(browser, baseURL) {
  const bundle = await build({
    entryPoints: [new URL('../../src/scripts/paperCover.ts', import.meta.url).pathname],
    bundle: true, write: false, format: 'iife', globalName: 'CoverFixture',
    loader: { '.frag': 'text', '.vert': 'text' },
  });
  // Exercise the retained desktop renderer at phone-sized canvas dimensions.
  // Touch devices now bypass the graphics cover entirely.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: false });
  try {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, options, ...rest) {
        return getContext.call(this, type,
          type === 'webgl' ? { ...options, premultipliedAlpha: true } : options, ...rest);
      };
    });
    await page.goto(`${baseURL}/blog`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-paper-cover].is-webgl', { state: 'attached' });
    // Minimized case: only the actual cover animation, without Astro navigation
    // or native view-transition snapshots.
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.evaluate(() => {
      const element = document.createElement('div');
      element.className = 'paper-cover';
      element.dataset.paperCover = '';
      element.dataset.alphaFixture = '';
      element.innerHTML = '<canvas></canvas>';
      document.body.append(element);
      window.alphaCover = new CoverFixture.PaperCover(element);
    });
    await page.waitForSelector('[data-alpha-fixture].is-webgl', { state: 'attached' });
    const minimized = await sampleTransition(page, () => page.evaluate(async () => {
      await window.alphaCover.transition(true, 420);
      await window.alphaCover.transition(false, 780);
    }));
    await page.evaluate(() => document.querySelector('[data-alpha-fixture]').remove());
    const navigation = await sampleTransition(page, () => page.locator('.nav-page[href="/projects"]').click());
    await page.goto(`${baseURL}/blog/transformer-token-association`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-paper-cover].is-webgl', { state: 'attached' });
    const language = await sampleTransition(page, () => page.locator('.reader-topline [data-language-alternate]').click());
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    return { minimized, navigation, language };
  } finally { await page.close(); }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const { webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await webkit.launch();
  try {
    console.log(await verifyPaperAlpha(browser, process.env.TEST_ORIGIN || 'http://127.0.0.1:4325'));
  } finally { await browser.close(); }
}
