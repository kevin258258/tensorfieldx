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
  const list = shelf.querySelector<HTMLElement>('.blog-shelf-list');
  const columns = shelf.querySelector<HTMLElement>('.blog-shelf-columns');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const wide = matchMedia('(min-width: 800px)');
  let pointerFrame = 0, scrollFrame = 0;
  let title: HTMLElement | null = null;
  let pointerX = 0, pointerY = 0;
  let touchOrigin: { x: number; y: number } | undefined;
  let touchDragged = false;
  const resetTitle = () => {
    title?.style.removeProperty('--title-x');
    title?.style.removeProperty('--title-y');
    title?.style.removeProperty('--title-angle');
    title = null;
  };
  const resetPointer = () => { cancelAnimationFrame(pointerFrame); pointerFrame = 0; resetTitle(); paper?.reset(); };
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
  columns?.addEventListener('pointerdown', event => {
    const pointer = event as PointerEvent;
    const overPaper = pointer.target instanceof Element && pointer.target.closest('.blog-shelf-image-link');
    touchOrigin = pointer.pointerType === 'touch' && overPaper ? { x: pointer.clientX, y: pointer.clientY } : undefined;
    touchDragged = false;
  }, { signal, passive: true });
  columns?.addEventListener('pointermove', event => {
    const pointer = event as PointerEvent;
    const touch = pointer.pointerType === 'touch';
    if ((!touch && !fine.matches) || (touch && !touchOrigin) || !wide.matches || reduced.matches || !paperFrame) return;
    if (touch && touchOrigin && Math.hypot(pointer.clientX - touchOrigin.x, pointer.clientY - touchOrigin.y) > 8) touchDragged = true;
    const target = !touch && pointer.target instanceof Element ? pointer.target.closest<HTMLElement>('[data-shelf-entry]') : null;
    if (title !== target) { resetTitle(); title = target; }
    pointerX = pointer.clientX; pointerY = pointer.clientY;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      const box = (title || paperFrame).getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (pointerX - box.left) / box.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (pointerY - box.top) / box.height * 2 - 1));
      paper?.position(x, -y);
      if (title) {
        title.style.setProperty('--title-x', `${x * 12}px`);
        title.style.setProperty('--title-y', `${y * 8}px`);
        title.style.setProperty('--title-angle', `${x * -.65}deg`);
      }
    });
  }, { signal, passive: true });
  columns?.addEventListener('pointerup', event => {
    if ((event as PointerEvent).pointerType === 'touch') { touchOrigin = undefined; resetPointer(); }
  }, { signal, passive: true });
  columns?.addEventListener('pointercancel', () => { touchOrigin = undefined; resetPointer(); }, { signal, passive: true });
  columns?.addEventListener('click', event => {
    if (touchDragged && event.target instanceof Element && event.target.closest('.blog-shelf-image-link')) {
      event.preventDefault(); touchDragged = false;
    }
  }, { signal });
  columns?.addEventListener('pointerleave', resetPointer, { signal });
  // Scroll selects the entry occupying the centre of the index, even without hover.
  list?.addEventListener('scroll', () => {
    if (!wide.matches || scrollFrame) return;
    resetPointer();
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const box = list.getBoundingClientRect();
      const centre = box.top + box.height * .5;
      let nearest = 0, distance = Infinity;
      entries.forEach((entry, index) => {
        const rect = entry.getBoundingClientRect();
        const next = centre < rect.top ? rect.top - centre : centre > rect.bottom ? centre - rect.bottom : 0;
        if (next < distance) { distance = next; nearest = index; }
      });
      show(nearest);
    });
  }, { signal, passive: true });
  shelf.addEventListener('keydown', event => { if (event.key === 'Tab') resetPointer(); }, { signal });
  window.addEventListener('blur', resetPointer, { signal });
  document.addEventListener('astro:before-swap', () => shelfController?.abort(), { signal, once: true });
  reduced.addEventListener('change', () => { copyAnimation?.cancel(); resetPointer(); }, { signal });
  fine.addEventListener('change', resetPointer, { signal });
  signal.addEventListener('abort', () => { copyAnimation?.cancel(); resetPointer(); cancelAnimationFrame(scrollFrame); }, { once: true });
}
