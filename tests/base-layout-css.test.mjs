import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readSrc = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("astro prefetch config is conservative for reading-first navigation", async () => {
  const source = await readSrc("astro.config.mjs");

  assert.doesNotMatch(
    source,
    /prefetchAll:\s*true/,
    "global prefetch-all should be disabled to avoid competing with reading-path resources",
  );

  assert.match(
    source,
    /defaultStrategy:\s*['"]hover['"]/,
    "route prefetch should default to hover to reduce mobile bandwidth contention",
  );
});

test("long-form content avoids viewport virtualization that can unload note sections mid-scroll", async () => {
  const source = await readSrc("src/layouts/BaseLayout.astro");

  assert.doesNotMatch(
    source,
    /content-visibility\s*:\s*auto/,
    "reading pages should not use content-visibility virtualization because it causes sections to disappear and repaint during long mobile scrolls",
  );

  assert.doesNotMatch(
    source,
    /contain-intrinsic-size\s*:/,
    "reading pages should not reserve virtualized placeholder sizes once viewport virtualization is removed",
  );
});

test("page background is a fixed flat-color layer driven by design tokens", async () => {
  const tokens = await readSrc("src/styles/tokens.css");
  const layout = await readSrc("src/layouts/BaseLayout.astro");

  assert.match(
    tokens,
    /\.page-background\s*\{[\s\S]*?position:\s*fixed;/,
    "background layer should be fixed to the viewport so it does not repaint with article content",
  );

  assert.match(
    tokens,
    /\.page-background\s*\{[\s\S]*?background:\s*rgb\(var\(--color-paper\)\)/,
    "background layer should use the paper design token (flat cool white, no texture)",
  );

  assert.doesNotMatch(
    tokens + layout,
    /paper-texture/,
    "paper texture asset was removed with the warm-paper design language",
  );

  assert.match(
    layout,
    /<div class="page-background" aria-hidden="true"><\/div>/,
    "layout should render the fixed background layer outside the reading flow",
  );
});

test("dark mode and theme switching are fully removed (light-first redesign)", async () => {
  const layout = await readSrc("src/layouts/BaseLayout.astro");
  const nav = await readSrc("src/components/chrome/SiteNav.astro");

  assert.doesNotMatch(
    layout + nav,
    /theme-toggle|localStorage\.getItem\(['"]theme['"]\)|classList\.toggle\(['"]dark['"]/,
    "no theme toggle or dark-class logic should remain after the light-first redesign",
  );
});

test("typography does not force system-font fallbacks on mobile", async () => {
  const layoutSource = await readSrc("src/layouts/BaseLayout.astro");
  const tailwindSource = await readSrc("tailwind.config.mjs");

  assert.doesNotMatch(
    layoutSource,
    /@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?Georgia,\s*"Times New Roman",\s*serif\s*!important/,
    "mobile layouts should keep the self-hosted font stacks instead of forcing Georgia",
  );

  assert.match(
    tailwindSource,
    /sans:\s*\[\s*'system-ui',\s*'-apple-system',\s*'BlinkMacSystemFont',\s*'"Segoe UI"',\s*'sans-serif'\s*\]/,
    "sans text should default to the system sans stack",
  );
});

test("fonts are self-hosted via fontsource, not Google Fonts", async () => {
  const layout = await readSrc("src/layouts/BaseLayout.astro");

  assert.doesNotMatch(
    layout,
    /fonts\.googleapis\.com|fonts\.gstatic\.com/,
    "webfonts should be self-hosted through @fontsource packages",
  );

  assert.match(
    layout,
    /@fontsource\/playfair-display/,
    "display font should be self-hosted",
  );
});

test("base layout only loads katex when a page opts in", async () => {
  const source = await readSrc("src/layouts/BaseLayout.astro");

  assert.match(
    source,
    /needsKatex\??:\s*boolean/,
    "base layout should expose an explicit needsKatex prop",
  );

  assert.match(
    source,
    /\{needsKatex && \(/,
    "KaTeX stylesheet should be conditionally rendered",
  );
});

test("math-heavy detail pages opt in to katex explicitly", async () => {
  const noteSource = await readSrc("src/pages/notes/[...slug].astro");
  const blogSource = await readSrc("src/pages/blog/[...slug].astro");

  assert.match(noteSource, /<BaseLayout title={post\.data\.title} needsKatex>/);
  assert.match(blogSource, /<BaseLayout title={post\.data\.title} needsKatex>/);
});

test("base layout no longer injects a redundant custom link prefetch script", async () => {
  const source = await readSrc("src/layouts/BaseLayout.astro");

  assert.doesNotMatch(
    source,
    /l\.rel="prefetch"/,
    "same-origin link prefetch should be handled conservatively by Astro config rather than a global custom script",
  );
});

test("base layout enables client-side navigation", async () => {
  const source = await readSrc("src/layouts/BaseLayout.astro");

  assert.match(
    source,
    /import\s*\{\s*ClientRouter\s*\}\s*from\s*["']astro:transitions["']/,
    "layout should enable Astro client-side navigation so note entries do not trigger full document reloads",
  );

  assert.match(
    source,
    /<ClientRouter\s+fallback="swap"\s*\/>/,
    "client router should use swap fallback to keep navigation predictable on unsupported browsers",
  );
});

test("legacy decorative effects are removed from layout and pages", async () => {
  const layout = await readSrc("src/layouts/BaseLayout.astro");
  const home = await readSrc("src/pages/index.astro");
  const notesIndex = await readSrc("src/pages/notes/index.astro");

  assert.doesNotMatch(
    layout + home + notesIndex,
    /gsap|ScrollTrigger|custom-cursor|ambient-orb|hero-particles|init3DTilt|KnowledgeGraph/,
    "GSAP, custom cursor, ambient orbs, hero particles, 3D tilt and the knowledge graph were removed in the redesign",
  );
});

test("react island dependencies are gone from package.json", async () => {
  const pkg = JSON.parse(await readSrc("package.json"));
  const deps = Object.keys(pkg.dependencies ?? {});

  for (const removed of [
    "gsap",
    "react",
    "react-dom",
    "@astrojs/react",
    "framer-motion",
    "lucide-react",
    "react-force-graph-2d",
  ]) {
    assert.ok(!deps.includes(removed), `${removed} should no longer be a dependency`);
  }
});

test("design tokens define the lavender auxiliary color", async () => {
  const tokens = await readSrc("src/styles/tokens.css");

  assert.match(
    tokens,
    /--color-lav:\s*201 193 240;/,
    "tokens.css should define --color-lav (#C9C1F0) as the lavender auxiliary token",
  );
});

test("transition overlay is persistent and wired to the engine", async () => {
  const layout = await readSrc("src/layouts/BaseLayout.astro");

  assert.match(
    layout,
    /id="page-transition-overlay"\s+transition:persist/,
    "the transition overlay must survive client-side swaps via transition:persist",
  );

  assert.match(
    layout,
    /initTransitions\(\)/,
    "layout should initialize the transition engine",
  );
});

test("links declare their transition tier at render time", async () => {
  const nav = await readSrc("src/components/chrome/SiteNav.astro");
  const notesDetail = await readSrc("src/pages/notes/[...slug].astro");
  const notesIndex = await readSrc("src/pages/notes/index.astro");

  assert.match(
    nav,
    /data-transition="section"/,
    "top-level nav links should request the L2 section show",
  );

  assert.match(
    notesDetail,
    /data-transition="series" data-dir="prev"/,
    "prev-in-series link should request L0 with direction",
  );

  assert.match(
    notesDetail,
    /data-article-title/,
    "article title should be marked as the L1 fly target",
  );

  assert.match(
    notesIndex,
    /data-transition="enter"/,
    "list rows should request the L1 title-fly transition",
  );
});

test("global interactive scripts reinitialize after Astro route transitions", async () => {
  const layoutSource = await readSrc("src/layouts/BaseLayout.astro");
  const searchSource = await readSrc("src/components/Search.astro");
  const previewSource = await readSrc("src/components/LinkPreview.astro");
  const giscusSource = await readSrc("src/components/Giscus.astro");
  const notesIndexSource = await readSrc("src/pages/notes/index.astro");
  const notesDetailSource = await readSrc("src/pages/notes/[...slug].astro");

  assert.match(
    layoutSource,
    /document\.addEventListener\(['"]astro:page-load['"],\s*setupPageUi\)/,
    "layout controls should re-bind after client-side navigation",
  );

  assert.match(
    searchSource,
    /document\.addEventListener\(['"]astro:page-load['"],\s*initSearchSystem\)/,
    "search modal should re-bind after client-side navigation",
  );

  assert.match(
    previewSource,
    /document\.addEventListener\(['"]astro:page-load['"],\s*initLinkPreviews\)/,
    "link previews should re-bind after client-side navigation",
  );

  assert.match(
    notesIndexSource,
    /document\.addEventListener\(['"]astro:page-load['"],\s*initNotesPage\)/,
    "notes index controls should re-bind after client-side navigation",
  );

  assert.match(
    notesDetailSource,
    /document\.addEventListener\(['"]astro:page-load['"],\s*setupNotesDetailPage\)/,
    "notes detail interactions should re-bind after client-side navigation",
  );

  assert.match(
    giscusSource,
    /document\.addEventListener\(['"]astro:page-load['"],\s*setupGiscus\)/,
    "comments should initialize again after client-side navigation reaches a note page",
  );

  assert.doesNotMatch(
    previewSource,
    /DOMContentLoaded/,
    "link previews should not depend on full document reloads once route transitions are enabled",
  );
});

test("note navigation links opt into mobile-friendly prefetching", async () => {
  const notesIndexSource = await readSrc("src/pages/notes/index.astro");
  const notesDetailSource = await readSrc("src/pages/notes/[...slug].astro");

  assert.match(
    notesIndexSource,
    /data-astro-prefetch="viewport"/,
    "note list entries should prefetch when links enter the viewport to reduce tap-to-open latency on mobile",
  );

  assert.match(
    notesDetailSource,
    /data-astro-prefetch="tap"/,
    "prev\/next note links should prefetch on tap to shorten navigation between heavy note pages",
  );
});

test("mobile note table of contents renders on demand instead of duplicating heading markup on first paint", async () => {
  const notesDetailSource = await readSrc("src/pages/notes/[...slug].astro");

  assert.match(
    notesDetailSource,
    /data-headings={mobileHeadingsJson}/,
    "mobile TOC panel should carry serialized heading data for lazy rendering",
  );

  assert.match(
    notesDetailSource,
    /if\s*\(panel\.dataset\.tocRendered\s*===\s*'true'\)\s*return;/,
    "mobile TOC renderer should only materialize the link list once",
  );

  assert.match(
    notesDetailSource,
    /const headings = JSON\.parse\(panel\.dataset\.headings \|\| '\[\]'\)/,
    "mobile TOC links should be created from serialized heading data on demand",
  );
});
