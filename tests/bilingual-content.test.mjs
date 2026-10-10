import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const matches = (text, pattern) => [...text.matchAll(pattern)].map(match => match[0]);

test('English articles preserve complete code, equations, section structure, and local assets', async () => {
  for (const slug of ['flops-is-a-lie', 'transformer-token-association']) {
    const zh = await read(`src/content/blog/${slug}.mdx`);
    const en = await read(`src/content/blog/en/${slug}.mdx`);
    assert.match(en, /^lang: en$/m);
    assert.match(en, new RegExp(`^translationKey: ${slug}$`, 'm'));
    assert.doesNotMatch(en, /[\u4e00-\u9fff]|@@\d+@@/, 'No untranslated paragraphs or placeholder tokens');
    assert.deepEqual(matches(en, /```[^\n]*\n[\s\S]*?```/g), matches(zh, /```[^\n]*\n[\s\S]*?```/g), 'Code and whitespace remain unchanged');
    const equations = text => matches(text, /\$\$[\s\S]*?\$\$/g).map(equation => equation.replace(/\\text\{[^}]*\}/g, '\\text{label}').replace(/\s+/g, ' '));
    assert.deepEqual(equations(en), equations(zh), 'Only textual equation labels are translated');
    const depths = text => [...text.matchAll(/^(#{1,3})\s+/gm)].map(match => match[1].length);
    assert.deepEqual(depths(en), depths(zh), 'Corresponding sections exist in the same order');
    const assets = text => [...new Set(matches(text, /\/(?:images|notebooks)\/[^\s)"']+/g))].sort();
    assert.deepEqual(assets(en), assets(zh));
    for (const asset of assets(en)) await access(new URL(`public${asset}`, root));
    for (const field of ['pubDate', 'updatedDate', 'tags']) {
      assert.equal(en.match(new RegExp(`^${field}:.*$`, 'm'))?.[0], zh.match(new RegExp(`^${field}:.*$`, 'm'))?.[0]);
    }
  }
});
