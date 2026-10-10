import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { transformSync } = createRequire(require.resolve('astro/package.json'))('esbuild');

const source = await readFile(new URL('../src/scripts/transitions.ts', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'ts', format: 'cjs' }).code;
const deferred = () => {
  let resolve;
  const promise = new Promise(done => resolve = done);
  return { promise, resolve };
};

function harness(paperMotion = true) {
  const events = new EventTarget();
  events.querySelector = () => ({});
  const calls = [];
  const covers = [];
  class PaperCover {
    setCenter() {}
    coverImmediately() { calls.push('cover'); }
    transition(visible, duration) {
      calls.push({ visible, duration });
      if (!visible || !paperMotion) return Promise.resolve();
      const pending = deferred();
      covers.push(pending);
      return pending.promise;
    }
  }
  const exports = {};
  const module = { exports };
  vm.runInNewContext(compiled, { module, exports, document: events, queueMicrotask, require: () => ({ PaperCover, usesPaperMotion: () => paperMotion }) });
  module.exports.initTransitions();
  module.exports.initTransitions(); // Repeated page setup must not bind twice.
  const dispatch = (name, fields = {}) => {
    const event = new Event(name, { cancelable: true });
    Object.assign(event, fields);
    events.dispatchEvent(event);
    return event;
  };
  return { calls, covers, dispatch };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('reduced motion only waits for its loader and skips the new article snapshot', async () => {
  const h = harness(false);
  const signal = new AbortController().signal;
  const next = h.dispatch('astro:before-preparation', { signal, loader: async () => {} });
  await next.loader();
  let skipped = 0;
  h.dispatch('astro:before-swap', { signal, viewTransition: { skipTransition() { skipped++; } } });
  h.dispatch('astro:page-load');
  assert.equal(skipped, 1);
  assert.equal(h.covers.length, 0);
});

test('navigation waits for both page loading and paper coverage before the swap', async () => {
  const h = harness();
  const load = deferred();
  const signal = new AbortController().signal;
  const next = h.dispatch('astro:before-preparation', { signal, loader: () => load.promise });
  let complete = false;
  const loading = next.loader().then(() => complete = true);
  assert.deepEqual(h.calls, [{ visible: true, duration: 420 }]);
  load.resolve();
  await flush();
  assert.equal(complete, false);
  h.covers[0].resolve();
  await loading;
  h.dispatch('astro:before-swap', { signal });
  h.dispatch('astro:page-load');
  assert.deepEqual(h.calls.at(-1), { visible: false, duration: 780 });
});

test('a superseding navigation keeps the paper in place until its own page swaps', async () => {
  const h = harness();
  const first = new AbortController();
  h.dispatch('astro:before-preparation', { signal: first.signal, loader: async () => {} }).loader();
  first.abort();
  const second = new AbortController();
  const loading = h.dispatch('astro:before-preparation', { signal: second.signal, loader: async () => {} }).loader();
  await flush();
  h.dispatch('astro:before-swap', { signal: first.signal });
  h.dispatch('astro:page-load');
  assert.equal(h.calls.filter(call => call.visible === false).length, 0);
  h.covers.forEach(cover => cover.resolve());
  await loading;
  h.dispatch('astro:before-swap', { signal: second.signal });
  h.dispatch('astro:page-load');
  assert.deepEqual(h.calls.at(-1), { visible: false, duration: 780 });
});

test('failed loading uncovers the current page and preserves the failure', async () => {
  const h = harness();
  const failure = new Error('failed request');
  const next = h.dispatch('astro:before-preparation', { signal: new AbortController().signal, loader: async () => { throw failure; } });
  await assert.rejects(next.loader(), error => error === failure);
  assert.deepEqual(h.calls.at(-1), { visible: false, duration: 400 });
});

test('cancelled preparation uncovers the current page without requiring a swap', async () => {
  const h = harness();
  const controller = new AbortController();
  const next = h.dispatch('astro:before-preparation', { signal: controller.signal, loader: async () => {} });
  const loading = next.loader();
  controller.abort();
  await flush();
  assert.deepEqual(h.calls.at(-1), { visible: false, duration: 400 });
  h.covers[0].resolve();
  await loading;
});


test('reduced motion uses an immediate cover without starting animation or graphics', async () => {
  const source = await readFile(new URL('../src/scripts/paperCover.ts', import.meta.url), 'utf8');
  const module = { exports: {} };
  const element = {
    style: { opacity: '0' },
    querySelector: () => ({}),
    animate() { throw new Error('Reduced motion must not animate'); },
  };
  vm.runInNewContext(transformSync(source, { loader: 'ts', format: 'cjs' }).code, {
    module,
    exports: module.exports,
    require: () => '',
    innerWidth: 390,
    innerHeight: 844,
    window: { addEventListener() {} },
    document: { addEventListener() {} },
    matchMedia: () => ({ matches: true }),
    getComputedStyle: () => ({ opacity: element.style.opacity }),
    cancelAnimationFrame() {},
    performance: { now: () => 0 },
    Image: class { constructor() { throw new Error('Reduced motion must not load graphics'); } },
  });
  const cover = new module.exports.PaperCover(element);
  await cover.transition(true, 1000);
  assert.equal(element.style.opacity, '1');
  await cover.transition(false, 1800);
  assert.equal(element.style.opacity, '0');
});

test('phone and tablet retain the paper renderer and animated fallback', async () => {
  const source = await readFile(new URL('../src/scripts/paperCover.ts', import.meta.url), 'utf8');
  for (const width of [390, 820]) {
    const module = { exports: {} };
    let textures = 0;
    let animation;
    const element = {
      style: { opacity: '0' }, querySelector: () => ({}),
      animate() { animation = { cancel() {} }; return animation; },
    };
    vm.runInNewContext(transformSync(source, { loader: 'ts', format: 'cjs' }).code, {
      module, exports: module.exports, require: () => '', innerWidth: width, innerHeight: 1180,
      window: { addEventListener() {} }, document: { addEventListener() {} },
      matchMedia: () => ({ matches: false }),
      getComputedStyle: () => ({ opacity: element.style.opacity }),
      cancelAnimationFrame() {}, performance: { now: () => 0 },
      Image: class { constructor() { textures++; } },
    });
    const cover = new module.exports.PaperCover(element);
    assert.equal(textures, 3, 'Touch devices prepare the paper renderer');
    const covering = cover.transition(true, 420);
    assert.ok(animation, 'A loading renderer still supplies a smooth fade');
    animation.onfinish();
    await covering;
    assert.equal(element.style.opacity, '1');
    const uncovering = cover.transition(false, 780);
    animation.onfinish();
    await uncovering;
    assert.equal(element.style.opacity, '0');
  }
});

test('touch navigation retains cover timing and the persisted cover snapshot', async () => {
  const h = harness();
  const signal = new AbortController().signal;
  const next = h.dispatch('astro:before-preparation', { signal, loader: async () => {} });
  let complete = false;
  const loading = next.loader().then(() => complete = true);
  await flush();
  assert.equal(complete, false);
  h.covers[0].resolve();
  await loading;
  let skipped = 0;
  h.dispatch('astro:before-swap', { signal, viewTransition: { skipTransition() { skipped++; } } });
  h.dispatch('astro:page-load');
  assert.equal(skipped, 0);
  assert.deepEqual(h.calls, [{ visible: true, duration: 420 }, { visible: false, duration: 780 }]);
});
