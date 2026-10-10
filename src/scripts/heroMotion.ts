/** Reference timing and geometry applied to the site's own vector lettering. */
export function initHeroMotion(signal: AbortSignal) {
  const hero = document.querySelector<HTMLElement>('.hero-art');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!hero || reduced.matches) return;
  const glyphs = Array.from(hero.querySelectorAll<SVGGElement>('.logo-interaction'));
  const captions = Array.from(hero.querySelectorAll<HTMLElement>('.hero-caption'));
  const animations: Animation[] = [];
  let captionTimer: ReturnType<typeof setTimeout> | undefined;
  let currentCaption = -1;
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
      const bounds = glyph.getBBox();
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const offsetX = cx - 1942 / 2;
      const offsetY = cy - 1054 / 2;
      glyph.dataset.centerX = String(cx);
      glyph.dataset.centerY = String(cy);
      const arrival = glyph.querySelector<SVGGElement>('.logo-arrival')!;
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
