# About and CV Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make About the single personal-profile destination, focus the homepage and profile on artificial intelligence, and expose the full CV as a PDF rather than a standalone page.

**Architecture:** Keep the existing warm-paper layout and Astro navigation. Replace About's tag-style interests with two editorial research-interest cards, move verified education and learning experience from the source CV into structured About sections, and serve the source PDF as a static asset. Remove the `/cv` navigation item and Astro page.

**Tech Stack:** Astro 5, Tailwind CSS, inline accessible SVG icons, Node test runner, static PDF asset.

---

### Task 1: Lock the profile contract

**Files:**
- Create: `tests/about-profile.test.mjs`

- [x] Write source-contract tests asserting that navigation has no standalone `/cv`, About contains `Artificial Intelligence`, exactly the two requested research directions, `Education`, `Research & Experience`, a blue PDF link, and an accessible contact row.
- [x] Assert that the homepage profile names artificial intelligence, Agentic RL, and Learning Theory.
- [x] Assert that `src/pages/cv.astro` is absent and `public/cv/Feixiang-Tao-CV.pdf` begins with `%PDF`.
- [x] Run `node tests/about-profile.test.mjs` and confirm the new assertions fail against the current profile.

### Task 2: Consolidate CV and About

**Files:**
- Modify: `src/components/chrome/SiteNav.astro`
- Delete: `src/pages/cv.astro`
- Modify: `src/pages/about.astro`
- Copy: `/home/tfx/projects/纷杂物/cv/Cv.pdf` → `public/cv/Feixiang-Tao-CV.pdf`

- [x] Remove the CV navigation entry and delete the redundant HTML CV page.
- [x] Replace About's old chips with two blue-accented cards: `Agentic Reinforcement Learning` and `Learning Theory`, with optimization and interpretability included in the latter description.
- [x] Add verified Education and Research & Experience entries from the supplied CV, keeping the copy concise and linking repository-backed experiences.
- [x] Add “For more details, see my CV” as a blue link to `/cv/Feixiang-Tao-CV.pdf`.
- [x] Add an accessible icon contact row below the profile mark and emphasize that contact is welcome, using only contact URLs already present in the repository.

### Task 3: Align the homepage profile

**Files:**
- Modify: `src/pages/index.astro`

- [x] Change the profile label/focus from the old physics–math mix to Artificial Intelligence.
- [x] Rewrite the short introduction around Agentic RL and Learning Theory without changing the selected hero, recent Notes, or recent Blog structure.
- [x] Run `node tests/about-profile.test.mjs` and confirm every profile contract passes.

### Task 4: Verify, review, and commit

**Files:**
- Verify all touched files.

- [x] Run `npm test` and require zero failures.
- [x] Run `npm run build` and require exit code 0, with no generated `/cv/index.html` page.
- [x] Inspect `/` and `/about` at desktop and mobile widths, including dark mode and every contact/CV link.
- [x] Run the Standards and Spec review axes and resolve actionable findings.
- [x] Commit the consolidated profile to the current branch.
