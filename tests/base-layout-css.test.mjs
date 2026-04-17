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

test("base layout avoids client-router page snapshots and uses load-time page reveal instead", async () => {
  const source = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

  assert.doesNotMatch(
    source,
    /astro:transitions|ClientRouter|transition:animate|transition:name|::view-transition-/,
    "layout should not use client-router snapshot transitions once they are shown to cause ghosting",
  );

  assert.match(
    source,
    /@keyframes\s+page-enter/,
    "layout should define a lightweight page enter animation instead",
  );

  assert.match(
    source,
    /\.page-shell\s*\{\s*animation:\s*page-enter\s+180ms\s+cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/,
    "main page shell should use a short eased reveal animation",
  );
});

test("global interactive scripts reinitialize after Astro route transitions", async () => {
  const layoutSource = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");
  const searchSource = await readFile(new URL("../src/components/Search.astro", import.meta.url), "utf8");
  const previewSource = await readFile(new URL("../src/components/LinkPreview.astro", import.meta.url), "utf8");
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

  assert.doesNotMatch(
    previewSource,
    /DOMContentLoaded/,
    "link previews should not depend on full document reloads once route transitions are enabled",
  );
});

test("page reveal animation still respects reduced motion without route snapshots", async () => {
  const source = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

  assert.match(
    source,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.page-shell\s*\{\s*animation:\s*none\s*!important;/,
    "page reveal animation should still disable motion for reduced-motion users",
  );
});
