import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("astro prefetch config is conservative for reading-first navigation", async () => {
  const source = await readFile(new URL("../astro.config.mjs", import.meta.url), "utf8");

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
  const source = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

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

test("paper texture is rendered by a fixed background layer instead of scrolling with body content", async () => {
  const source = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

  assert.match(
    source,
    /\.page-background\s*\{/,
    "layout should define a dedicated background layer so the texture does not repaint with article content",
  );

  assert.match(
    source,
    /position:\s*fixed;/,
    "background layer should be fixed to the viewport",
  );

  assert.match(
    source,
    /<div class="page-background" aria-hidden="true"><\/div>/,
    "layout should render the fixed background layer outside the reading flow",
  );

  assert.match(
    source,
    /url\("\/images\/paper-texture\.webp"\)/,
    "background layer should use the site paper texture asset",
  );

  assert.match(
    source,
    /\.page-background::before\s*\{/,
    "paper texture should be rendered on a dedicated pseudo-element so dark mode can tune it independently",
  );

  assert.doesNotMatch(
    source,
    /background-attachment\s*:\s*scroll/,
    "body background should no longer scroll with the page on mobile",
  );
});

test("theme toggle disables transitions while switching themes", async () => {
  const source = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

  assert.match(
    source,
    /\.theme-switching\s+\*,\s*\.theme-switching\s+\*::before,\s*\.theme-switching\s+\*::after\s*\{\s*transition:\s*none\s*!important;/,
    "theme switching should temporarily disable transitions to avoid whole-page animation on mobile",
  );

  assert.match(
    source,
    /classList\.add\('theme-switching'\)/,
    "theme toggle should mark the document as theme-switching before flipping dark mode",
  );

  assert.match(
    source,
    /classList\.remove\('theme-switching'\)/,
    "theme toggle should remove the theme-switching marker after the repaint frame",
  );
});

test("mobile reading paths fall back to system fonts to avoid downloading heavy webfont binaries", async () => {
  const layoutSource = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");
  const tailwindSource = await readFile(new URL("../tailwind.config.mjs", import.meta.url), "utf8");

  assert.match(
    layoutSource,
    /@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?\.font-display,\s*\.font-body\s*\{[\s\S]*?font-family:\s*Georgia,\s*"Times New Roman",\s*serif\s*!important;/,
    "mobile layouts should override decorative serif stacks with local system serif fonts",
  );

  assert.match(
    layoutSource,
    /\.font-sans\s*\{[\s\S]*?font-family:\s*system-ui,\s*-apple-system,\s*BlinkMacSystemFont,\s*"Segoe UI",\s*sans-serif\s*!important;/,
    "mobile layouts should use the system sans stack instead of downloading Inter",
  );

  assert.match(
    layoutSource,
    /\.font-mono\s*\{[\s\S]*?font-family:\s*ui-monospace,\s*"SFMono-Regular",\s*Menlo,\s*monospace\s*!important;/,
    "mobile layouts should use the local monospace stack instead of downloading JetBrains Mono",
  );

  assert.match(
    tailwindSource,
    /sans:\s*\[\s*'system-ui',\s*'-apple-system',\s*'BlinkMacSystemFont',\s*'"Segoe UI"',\s*'sans-serif'\s*\]/,
    "desktop and mobile sans text should default to the system sans stack so Inter is no longer required",
  );
});

test("base layout only loads katex when a page opts in", async () => {
  const source = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

  assert.match(
    source,
    /needsKatex\??:\s*boolean/,
    "base layout should expose an explicit needsKatex prop",
  );

  assert.match(
    source,
    /{needsKatex && \(/,
    "KaTeX stylesheet should be conditionally rendered",
  );
});

test("math-heavy detail pages opt in to katex explicitly", async () => {
  const noteSource = await readFile(new URL("../src/pages/notes/[...slug].astro", import.meta.url), "utf8");
  const blogSource = await readFile(new URL("../src/pages/blog/[...slug].astro", import.meta.url), "utf8");

  assert.match(noteSource, /<BaseLayout title={post\.data\.title} needsKatex>/);
  assert.match(blogSource, /<BaseLayout title={post\.data\.title} needsKatex>/);
});

test("base layout no longer injects a redundant custom link prefetch script", async () => {
  const source = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

  assert.doesNotMatch(
    source,
    /l\.rel="prefetch"/,
    "same-origin link prefetch should be handled conservatively by Astro config rather than a global custom script",
  );
});

test("base layout enables client-side navigation without visible page transition animations", async () => {
  const source = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

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

  assert.match(
    source,
    /<html[^>]*transition:animate="none"[^>]*>/,
    "layout should disable visible page transition animations while keeping client-side navigation",
  );

  assert.doesNotMatch(
    source,
    /transition:name|::view-transition-/,
    "layout should not reintroduce named snapshot transitions that can ghost long-form reading pages",
  );
});

test("global interactive scripts reinitialize after Astro route transitions", async () => {
  const layoutSource = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");
  const searchSource = await readFile(new URL("../src/components/Search.astro", import.meta.url), "utf8");
  const previewSource = await readFile(new URL("../src/components/LinkPreview.astro", import.meta.url), "utf8");
  const giscusSource = await readFile(new URL("../src/components/Giscus.astro", import.meta.url), "utf8");
  const notesIndexSource = await readFile(new URL("../src/pages/notes/index.astro", import.meta.url), "utf8");
  const notesDetailSource = await readFile(new URL("../src/pages/notes/[...slug].astro", import.meta.url), "utf8");

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
  const notesIndexSource = await readFile(new URL("../src/pages/notes/index.astro", import.meta.url), "utf8");
  const notesDetailSource = await readFile(new URL("../src/pages/notes/[...slug].astro", import.meta.url), "utf8");

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
  const notesDetailSource = await readFile(new URL("../src/pages/notes/[...slug].astro", import.meta.url), "utf8");

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
