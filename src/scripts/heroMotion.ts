/** Shuffle the lettering once per home-page visit; hover and arrival use separate layers. */
function randomizeLayout(hero: HTMLElement, glyphs: SVGGElement[]) {
  const logo = hero.querySelector<SVGSVGElement>('.scattered-logo');
  if (!logo || logo.dataset.layoutReady) return;
  const { width, height } = logo.viewBox.baseVal;
  const columns = 4;
  const rows = Math.ceil(glyphs.length / columns);
  const inset = 56;
  const cellWidth = (width - inset * 2) / columns;
  const cellHeight = (height - inset * 2) / rows;
  const bounds = glyphs.map(glyph => glyph.querySelector<SVGGElement>('.logo-layout')!.getBBox());
  const slots = glyphs.map((_, index) => index);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const placements = bounds.map((box, index) => {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const angle = [0, 90, -90, 180][Math.floor(Math.random() * 4)] + (Math.random() - .5) * 24;
    const radians = angle * Math.PI / 180;
    const rotatedWidth = Math.abs(Math.cos(radians)) * box.width + Math.abs(Math.sin(radians)) * box.height;
    const rotatedHeight = Math.abs(Math.sin(radians)) * box.width + Math.abs(Math.cos(radians)) * box.height;
    // A spaced grid is a guaranteed fallback if an irregular arrangement cannot fit.
    const jitterX = Math.max(0, (cellWidth - rotatedWidth - 48) / 2);
    const jitterY = Math.max(0, (cellHeight - rotatedHeight - 48) / 2);
    const x = inset + (slots[index] % columns + .5) * cellWidth + (Math.random() * 2 - 1) * jitterX;
    const y = inset + (Math.floor(slots[index] / columns) + .5) * cellHeight + (Math.random() * 2 - 1) * jitterY;
    return { cx, cy, angle, width: rotatedWidth, height: rotatedHeight, x, y };
  });
  const scattered: typeof placements = [];
  for (const [index, placement] of placements.entries()) {
    const anchor = bounds[slots[index]];
    let candidate: typeof placement | undefined;
    for (let attempt = 0; attempt < 160; attempt++) {
      // Exchange the original irregular anchors, then vary their positions independently.
      const targetX = attempt < 80 ? anchor.x + anchor.width / 2 + (Math.random() - .5) * 280 : Math.random() * width;
      const targetY = attempt < 80 ? anchor.y + anchor.height / 2 + (Math.random() - .5) * 210 : Math.random() * height;
      const x = Math.max(inset + placement.width / 2, Math.min(width - inset - placement.width / 2, targetX));
      const y = Math.max(inset + placement.height / 2, Math.min(height - inset - placement.height / 2, targetY));
      if (scattered.every(other => Math.abs(x - other.x) >= (placement.width + other.width) / 2 + 48 || Math.abs(y - other.y) >= (placement.height + other.height) / 2 + 48)) {
        candidate = { ...placement, x, y };
        break;
      }
    }
    if (!candidate) break;
    scattered.push(candidate);
  }
  const composition = scattered.length === glyphs.length ? scattered : placements;
  glyphs.forEach((glyph, index) => {
    const { x, y, cx, cy, angle } = composition[index];
    glyph.querySelector<SVGGElement>('.logo-layout')!.setAttribute('transform', `translate(${x - cx} ${y - cy}) rotate(${angle} ${cx} ${cy})`);
    glyph.dataset.centerX = String(x);
    glyph.dataset.centerY = String(y);
  });
  logo.dataset.layoutReady = 'true';
}

/** Arrival timing applied to the site's own vector lettering. */
export function initHeroMotion(signal: AbortSignal) {
  const hero = document.querySelector<HTMLElement>('.hero-art');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!hero) return;
  const glyphs = Array.from(hero.querySelectorAll<SVGGElement>('.logo-interaction'));
  const captions = Array.from(hero.querySelectorAll<HTMLElement>('.hero-caption'));
  randomizeLayout(hero, glyphs);
  captions.forEach((caption, index) => caption.classList.toggle('is-active', index === 0));
  if (reduced.matches) return;
  const animations: Animation[] = [];
  let captionTimer: ReturnType<typeof setTimeout> | undefined;
  let currentCaption = 0;
  let played = false;
  const advanceCaption = () => {
    captions[currentCaption]?.classList.remove('is-active');
    currentCaption = (currentCaption + 1) % captions.length;
    captions[currentCaption]?.classList.add('is-active');
    captionTimer = setTimeout(advanceCaption, 7000);
  };
  const play = () => {
    if (played || signal.aborted) return;
    played = true;
    hero.classList.add('is-playing');
    const order = glyphs.map((_, index) => index);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    glyphs.forEach((glyph, index) => {
      const arrival = glyph.querySelector<SVGGElement>('.logo-arrival')!;
      const bounds = arrival.getBBox();
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const offsetX = Number(glyph.dataset.centerX) - 1942 / 2;
      const offsetY = Number(glyph.dataset.centerY) - 1054 / 2;
      const rotation = glyph.querySelector<SVGGElement>('.logo-rotation')!;
      const path = glyph.querySelector<SVGPathElement>('.logo-glyph')!;
      arrival.style.transformOrigin = `${cx}px ${cy}px`;
      rotation.style.transformOrigin = `${cx + .5 * (Math.random() - .5) * offsetX}px ${cy + .5 * (Math.random() - .5) * offsetY}px`;
      const angle = (Math.random() < .5 ? -1 : 1) * (Math.random() + .3) * 18;
      const delay = 80 + order.indexOf(index) * 55;
      const options = { delay, fill: 'backwards' as FillMode, easing: 'cubic-bezier(.19,1,.22,1)' };
      animations.push(arrival.animate([
        { transform: `translate(${-offsetX * .05}px, ${-offsetY * .05}px) scale(1.12)` },
        { transform: 'translate(0, 0) scale(1)' },
      ], { ...options, duration: 1100 }));
      animations.push(rotation.animate([{ transform: `rotate(${angle}deg)` }, { transform: 'rotate(0)' }], { ...options, duration: 1400 }));
      const from = Math.random() < .5 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)';
      animations.push(path.animate([{ opacity: 0, clipPath: from }, { opacity: 1, clipPath: 'inset(0)' }], { ...options, duration: 800 }));
    });
    if (captions.length) captionTimer = setTimeout(advanceCaption, 5000);
  };
  if (document.documentElement.dataset.entered === 'true') play();
  else document.addEventListener('reference:entered', play, { once: true, signal });
  signal.addEventListener('abort', () => {
    animations.forEach(animation => animation.cancel());
    clearTimeout(captionTimer);
  }, { once: true });
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    animations.forEach(animation => animation.cancel());
    clearTimeout(captionTimer);
    captions.forEach((caption, index) => caption.classList.toggle('is-active', index === 0));
  }, { signal });
}
