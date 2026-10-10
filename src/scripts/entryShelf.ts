import { createShelfPaper } from './shelfPaper';

export interface ShelfEntry {
  title: string;
  description: string;
  tags: string[];
  href?: string;
  image?: string;
  year?: number;
  date?: number;
  min?: number;
  meta?: string;
}

let shelfController: AbortController | undefined;

export function initEntryShelf() {
  shelfController?.abort();
  const shelf = document.querySelector<HTMLElement>('[data-entry-shelf]');
  if (!shelf) return;
  shelfController = new AbortController();
  const { signal } = shelfController;
  const data: ShelfEntry[] = JSON.parse(shelf.dataset.entries || '[]');
  const entries = [...shelf.querySelectorAll<HTMLElement>('[data-shelf-entry]')];
  const visuals = [...shelf.querySelectorAll<HTMLElement>('[data-shelf-visual]')];
  const paperFrame = shelf.querySelector<HTMLElement>('.blog-shelf-image-frame');
  const paperImages = [...(paperFrame?.querySelectorAll<HTMLImageElement>('img') ?? [])];
  const paper = paperFrame ? createShelfPaper(paperFrame, paperImages.map(image => image.src), signal) : undefined;
  let selected = -1;
  let copyAnimation: Animation | undefined;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function show(index: number) {
    if (selected === index || !data[index]) return;
    const changing = selected >= 0;
    selected = index;
    paper?.select(index);
    const entry = data[index];
    for (const visual of visuals) {
      const active = Number(visual.dataset.shelfVisual) === index;
      visual.classList.toggle('is-active', active);
      visual.setAttribute('aria-hidden', String(!active));
    }
    entries.forEach(link => { link.dataset.previewActive = String(Number(link.dataset.shelfEntry) === index); });
    const description = shelf!.querySelector('[data-shelf-preview-description]');
    if (description) description.textContent = entry.description;
    const tags = shelf!.querySelector('[data-shelf-preview-tags]');
    tags?.replaceChildren(...entry.tags.map(tag => {
      const li = document.createElement('li');
      li.textContent = tag;
      return li;
    }));
    shelf!.querySelectorAll<HTMLAnchorElement>('[data-shelf-preview-link]').forEach(link => {
      link.hidden = !entry.href;
      if (entry.href) link.href = entry.href;
      link.setAttribute('aria-label', `${shelf!.dataset.linkLabel}: ${entry.title}`);
    });
    const number = shelf!.querySelector('[data-shelf-preview-index]');
    if (number) number.textContent = `${String(index + 1).padStart(2, '0')} / ${String(entries.length).padStart(2, '0')}`;
    copyAnimation?.cancel();
    if (changing && !reduced.matches) copyAnimation = shelf!.querySelector('.blog-shelf-preview-copy')?.animate([
      { opacity: .35, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  for (const link of entries) {
    const activate = () => show(Number(link.dataset.shelfEntry));
    link.addEventListener('pointerenter', activate, { signal });
    link.addEventListener('focus', activate, { signal });
  }
  if (entries.length) show(0);
  shelf.querySelector('.blog-shelf-columns')?.addEventListener('pointermove', event => {
    const pointer = event as PointerEvent;
    if (pointer.pointerType === 'touch' || !paperFrame) return;
    const target = pointer.target instanceof Element ? pointer.target.closest<HTMLElement>('[data-shelf-entry]') : null;
    const box = (target || paperFrame).getBoundingClientRect();
    paper?.position((pointer.clientX - box.left) / box.width * 2 - 1, 1 - (pointer.clientY - box.top) / box.height * 2);
  }, { signal, passive: true });
  shelf.querySelector('.blog-shelf-columns')?.addEventListener('pointerleave', () => paper?.reset(), { signal });
  shelf.addEventListener('keydown', event => { if (event.key === 'Tab') paper?.reset(); }, { signal });
  window.addEventListener('blur', () => paper?.reset(), { signal });
  document.addEventListener('astro:before-swap', () => shelfController?.abort(), { signal, once: true });
  reduced.addEventListener('change', () => copyAnimation?.cancel(), { signal });
  signal.addEventListener('abort', () => copyAnimation?.cancel(), { once: true });
}
