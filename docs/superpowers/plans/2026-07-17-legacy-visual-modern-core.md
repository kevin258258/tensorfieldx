# Legacy Visual, Modern Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the visual language from commit `094b30b` while retaining the functionality and performance work introduced after it.

**Architecture:** Treat `094b30b` as a visual reference, not as a source tree to reset to. Recreate its warm paper palette, subtle texture, dark theme, quiet typography, simple cards, and image-led homepage on top of the current split Astro layout. Keep the current series data model/pages/reading rail, lightweight article/series transitions, local fonts/KaTeX, reveal/copy/lightbox scripts, search lifecycle fixes, and publishing scaffold. Remove the full-screen geometric section transition.

**Tech Stack:** Astro 5, Tailwind CSS, CSS design tokens, self-hosted Fontsource/KaTeX, Node test runner.

---

### Task 1: Protect the selective migration

**Files:**
- Create: `tests/legacy-visual-modern-core.test.mjs`
- Modify: `tests/base-layout-css.test.mjs`

- [ ] Write source-contract tests for the `094b30b` warm palette, paper texture, class-based dark theme, image-led `TensorFieldX` homepage, quiet shelf cards, and absence of the bottom back-to-top control.
- [ ] Assert that current functionality remains: `ClientRouter`, `initTransitions`, `initReveal`, `initCopyCode`, `initLightbox`, `series` collection, series routes, reading rail, viewport/tap prefetch, local Fontsource, and local KaTeX.
- [ ] Run `node tests/legacy-visual-modern-core.test.mjs` and confirm the visual assertions fail while the modern-core assertions pass.

### Task 2: Restore the global visual foundation

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/chrome/SiteNav.astro`
- Modify: `tailwind.config.mjs`
- Restore: `public/images/paper-texture.webp` from `094b30b`

- [ ] Restore the warm light tokens (`244 241 236`, `255 254 249`, charcoal text, electric blue, rust accent) and the old paper gradient/texture.
- [ ] Add dark token overrides and the pre-paint theme bootstrap without restoring Google Fonts, CDN KaTeX, GSAP, canvas, or global animation loops.
- [ ] Apply the stored theme to Astro's incoming document during `astro:before-swap` so route transitions never capture the wrong color scheme.
- [ ] Add the old moon/sun toggle to the split navigation component, persist the choice, and rebind it on Astro route swaps.
- [ ] Keep the back-to-top control absent.
- [ ] Run the focused test and confirm the global-visual assertions pass.

### Task 3: Restore the image-led homepage

**Files:**
- Modify: `src/pages/index.astro`

- [ ] Replace the geometric HUD experiment with the `094b30b` full-bleed `/images/hero.webp` hero and the original `TensorFieldX` wordmark treatment.
- [ ] Restore the quiet two-column Feixiang Tao identity section and simple bordered Explore cards.
- [ ] End with separate recent Notes and Blog lists using current content collections and L1 entry transitions.
- [ ] Run the focused test and inspect desktop/mobile hero screenshots.

### Task 4: Restyle the current information architecture

**Files:**
- Modify: `src/pages/notes/index.astro`
- Modify: `src/styles/cards.css`
- Delete: `src/components/motion/Emblem.astro`
- Modify: `src/styles/transitions.css`

- [ ] Remove the giant outlined NOTES backdrop and asymmetric/inverting shelf composition.
- [ ] Keep filters and series links but render them as balanced, softly bordered legacy-style cards.
- [ ] Remove the full-screen geometric section overlay while preserving lightweight article and series transitions.
- [ ] Remove the lavender redesign token and residual series/reading borders from the restored warm-paper pages.
- [ ] Verify Notes index, series page, and note reading page on desktop/mobile.

### Task 5: Verify, review, and commit

**Files:**
- Verify all touched files.

- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run build` and require exit code 0.
- [ ] Inspect `/`, `/notes`, one `/notes/series/*`, one `/notes/*`, `/blog`, and `/about` at desktop and mobile widths.
- [ ] Review the diff against both axes: visual fidelity to `094b30b`, and preservation of the modern feature/performance contract.
- [ ] Commit only the selective restoration files on the current branch.
