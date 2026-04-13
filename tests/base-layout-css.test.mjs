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

test("article virtualization styles are scoped away from mobile", async () => {
  const source = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

  assert.match(
    source,
    /@media\s*\(min-width:\s*768px\)\s*and\s*\(hover:\s*hover\)\s*\{\s*\.prose\s*>\s*:nth-child\(n\+8\)\s*\{\s*content-visibility:\s*auto;/,
    "content-visibility should be scoped behind a desktop-only media query",
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

test("base layout enables lightweight Astro route transitions only for the page body", async () => {
  const source = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

  assert.match(
    source,
    /import\s+\{\s*ClientRouter\s*\}\s+from\s+["']astro:transitions["'];/,
    "base layout should use Astro's built-in client router for route transitions",
  );

  assert.match(
    source,
    /<ClientRouter\s+fallback=["']swap["']\s*\/>/,
    "route transitions should fall back to swap to keep unsupported browsers cheap",
  );

  assert.match(
    source,
    /<html[^>]*transition:animate=["']none["']/,
    "default full-page transition animation should be disabled",
  );

  assert.match(
    source,
    /<main[^>]*transition:name=["']page-main["'][^>]*transition:animate=["']fade["']/,
    "only the main content region should receive a lightweight fade transition",
  );
});

test("global interactive scripts reinitialize after Astro route transitions", async () => {
  const layoutSource = await readFile(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");
  const searchSource = await readFile(new URL("../src/components/Search.astro", import.meta.url), "utf8");
  const previewSource = await readFile(new URL("../src/components/LinkPreview.astro", import.meta.url), "utf8");

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

  assert.doesNotMatch(
    previewSource,
    /DOMContentLoaded/,
    "link previews should not depend on full document reloads once route transitions are enabled",
  );
});
