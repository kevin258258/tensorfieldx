# Reading Performance Design

**Goal:** Improve load speed and reading stability without materially degrading visuals or removing any user-facing features.

**Context**

This site is an Astro static site with mostly server-rendered pages. The main performance and stability risks are not the content architecture itself, but global delivery choices and client-side enhancements:

- Aggressive global route prefetching.
- Global KaTeX CSS on pages that do not render math.
- Third-party and enhancement scripts competing with core reading resources.
- Mobile-sensitive rendering behavior in long-form pages.

**Constraints**

- Preserve current visual identity as much as possible.
- Keep search, comments, and the notes graph available.
- Avoid any optimization that can cause article content to disappear, relayout unexpectedly, or require refresh-like recovery while reading.

**P0 Changes**

1. Scope math resources to pages that actually render long-form math content.
2. Replace aggressive global prefetching with a conservative strategy that reduces bandwidth contention on mobile.
3. Remove redundant custom same-origin prefetch behavior once Astro-level prefetch is made conservative.
4. Keep theme switching and long-form rendering stable on mobile.

**P1 Changes**

1. Refine search index loading so it is available quickly without competing with first paint.
2. Reserve stable comment area space to reduce late layout movement near the end of articles.
3. Review whether desktop-only link preview/search can share a single cached index path cleanly.

**Non-Goals**

- Full visual redesign.
- Removing analytics, comments, search, or graph functionality.
- Rewriting the site into a different framework.

**Validation**

- Add source-level regression tests for config and layout constraints.
- Run targeted tests for the new invariants.
- Run a full Astro build to verify production output remains valid.
