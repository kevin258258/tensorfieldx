let cleanupReader: (() => void) | undefined;
let pendingLanguageSection: { pathname: string; id: string } | undefined;

export function initArticleReader() {
  cleanupReader?.();
  const reader = document.querySelector<HTMLElement>('[data-article-reader]');
  if (!reader) return;
  const controller = new AbortController();
  const { signal } = controller;
  const sections = [...reader.querySelectorAll<HTMLElement>('.reading-prose :is(h1,h2,h3)[id]')];
  const links = [...reader.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];
  const alternates = [...reader.querySelectorAll<HTMLAnchorElement>('[data-language-alternate]')];
  const alternate = alternates[0];
  const translations: string[] = JSON.parse(alternate?.dataset.sections || '[]');
  const progress = reader.querySelector<HTMLElement>('[data-reading-progress]');
  const counter = reader.querySelector<HTMLElement>('[data-reading-percent]');
  const content = reader.querySelector<HTMLElement>('.reading-prose');
  const mobileContents = reader.querySelector<HTMLDetailsElement>('.reader-mobile-contents');
  let frame = 0;
  let active = '';
  const update = () => {
    frame = 0;
    const offset = window.innerWidth >= 800 ? 170 : 50;
    let index = -1;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= offset + 12) index = i;
    }
    const id = sections[index]?.id || '';
    if (active !== id) {
      active = id;
      for (const link of links) {
        if (link.dataset.tocLink === id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
      // Each translation has the same heading order; IDs may differ across languages.
      for (const link of alternates) link.href = link.dataset.baseHref! + (translations[index] ? `#${translations[index]}` : '');
      const current = reader.querySelector<HTMLElement>('.reader-sidebar [aria-current="location"]');
      const nav = current?.closest('nav');
      if (current && nav) {
        const box = current.getBoundingClientRect();
        const bounds = nav.getBoundingClientRect();
        if (box.top < bounds.top || box.bottom > bounds.bottom) nav.scrollTop += box.top - bounds.top - bounds.height / 2;
      }
    }
    if (content) {
      const rect = content.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight + offset);
      const percent = Math.round(Math.max(0, Math.min(1, (offset - rect.top) / total)) * 100);
      progress?.style.setProperty('--progress', `${percent}%`);
      if (counter) counter.textContent = `${percent}%`;
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, { passive: true, signal });
  window.addEventListener('resize', schedule, { passive: true, signal });
  links.forEach(link => link.addEventListener('click', () => {
    if (mobileContents) mobileContents.open = false;
  }, { signal }));
  alternates.forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = new URL(link.href);
    pendingLanguageSection = { pathname: destination.pathname, id: decodeURIComponent(destination.hash.slice(1)) };
  }, { signal }));
  const observer = new ResizeObserver(schedule);
  if (content) observer.observe(content);
  let anchorFrame = 0;
  document.fonts.ready.then(() => {
    if (signal.aborted) return;
    // Re-anchor after the language-dependent typography has settled.
    anchorFrame = requestAnimationFrame(() => {
      if (signal.aborted) return;
      if (pendingLanguageSection?.pathname === location.pathname) {
        const target = pendingLanguageSection.id ? document.getElementById(pendingLanguageSection.id) : null;
        target?.scrollIntoView({ block: 'start', behavior: 'instant' });
        pendingLanguageSection = undefined;
      }
      schedule();
    });
  });
  schedule();
  cleanupReader = () => { controller.abort(); observer.disconnect(); cancelAnimationFrame(frame); cancelAnimationFrame(anchorFrame); };
}
