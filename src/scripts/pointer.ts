/** A light trailing ring, with no animation frames once it settles. */
export function initPointer(signal: AbortSignal) {
  const pointer = document.querySelector<HTMLElement>('.reference-pointer');
  if (!pointer) return;
  const label = pointer.querySelector('[data-pointer-label]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let frame = 0;
  let ready = false;
  let x = 0, y = 0, targetX = 0, targetY = 0;
  let lastTime = 0;
  const tick = (now: number) => {
    const delta = Math.min(32, now-lastTime || 16);
    lastTime = now;
    const amount = 1-Math.exp(-delta/42);
    x += (targetX-x)*amount;
    y += (targetY-y)*amount;
    pointer.style.transform = `translate3d(${x}px,${y}px,0)`;
    if (Math.hypot(targetX-x,targetY-y) > .2) frame = requestAnimationFrame(tick);
    else frame = 0;
  };
  const hide = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    ready = false;
    pointer.classList.remove('is-visible','is-pressed');
  };
  document.addEventListener('pointermove', event => {
    if (reduced.matches || !fine.matches || event.pointerType === 'touch') { hide(); return; }
    targetX = event.clientX; targetY = event.clientY;
    if (!ready) { x=targetX; y=targetY; ready=true; }
    const element = event.target instanceof Element ? event.target : null;
    const target = element?.closest('a,button');
    const quiet = element?.closest('.reading-prose,.reader-toc,input,textarea,dialog');
    const featured = target?.matches('.featured-entry,.archive-entry,.home-profile,.contact-marquee,.blog-shelf-image-link');
    pointer.classList.toggle('is-reading',Boolean(quiet));
    pointer.classList.toggle('is-large',Boolean(featured));
    pointer.classList.add('is-visible');
    if (label) label.textContent = target?.matches('.contact-marquee') ? 'Email' : target?.getAttribute('href')?.startsWith('/blog/') ? 'Read' : 'View';
    if (!frame) { lastTime=performance.now(); frame=requestAnimationFrame(tick); }
  }, { signal, passive: true });
  document.addEventListener('pointerdown', event => { if (event.pointerType !== 'touch') pointer.classList.add('is-pressed'); }, { signal });
  document.addEventListener('pointerup', () => pointer.classList.remove('is-pressed'), { signal });
  document.addEventListener('pointerleave', hide, { signal });
  document.addEventListener('keydown', event => { if (event.key === 'Tab' || event.key === 'Escape') hide(); }, { signal });
  window.addEventListener('scroll', hide, { signal, passive: true });
  window.addEventListener('blur', hide, { signal });
  reduced.addEventListener('change', hide, { signal });
  fine.addEventListener('change', hide, { signal });
  signal.addEventListener('abort', hide, { once: true });
}
