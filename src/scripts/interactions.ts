let controller: AbortController | undefined;

/** Pointer effects are bounded and event-driven, without a permanent render loop. */
export function initInteractions() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const enabled = () => !reduced.matches && fine.matches;
  let frame = 0;
  let magnet: HTMLElement | SVGElement | null = null;
  let x = 0;
  let y = 0;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    magnet?.style.removeProperty('--magnet-x');
    magnet?.style.removeProperty('--magnet-y');
    magnet = null;
  };
  document.addEventListener('pointerover', event => {
    if (!enabled() || event.pointerType === 'touch') return;
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('.nav-page,.nav-search,.social-links a') : null;
    if (!target || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) return;
    const box = target.getBoundingClientRect();
    const distances = [event.clientX-box.left, box.right-event.clientX, event.clientY-box.top, box.bottom-event.clientY];
    const edge = distances.indexOf(Math.min(...distances));
    target.style.setProperty('--ink-origin', ['0% 50%','100% 50%','50% 0%','50% 100%'][edge]);
    target.style.setProperty('--ink-rest', edge < 2 ? 'scaleX(0)' : 'scaleY(0)');
  }, { signal });
  document.addEventListener('pointermove', event => {
    if (!enabled() || event.pointerType === 'touch') return;
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest<HTMLElement>('.nav-search,.nav-archive,.social-links a,.intro-contact a,.blog-shelf-read');
    const nextMagnet = control?.matches('.nav-search,.nav-archive') ? control.querySelector<SVGElement>('svg') : control?.matches('.blog-shelf-read') ? control.querySelector<HTMLElement>('span') : control ?? null;
    if (magnet !== nextMagnet) { reset(); magnet = nextMagnet; }
    x = event.clientX; y = event.clientY;
    if (frame || !magnet) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (magnet && control) {
        const box = control.getBoundingClientRect();
        magnet.style.setProperty('--magnet-x', `${Math.max(-3,Math.min(3,(x-box.left-box.width/2)*.08))}px`);
        magnet.style.setProperty('--magnet-y', `${Math.max(-3,Math.min(3,(y-box.top-box.height/2)*.08))}px`);
      }
    });
  }, { signal, passive: true });
  document.addEventListener('pointerleave', reset, { signal });
  document.addEventListener('keydown', event => { if (event.key === 'Tab') reset(); }, { signal });
  window.addEventListener('blur', reset, { signal });
  reduced.addEventListener('change', reset, { signal });
  fine.addEventListener('change', reset, { signal });
  signal.addEventListener('abort', reset, { once: true });
}
