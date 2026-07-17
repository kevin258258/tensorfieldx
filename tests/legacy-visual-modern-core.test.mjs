import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readSrc = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("global skin restores the warm paper visual reference", async () => {
  const tokens = await readSrc("src/styles/tokens.css");

  assert.match(tokens, /--color-paper:\s*244 241 236/);
  assert.match(tokens, /--color-surface:\s*255 254 249/);
  assert.match(tokens, /--color-primary:\s*26 26 26/);
  assert.match(tokens, /--color-accent-warm:\s*200 90 58/);
  assert.match(tokens, /paper-texture\.webp/);
  assert.match(tokens, /\.dark\s*\{/);
});

test("navigation restores theme switching without restoring the obsolete bottom control", async () => {
  const layout = await readSrc("src/layouts/BaseLayout.astro");
  const nav = await readSrc("src/components/chrome/SiteNav.astro");

  assert.match(layout, /localStorage\.getItem\(['"]theme['"]\)/);
  assert.match(layout, /astro:before-swap/);
  assert.match(layout, /newDocument\.documentElement/);
  assert.doesNotMatch(layout, /data-astro-rerun/);
  assert.match(nav, /id="theme-toggle"/);
  assert.match(nav, /localStorage\.setItem\(['"]theme['"]/);
  assert.match(nav, /setAttribute\(['"]aria-pressed['"]/);
  assert.doesNotMatch(layout + nav, /back-to-top|bindBackToTop|syncBackToTopVisibility/);
});

test("home returns to the quiet image-led identity composition", async () => {
  const home = await readSrc("src/pages/index.astro");

  assert.match(home, /src="\/images\/hero\.webp"/);
  assert.match(home, /Tensor<span[^>]*>Field<\/span>X/);
  assert.match(home, /Feixiang Tao/);
  assert.match(home, /recentNotes/);
  assert.match(home, /recentPosts/);
  assert.doesNotMatch(home, /home-hero__grid|frame-reticle|LATEST TRANSMISSIONS|OPERATOR \/ PROFILE/);
  assert.doesNotMatch(home, /hover:bg-accent\/3/);
  assert.match(home, /motion-safe:animate-bounce/);
});

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
    /@fontsource\/playfair-display/,
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
