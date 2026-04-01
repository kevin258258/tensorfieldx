import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
