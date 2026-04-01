# Reading Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve reading-page speed and stability without visibly degrading the site or removing any existing feature.

**Architecture:** Keep Astro static rendering as the baseline, and reduce client-side/network competition on the critical path. P0 focuses on resource scoping and prefetch discipline rather than visual simplification.

**Tech Stack:** Astro 5, Astro content collections, MDX, Tailwind, small inline browser scripts, Node test runner

---

### Task 1: Lock the P0 invariants with tests

**Files:**
- Modify: `tests/base-layout-css.test.mjs`
- Test: `tests/base-layout-css.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add assertions covering:
- conservative Astro prefetch strategy
- conditional KaTeX loading in the base layout
- detail pages opting into KaTeX explicitly
- removal of the redundant custom same-origin prefetch script

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/base-layout-css.test.mjs`
Expected: FAIL because the current code still uses aggressive global prefetching and unconditional KaTeX loading.

- [ ] **Step 3: Write minimal implementation**

Touch only the config/layout/page files needed to satisfy the invariants.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/base-layout-css.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/base-layout-css.test.mjs astro.config.mjs src/layouts/BaseLayout.astro src/pages/blog/[...slug].astro src/pages/notes/[...slug].astro
git commit -m "perf: reduce reading-path resource contention"
```

### Task 2: Verify production output

**Files:**
- Modify: none
- Test: production build output

- [ ] **Step 1: Run a full build**

Run: `npm run build`
Expected: exit code 0

- [ ] **Step 2: Inspect generated output for external asset changes**

Check:
- non-math pages no longer include KaTeX CSS
- prefetch behavior is no longer globally aggressive

- [ ] **Step 3: Document residual P1 opportunities**

Capture follow-up items without expanding scope in this pass.
