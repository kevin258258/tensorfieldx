# Kazuki Noda visual recreation

Reference: https://kazukinoda.com/ (inspected 2026-10-10).
Branch: `feat/kazuki-portfolio`.

The requested target is the reference site's complete visual and interaction language, using TensorFieldX / Feixiang Tao and the existing content. The user confirmed that the site's original identity and articles should be retained.

## Reference measurements

| Element | Desktop | Mobile |
| --- | --- | --- |
| Responsive breakpoint | 800px | Below 800px |
| Page frame | 20px inset, 2px lines | 25px top, 15px sides |
| Navigation | Fixed top, 104px tall | Fixed bottom, 65px tall |
| Home text rail | 242px | Stacked introduction |
| Home composition | Minimum 600px tall | SVG at full content width |
| Section heading | 80px tall | 70px tall |
| Featured row | 360px plus 67px pattern band | 203px title plus metadata and pattern |
| Contact marquee | 200px tall, 355px type | 152px tall, 265px type |
| Paper texture | 500px tile | 500px tile |
| Grain | 250px tile, .55s stepped animation | Same, reduced motion respected |

The six theme colors are `#7d97b8`, `#dfb255`, `#52a47e`, `#9eaf92`, `#a7b6b0`, and `#2a2927`; the paper color is `#ede7dc`. Quincy CF and Lato fonts, paper/grain textures, and background music are stored under `public/design/kazuki/`, fetched from the reference's public asset endpoints. The TensorFieldX glyph composition is a new vector mark in `src/assets/tensorfieldx-mark.svg`.

## Implementation

- Shared frame, desktop/mobile navigation, palette persistence, sound entrance and sound control.
- SVG glyph composition, staggered arrival, 20-unit per-glyph pointer attraction, outlined titles, and 50/80px circular pointer feedback.
- WebGL image reveals use the reference noise texture, per-pixel delay, sine easing, a 1.8× corner reach, and 800/600ms enter/exit timings. Reduced-motion and unavailable graphics keep the static image behavior.
- Selected home entries from the existing blog/notes collections.
- `/archive` with category controls, a desktop image preview, and all existing notes, published posts, and projects. `/blog` and `/projects` use the same listing vocabulary.
- Profile typography/photo composition with the existing academic profile, internship, CV and contact links.
- Contact marquee and footer. Existing series, reading pages, math, code copy, search and image zoom remain available.

## Verification status

Verified in this worktree:

- `npm run build`: 118 generated pages, success.
- `tsc --noEmit`: success.
- Reveal shaders: compiled and linked with `glslangValidator`; rendered in a surfaceless GLES2 context (Mesa llvmpipe). At progress 0/0.5/1, alpha was respectively all 0 / 256 graded values / all 255, and the completed image color matched the input.
- `npm test`: all four test files passed; the detailed TAP run passed 30 assertions.
- Built-output audit: 118 pages, 3,150 root-relative links/assets, zero missing paths.
- Local preview HTTP responses: home, archive, profile, and the Transformer article all returned 200. The archive contains 33 notes, two published blog posts, and one project.

A successful build or source test does **not** prove complete visual fidelity.

Still required before marking the goal complete:

1. Side-by-side browser captures of the reference and local pages at desktop and mobile sizes, including 1440×900, 800px, 799px and 390×844.
2. Verify entrance, sound on/off, all palettes, keyboard navigation, category filtering, hover previews, client navigation and reduced motion in the browser.
3. Compare animated letter motion, cursor behavior, image reveal and page transitions with the reference's WebGL effects. Image reveal now uses the reference WebGL algorithm. Letter arrival and page transitions still require comparison with the original WebGL effects; full motion fidelity remains unproven.
4. Correct discrepancies found in those captures and interaction checks.

The browser connector reported no available browsers during implementation. Full fidelity is pending this verification; the goal is active.
