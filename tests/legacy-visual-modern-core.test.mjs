import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readSrc = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("notes keeps series functionality in the quieter legacy card language", async () => {
  const notes = await readSrc("src/pages/notes/index.astro");
  const cards = await readSrc("src/styles/cards.css");
  const series = await readSrc("src/pages/notes/series/[series].astro");
  const note = await readSrc("src/pages/notes/[...slug].astro");

  assert.match(notes, /buildSeriesList/);
  assert.match(notes, /id="shelf-filters"/);
  assert.doesNotMatch(notes, /shelf-backdrop/);
  assert.doesNotMatch(cards, /shelf-card:hover[\s\S]*?--c-bg:\s*rgb\(var\(--color-primary\)\)/);
  assert.doesNotMatch(series + note, /(?:border|bg|text)-lav/);
});

test("modern architecture and lightweight features survive the visual restoration", async () => {
  const layout = await readSrc("src/layouts/BaseLayout.astro");
  const transitions = await readSrc("src/scripts/transitions.ts");
  const config = await readSrc("src/content/config.ts");
  const note = await readSrc("src/pages/notes/[...slug].astro");
  const series = await readSrc("src/pages/notes/series/[series].astro");

  for (const contract of [
    /ClientRouter/,
    /initTransitions\(\)/,
    /initReveal\(\)/,
    /initCopyCode\(\)/,
    /initLightbox\(\)/,
    /styles\/reference\.css/,
    /\/vendor\/katex\/katex\.min\.css/,
  ]) assert.match(layout, contract);

  assert.doesNotMatch(layout + transitions, /page-transition-overlay|playSection|outroSection/);

  assert.match(config, /series:/);
  assert.match(note, /Up next/);
  assert.match(note, /currentSeriesIdx \+ 1/);
  assert.match(note, /data-astro-prefetch="tap"/);
  assert.match(series, /data-astro-prefetch="viewport"/);

  assert.doesNotMatch(layout, /fonts\.googleapis\.com|cdn\.jsdelivr\.net|gsap|custom-cursor|ambient-orb/);
});
