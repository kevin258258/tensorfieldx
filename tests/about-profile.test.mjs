import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readSrc = (path) => readFile(new URL(path, root), "utf8");

test("About replaces the old interest chips with two focused research directions", async () => {
  const about = await readSrc("src/pages/about.astro");

  assert.match(about, /Artificial Intelligence/);
  assert.match(about, /Agentic Reinforcement Learning/);
  assert.match(about, /Learning Theory/);
  assert.match(about, /optimization/i);
  assert.match(about, /interpretability/i);
  assert.equal(about.match(/data-research-interest/g)?.length, 1);
  const researchCollection = about.match(
    /const researchInterests = (\[[\s\S]*?\]);\s*\n\s*const experiences/,
  )?.[1];
  assert.ok(researchCollection, "About should define a research-interest collection");
  assert.equal(
    [...researchCollection.matchAll(/title:\s*["']/g)].length,
    2,
    "About should define exactly two research interests",
  );
  assert.doesNotMatch(
    about,
    /const interests|Differential Geometry|Statistical Mechanics|Matrix Calculus|System Architecture/,
  );
});

test("About consolidates education, experience, CV, and welcoming contact details", async () => {
  const about = await readSrc("src/pages/about.astro");

  assert.match(about, />Education</);
  assert.match(about, />Research &amp; Experience</);
  assert.match(about, /GPA:\s*3\.91/);
  assert.match(about, /60\s*\/\s*1363/);
  assert.match(about, /My-minimind/);
  assert.match(about, /CS336/);
  assert.match(about, /CS285/);
  assert.match(
    about,
    /href="\/cv\/Feixiang-Tao-CV\.pdf"[^>]*class="[^"]*text-accent[^"]*"/,
  );
  assert.match(about, /For more details,\s*see my[\s\S]*?>CV<\/a>/);
  assert.match(about, /Welcome to reach out|Always happy to connect/i);
  assert.match(about, /data-contact-invite[\s\S]*bg-accent\/[\[\]\.0-9]+[\s\S]*text-accent/);

  for (const label of ["Email", "GitHub", "Zhihu", "X"]) {
    assert.match(about, new RegExp(`aria-label=["']${label}["']`));
  }
});

test("standalone CV navigation is removed and the supplied PDF is published", async () => {
  const nav = await readSrc("src/components/chrome/SiteNav.astro");

  assert.doesNotMatch(nav, /href:\s*["']\/cv["']|label:\s*["']CV["']/);
  await assert.rejects(access(new URL("src/pages/cv.astro", root)));

  const pdf = await readFile(new URL("public/cv/Feixiang-Tao-CV.pdf", root));
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
});

test("homepage profile points to the new AI research identity", async () => {
  const home = await readSrc("src/pages/index.astro");

  assert.match(home, /Artificial Intelligence/);
  assert.match(home, /Agentic RL/);
  assert.match(home, /Learning Theory/);
  assert.doesNotMatch(home, /Physics\s*\/\s*Math\s*\/\s*AI/);
});
