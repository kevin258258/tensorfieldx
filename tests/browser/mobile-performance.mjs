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
  for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1280, height: 744 }]) {
    const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true });
    // The same locally served pages, with third-party timing removed from the loop.
    await page.route(/https:\/\/(?:giscus\.app|va\.vercel-scripts\.com)\//, route => route.abort());
    const cdp = engine === chromium ? await page.context().newCDPSession(page) : null;
    if (cdp) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable'); }
    await page.addInitScript(() => {
      const stats = window.interactionStats = { clicked: 0, frames: [], draws: 0, graphics: 0, activeGraphics: 0, snapshots: 0, modal: 0, focus: 0, layoutReads: 0 };
      const show = HTMLDialogElement.prototype.showModal;
      HTMLDialogElement.prototype.showModal = function(...args) { const start = performance.now(); const result = show.apply(this, args); stats.modal = performance.now() - start; return result; };
      const focus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function(...args) { const start = performance.now(); const result = focus.apply(this, args); stats.focus += performance.now() - start; return result; };
      const rect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function(...args) {
        const start = performance.now(); const result = rect.apply(this, args); stats.layoutReads += performance.now() - start; return result;
      };
      const getContext = HTMLCanvasElement.prototype.getContext;
      const contexts = new WeakSet();
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        const context = getContext.call(this, type, ...args);
        if (type === 'webgl' && context && !contexts.has(context)) {
          contexts.add(context); stats.graphics++; stats.activeGraphics++;
          let active = true;
          const extension = context.getExtension.bind(context);
          context.getExtension = name => {
            const result = extension(name);
            if (name === 'WEBGL_lose_context' && result && !result.tracked) {
              const lose = result.loseContext.bind(result);
              result.tracked = true;
              result.loseContext = () => {
                if (active) { active = false; stats.activeGraphics--; }
                lose();
              };
            }
            return result;
          };
        }
        return context;
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
    assert.equal(await page.locator('[data-entry-shelf] canvas').count(), 0, 'Listing previews do not allocate a canvas');
    await page.locator('.blog-shelf-sheet:visible').first().waitFor();
    const settleCover = () => page.waitForFunction(() => {
      const sheet = document.querySelector(matchMedia('(min-width: 800px)').matches
        ? '.blog-shelf-preview .blog-shelf-sheet'
        : '[data-preview-active="true"] .blog-shelf-sheet');
      return sheet && !sheet.getAnimations({ subtree: true }).length;
    });
    if (viewport.width >= 800) {
      await page.locator('.blog-shelf-list').evaluate(list => {
        const item = list.querySelector('[data-shelf-entry="1"]');
        const box = item.getBoundingClientRect();
        list.scrollTop += box.top - list.getBoundingClientRect().top + (box.height - list.clientHeight) / 2;
      });
      await page.waitForFunction(() => document.querySelector('[data-shelf-preview-index]').textContent.startsWith('02'));
      await settleCover();
      await page.locator('.blog-shelf-list').evaluate(list => { list.scrollTop = 0; });
      await page.waitForFunction(() => document.querySelector('[data-shelf-preview-index]').textContent.startsWith('01'));
      await settleCover();
    } else {
      const contexts = await page.evaluate(() => interactionStats.graphics);
      await page.locator('[data-shelf-entry="1"]').focus();
      await page.waitForSelector('[data-shelf-entry="1"][data-preview-active="true"]');
      await settleCover();
      assert.equal(await page.evaluate(() => interactionStats.graphics), contexts, 'Selecting covers never creates graphics contexts');
      await page.locator('[data-shelf-entry="0"]').focus();
      await page.waitForSelector('[data-shelf-entry="0"][data-preview-active="true"]');
      await settleCover();
      const cover = page.locator('[data-shelf-mobile-paper="0"]');
      assert.equal(await cover.evaluate(frame => getComputedStyle(frame).touchAction), 'pan-y', 'Paper interaction preserves native vertical scrolling');
      await cover.evaluate(frame => {
        const rect = frame.getBoundingClientRect();
        const start = { pointerType:'touch', pointerId:1, bubbles:true, clientX:rect.left + rect.width * .5, clientY:rect.top + rect.height * .5 };
        frame.dispatchEvent(new PointerEvent('pointerdown', start));
        frame.dispatchEvent(new PointerEvent('pointermove', { ...start, clientX:rect.left + rect.width * .9 }));
      });
      await page.waitForFunction(() => {
        const sheet = document.querySelector('[data-shelf-mobile-paper="0"] .blog-shelf-sheet');
        return new DOMMatrix(getComputedStyle(sheet).transform).m41 < -5;
      });
      assert.equal(await cover.evaluate(frame => {
        frame.dispatchEvent(new PointerEvent('pointerup', { pointerType:'touch', bubbles:true }));
        return frame.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
      }), false, 'Dragging paper must not accidentally open the article');
      await settleCover();
      const offset = await cover.locator('.blog-shelf-sheet').evaluate(sheet => new DOMMatrix(getComputedStyle(sheet).transform).m41);
      assert(Math.abs(offset) < 1, 'The print settles back to its resting position');
    }
    await page.locator('[data-shelf-entry][href$="/blog/transformer-token-association"]').click();
    await page.waitForURL('**/blog/transformer-token-association');
    await page.waitForFunction(() => {
      const header = document.querySelector('.reader-header');
      const cover = document.querySelector('[data-paper-cover]');
      return header && getComputedStyle(header).opacity === '1' && getComputedStyle(cover).opacity === '0';
    });
    const navigation = await page.evaluate(() => ({ ms: performance.now() - interactionStats.clicked, draws: interactionStats.draws, snapshots: interactionStats.snapshots, worstFrame: Math.max(...interactionStats.frames), layoutReads: interactionStats.layoutReads }));
    const beforeSearch = cdp ? await cdp.send('Performance.getMetrics') : null;
    await page.locator('[data-search-trigger]:visible').first().click();
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
    const effects = await page.evaluate(() => ({ grain: getComputedStyle(document.body, '::after').animationName, graphics: interactionStats.graphics, activeGraphics: interactionStats.activeGraphics, nodes: document.querySelectorAll('.reading-prose *').length, contentVisibility: getComputedStyle(document.querySelector('.reading-prose > *')).contentVisibility }));
    assert(await page.locator('.katex-html').count() > 0, 'Visible formulas remain rendered');
    assert(await page.locator('.katex-mathml math').count() > 0, 'Accessible formulas remain available');
    await page.locator('[data-search-close]').click();
    const otherSearch = {};
    for (const path of ['/', '/blog', '/archive']) {
      await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      await page.locator('[data-search-trigger]:visible').first().click();
      await page.waitForFunction(() => {
        const modal = document.querySelector('#search-modal');
        return modal.open && getComputedStyle(modal).opacity === '1' && document.activeElement?.id === 'search-input';
      });
      otherSearch[path] = await page.evaluate(() => performance.now() - interactionStats.clicked);
      await page.locator('#search-input').fill('Transformer');
      await page.waitForSelector('#search-results a');
      await page.locator('[data-search-close]').click();
      await page.waitForFunction(() => !document.querySelector('#search-modal').open);
      if (path === '/archive') {
        const total = await page.locator('[data-shelf-entry]:visible').count();
        await page.locator('[data-shelf-filter="Projects"]').click();
        await page.waitForFunction(() => document.querySelector('[data-shelf-count]').textContent === '1 entry');
        await settleCover();
        assert.equal(await page.locator('[data-shelf-entry]:visible').count(), 1);
        assert.equal(await page.locator('[data-shelf-entry][data-shelf-lead]:visible').getAttribute('data-shelf-entry'), await page.locator('[data-shelf-entry]:visible').getAttribute('data-shelf-entry'));
        assert.equal(await page.locator('[data-shelf-preview-index]').textContent(), '01 / 01');
        assert.match(await page.locator('[data-shelf-preview-link]').getAttribute('href'), /github\.com/);
        await page.locator('[data-shelf-filter="All"]').click();
        assert.equal(await page.locator('[data-shelf-entry]:visible').count(), total);
        assert.equal(await page.locator('.blog-shelf-preview .blog-shelf-visual.is-active').count(), 1);
      }
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
      assert.equal(sample.effects.activeGraphics, 1, 'After leaving the shelf only the persisted page transition renderer remains');
      assert(sample.navigation.draws > 0, 'Touch navigation must draw the paper transition');
      assert.equal(sample.effects.grain, 'none', 'Touch grain must not continuously repaint');
      assert.equal(sample.search.backdrop, 'none', 'Touch search must not blur the long article');
    }
  }
} finally { await browser.close(); }
