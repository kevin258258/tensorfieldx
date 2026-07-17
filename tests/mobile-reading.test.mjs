import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readSrc = (path) => readFile(new URL(path, root), "utf8");

test("article shells use compact, bounded mobile reading layouts", async () => {
  for (const path of ["src/pages/blog/[...slug].astro", "src/pages/notes/[...slug].astro"]) {
    const page = await readSrc(path);

    assert.match(page, /reading-prose/);
    assert.match(page, /prose-base\s+md:prose-lg/);
    assert.match(page, /prose-h1:text-3xl/);
    assert.match(page, /text-\[1\.75rem\]\s+sm:text-3xl/);
    assert.match(page, /<nav[^>]*class="[^"]*overflow-hidden[^"]*"[^>]*aria-label="Breadcrumb"/);
    assert.match(page, /min-h-\[36px\]/);
  }
});

test("global reading CSS contains wide formulas without widening the page", async () => {
  const tokens = await readSrc("src/styles/tokens.css");

  assert.match(tokens, /html\s*\{[^}]*overflow-x:\s*hidden;[^}]*overflow-x:\s*clip;/s);
  assert.match(
    tokens,
    /\.reading-prose\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s,
  );
  const baseReadingRule = tokens.match(/\.reading-prose\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(baseReadingRule, /overflow-x:\s*clip;/);
  assert.match(
    tokens,
    /@media\s*\(max-width:\s*1279px\)[\s\S]*?\.reading-prose\s*\{[^}]*overflow-x:\s*clip;/s,
  );
  assert.match(
    tokens,
    /@media\s*\(max-width:\s*1279px\)[\s\S]*?\.reading-prose\s+table\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;[^}]*overflow-x:\s*auto;/s,
  );
  assert.match(
    tokens,
    /\.reading-prose\s+\.katex-display\s*\{[^}]*overflow-x:\s*auto;[^}]*overscroll-behavior-inline:\s*contain;/s,
  );
  assert.match(tokens, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.page-shell\s*\{[^}]*animation:\s*none/s);
  assert.match(
    tokens,
    /@media\s*\(max-width:\s*640px\)[\s\S]*?\.transition-colors[\s\S]*?transition:\s*none\s*!important/s,
  );

  const notes = await readSrc("src/pages/notes/[...slug].astro");
  assert.doesNotMatch(notes, /reading-prose[\s\S]*?overflow-x-clip\s+relative/);
});

test("math styles load deterministically and theme switching avoids a full-DOM selector", async () => {
  const layout = await readSrc("src/layouts/BaseLayout.astro");
  const nav = await readSrc("src/components/chrome/SiteNav.astro");
  const tokens = await readSrc("src/styles/tokens.css");
  const katex = await readSrc("public/vendor/katex/katex.min.css");

  assert.match(layout, /rel="stylesheet"\s+href="\/vendor\/katex\/katex\.min\.css"/);
  assert.doesNotMatch(layout, /media="print"|onload="this\.media='all'"/);
  assert.doesNotMatch(nav, /theme-switching/);
  assert.doesNotMatch(tokens, /\.theme-switching\s+\*/);
  assert.doesNotMatch(katex, /font-display:block/);
  assert.match(katex, /font-display:swap/);
});

test("custom page motion is bypassed on narrow or coarse-pointer devices", async () => {
  const transitions = await readSrc("src/scripts/transitions.ts");

  assert.match(transitions, /max-width:\s*640px/);
  assert.match(transitions, /pointer:\s*coarse/);
  assert.match(transitions, /reduced\(\)/);
});
