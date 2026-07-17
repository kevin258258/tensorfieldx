/**
 * Lightweight transition engine (see src/styles/transitions.css for visuals).
 *
 * Tiers are declared at render time via link attributes:
 *   data-transition="series"  — L0: in-series reading (fast drift + crossfade)
 *   data-transition="enter"   — L1: list → article (title FLIP)
 *
 * Unannotated navigations fall back to plain swaps; popstate gets a light L0.
 * Everything degrades to plain swaps under prefers-reduced-motion.
 */
import { navigate } from "astro:transitions/client";

type Tier = "series" | "enter";
type Dir = "next" | "prev";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let managed = false; // true while this engine drives a navigation
let pendingL0: Dir | null = null;
let pendingFly: {
  text: string;
  rect: DOMRect;
  font: string;
  size: number;
  weight: string;
  style: string;
  spacing: string;
  lineHeight: string;
  color: string;
} | null = null;

const html = () => document.documentElement;
const main = () => document.querySelector("main.page-shell");

function snapshotTitle(el: HTMLElement) {
  const cs = getComputedStyle(el);
  return {
    text: el.textContent ?? "",
    rect: el.getBoundingClientRect(),
    font: cs.fontFamily,
    size: parseFloat(cs.fontSize),
    weight: cs.fontWeight,
    style: cs.fontStyle,
    spacing: cs.letterSpacing,
    lineHeight: cs.lineHeight,
    color: cs.color,
  };
}

/* ── L0 · series drift ── */
async function playSeries(href: string, dir: Dir) {
  managed = true;
  html().classList.add("is-tx");
  main()?.classList.add(dir === "next" ? "t0-exit-next" : "t0-exit-prev");
  pendingL0 = dir;
  await wait(135);
  navigate(href);
}

/* ── L1 · title fly ── */
function playEnter(href: string, link: HTMLElement) {
  const titleEl = (link.querySelector("[data-fly-title]") as HTMLElement) ?? link;
  pendingFly = snapshotTitle(titleEl);
  managed = true;
  html().classList.add("is-tx");
  navigate(href);
}

function runFly(fly: NonNullable<typeof pendingFly>) {
  const target = document.querySelector("[data-article-title]") as HTMLElement | null;
  if (!target) {
    html().classList.remove("is-tx");
    return;
  }

  const targetRect = target.getBoundingClientRect();
  const cs = getComputedStyle(target);
  const scale = parseFloat(cs.fontSize) / fly.size;

  target.style.opacity = "0";

  const clone = document.createElement("div");
  clone.className = "fly-title-clone";
  clone.textContent = fly.text;
  Object.assign(clone.style, {
    left: `${fly.rect.left}px`,
    top: `${fly.rect.top}px`,
    width: `${fly.rect.width}px`,
    fontFamily: fly.font,
    fontSize: `${fly.size}px`,
    fontWeight: fly.weight,
    fontStyle: fly.style,
    letterSpacing: fly.spacing,
    lineHeight: fly.lineHeight,
    color: fly.color,
  });
  document.body.appendChild(clone);

  const dx = targetRect.left - fly.rect.left;
  const dy = targetRect.top - fly.rect.top;

  const flight = clone.animate(
    [
      { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 1, offset: 0.82 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0 },
    ],
    { duration: 400, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
  );

  flight.onfinish = () => {
    target.style.opacity = "";
    clone.remove();
    html().classList.remove("is-tx");
  };
}

/* ── Wiring ── */
function onClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const a = (e.target as Element).closest?.("a[data-transition]") as HTMLAnchorElement | null;
  if (!a || a.target === "_blank" || a.origin !== window.location.origin) return;

  const url = new URL(a.href);
  if (url.pathname === window.location.pathname) return; // same-page / hash

  const tier = a.dataset.transition as Tier;
  if (reduced() || (tier !== "series" && tier !== "enter")) return;

  e.preventDefault();
  if (tier === "series") void playSeries(a.href, a.dataset.dir === "prev" ? "prev" : "next");
  else playEnter(a.href, a);
}

function onBeforePreparation(e: Event) {
  if (managed || reduced()) return;
  // Popstate (browser back/forward) and unannotated links: light L0 entrance only.
  const nav = e as any;
  if (nav.navigationType === "traverse") {
    pendingL0 = nav.direction === "back" ? "prev" : "next";
    html().classList.add("is-tx");
  }
}

function onAfterSwap() {
  if (pendingL0) {
    const dir = pendingL0;
    pendingL0 = null;
    managed = false;
    const m = main();
    if (m) {
      m.classList.remove("t0-exit-next", "t0-exit-prev");
      m.classList.add(dir === "next" ? "t0-enter-next" : "t0-enter-prev");
      setTimeout(() => {
        m.classList.remove("t0-enter-next", "t0-enter-prev");
        html().classList.remove("is-tx");
      }, 300);
    } else {
      html().classList.remove("is-tx");
    }
    return;
  }

  if (pendingFly) {
    const fly = pendingFly;
    pendingFly = null;
    managed = false;
    runFly(fly);
    return;
  }

  managed = false;
}

export function initTransitions() {
  if ((window as any).__txBound) return;
  (window as any).__txBound = true;

  document.addEventListener("click", onClick, true);
  document.addEventListener("astro:before-preparation", onBeforePreparation);
  document.addEventListener("astro:after-swap", onAfterSwap);
}
