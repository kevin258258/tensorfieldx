/**
 * Zero-dependency scroll reveal — replaces GSAP ScrollTrigger.
 * Keeps the existing `data-animate` attribute API:
 *   data-animate="fade-up | fade-in | slide-left | slide-right | scale-in"
 *   data-animate="stagger-fade-up" (children animate in sequence)
 */
let observer: IntersectionObserver | undefined;

export function initReveal() {
  observer?.disconnect();
  const additions = document.querySelectorAll<HTMLElement>('.hero-intro > *, .blog-shelf-heading, .blog-shelf-entry, .blog-shelf-preview-number, .blog-shelf-image-link, .blog-shelf-preview-copy, .reader-header, .reader-sidebar-sticky, .footer-social');
  additions.forEach((element, index) => {
    if (element.dataset.animate) return;
    element.dataset.animate = 'fade-up';
    element.dataset.motionReveal = 'true';
    element.style.setProperty('--reveal-delay', `${Math.min(index % 6 * 45, 180)}ms`);
  });
  const targets = document.querySelectorAll<HTMLElement>('[data-animate]');
  if (!targets.length) return;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach(element => {
      element.classList.add('reveal-visible');
      if (element.dataset.animate === 'stagger-fade-up') [...element.children].forEach(child => child.classList.add('reveal-visible'));
    });
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('reveal-visible');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -24px 0px', threshold: 0 },
  );
  observer = io;

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
  document.addEventListener('astro:before-swap', () => io.disconnect(), { once: true });
}
