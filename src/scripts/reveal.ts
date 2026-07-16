/**
 * Zero-dependency scroll reveal — replaces GSAP ScrollTrigger.
 * Keeps the existing `data-animate` attribute API:
 *   data-animate="fade-up | fade-in | slide-left | slide-right | scale-in"
 *   data-animate="stagger-fade-up" (children animate in sequence)
 */
export function initReveal() {
  const targets = document.querySelectorAll<HTMLElement>('[data-animate]');
  if (!targets.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('reveal-visible');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0 },
  );

  targets.forEach((el) => {
    if (el.dataset.animate === 'stagger-fade-up') {
      Array.from(el.children).forEach((child, i) => {
        const c = child as HTMLElement;
        c.classList.add('reveal');
        c.style.transitionDelay = `${Math.min(i * 60, 480)}ms`;
        io.observe(c);
      });
    } else {
      el.classList.add('reveal');
      io.observe(el);
    }
  });
}
