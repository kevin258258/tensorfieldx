/** Production-build interaction budget, not a network speed benchmark.
 * Run against a local preview with TEST_ORIGIN and PLAYWRIGHT_MODULE.
 * --measure prints the baseline without asserting the interaction budget.
 */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const { webkit, chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.TEST_ENGINE === 'chromium' ? chromium : webkit;
const browser = await engine.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE });
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:4327';
const measurements = [];
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }]) {
    const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true });
    // The same locally served pages, with third-party timing removed from the loop.
    await page.route(/https:\/\/(?:giscus\.app|va\.vercel-scripts\.com)\//, route => route.abort());
    const cdp = engine === chromium ? await page.context().newCDPSession(page) : null;
    if (cdp) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable'); }
    await page.addInitScript(() => {
      const stats = window.interactionStats = { clicked: 0, frames: [], draws: 0, graphics: 0, snapshots: 0, modal: 0, focus: 0, layoutReads: 0 };
      const show = HTMLDialogElement.prototype.showModal;
      HTMLDialogElement.prototype.showModal = function(...args) { const start = performance.now(); const result = show.apply(this, args); stats.modal = performance.now() - start; return result; };
      const focus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function(...args) { const start = performance.now(); const result = focus.apply(this, args); stats.focus += performance.now() - start; return result; };
      const rect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function(...args) {
        const start = performance.now(); const result = rect.apply(this, args); stats.layoutReads += performance.now() - start; return result;
      };
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        if (type === 'webgl') stats.graphics++;
        return getContext.call(this, type, ...args);
      };
      const draw = WebGLRenderingContext.prototype.drawArrays;
      WebGLRenderingContext.prototype.drawArrays = function(...args) { stats.draws++; return draw.apply(this, args); };
      if (document.startViewTransition) {
        const start = document.startViewTransition.bind(document);
        document.startViewTransition = (...args) => { stats.snapshots++; return start(...args); };
      }
      document.addEventListener('click', () => { stats.clicked = performance.now(); stats.frames = []; stats.draws = 0; stats.layoutReads = stats.modal = stats.focus = 0; }, true);
      let previous = performance.now();
      function frame(now) { stats.frames.push(now - previous); previous = now; requestAnimationFrame(frame); }
      requestAnimationFrame(frame);
    });
    await page.goto(`${origin}/blog`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-paper-cover]')).opacity === '0');
    await page.locator('[data-shelf-entry="0"]').click();
    await page.waitForURL('**/blog/transformer-token-association');
    await page.waitForFunction(() => {
      const header = document.querySelector('.reader-header');
      const cover = document.querySelector('[data-paper-cover]');
      return header && getComputedStyle(header).opacity === '1' && getComputedStyle(cover).opacity === '0';
    });
    const navigation = await page.evaluate(() => ({ ms: performance.now() - interactionStats.clicked, draws: interactionStats.draws, snapshots: interactionStats.snapshots, worstFrame: Math.max(...interactionStats.frames), layoutReads: interactionStats.layoutReads }));
    const beforeSearch = cdp ? await cdp.send('Performance.getMetrics') : null;
    await page.locator('[data-search-trigger]').first().click();
    await page.waitForFunction(() => {
      const modal = document.querySelector('#search-modal');
      return modal.open && getComputedStyle(modal).opacity === '1' && document.activeElement?.id === 'search-input';
    });
    const search = await page.evaluate(() => ({ ms: performance.now() - interactionStats.clicked, worstFrame: Math.max(...interactionStats.frames), backdrop: getComputedStyle(document.querySelector('#search-modal'), '::backdrop').backdropFilter, modal: interactionStats.modal, focus: interactionStats.focus, layoutReads: interactionStats.layoutReads }));
    if (cdp) {
      const after = (await cdp.send('Performance.getMetrics')).metrics;
      search.render = Object.fromEntries(after.filter(metric => /Duration|Count|Nodes/.test(metric.name)).map(metric => [metric.name, metric.value - (beforeSearch.metrics.find(previous => previous.name === metric.name)?.value || 0)]));
    }
    await page.locator('#search-input').fill('Transformer');
    await page.waitForSelector('#search-results a');
    const effects = await page.evaluate(() => ({ grain: getComputedStyle(document.body, '::after').animationName, graphics: interactionStats.graphics, nodes: document.querySelectorAll('.reading-prose *').length, contentVisibility: getComputedStyle(document.querySelector('.reading-prose > *')).contentVisibility }));
    assert(await page.locator('.katex-html').count() > 0, 'Visible formulas remain rendered');
    assert(await page.locator('.katex-mathml math').count() > 0, 'Accessible formulas remain available');
    await page.locator('[data-search-close]').click();
    const otherSearch = {};
    for (const path of ['/', '/blog']) {
      await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      await page.locator('[data-search-trigger]').first().click();
      await page.waitForFunction(() => {
        const modal = document.querySelector('#search-modal');
        return modal.open && getComputedStyle(modal).opacity === '1' && document.activeElement?.id === 'search-input';
      });
      otherSearch[path] = await page.evaluate(() => performance.now() - interactionStats.clicked);
      await page.locator('#search-input').fill('Transformer');
      await page.waitForSelector('#search-results a');
      await page.locator('[data-search-close]').click();
      await page.waitForFunction(() => !document.querySelector('#search-modal').open);
    }
    measurements.push({ engine: process.env.TEST_ENGINE || 'webkit', width: viewport.width, navigation, search, effects, otherSearch });
    await page.close();
  }
  console.log(JSON.stringify(measurements, null, 2));
  if (process.env.PERF_REPORT) await writeFile(process.env.PERF_REPORT, JSON.stringify(measurements, null, 2));
  if (!process.argv.includes('--measure')) {
    for (const sample of measurements) {
      // Software WebKit and deliberately throttled Chromium have separate budgets.
      // Includes the deliberately restored 420ms cover + 780ms reveal.
      // Budgets still catch the original slow article rendering.
      const navigationBudget = sample.engine === 'chromium' ? 4000 : 3200;
      assert(sample.navigation.ms < navigationBudget, `${sample.width}px article remains obscured for ${sample.navigation.ms.toFixed()}ms`);
      assert(sample.search.ms < 450, `${sample.width}px search takes ${sample.search.ms.toFixed()}ms to settle`);
      for (const [path, ms] of Object.entries(sample.otherSearch)) {
        assert(ms < 450, `${sample.width}px search on ${path} takes ${ms.toFixed()}ms`);
      }
      assert.equal(sample.effects.graphics, 1, 'Touch navigation retains one persisted paper renderer');
      assert(sample.navigation.draws > 0, 'Touch navigation must draw the paper transition');
      assert.equal(sample.effects.grain, 'none', 'Touch grain must not continuously repaint');
      assert.equal(sample.search.backdrop, 'none', 'Touch search must not blur the long article');
    }
  }
} finally { await browser.close(); }
