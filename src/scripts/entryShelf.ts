import { DEFAULT_COVER } from '../lib/covers';

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
  category?: string;
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
  const wide = matchMedia('(min-width: 800px)');
  const desktopFrame = shelf.querySelector<HTMLElement>('.blog-shelf-preview .blog-shelf-image-frame');
  const mobileFrames = [...shelf.querySelectorAll<HTMLElement>('[data-shelf-mobile-paper]')];
  let paperFrame: HTMLElement | null | undefined;
  let sheet: HTMLElement | null | undefined;
  let selected = -1;
  let copyAnimation: Animation | undefined;
  let entrance: Animation | undefined;
  const list = shelf.querySelector<HTMLElement>('.blog-shelf-list');
  const columns = shelf.querySelector<HTMLElement>('.blog-shelf-columns');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
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
  const resetPointer = () => {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    resetTitle();
    sheet?.style.removeProperty('--cover-x');
    sheet?.style.removeProperty('--cover-y');
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visibleEntries = () => entries.filter(entry => !entry.hidden);
  const mountPaper = (index: number) => {
    const next = wide.matches ? desktopFrame : mobileFrames[index];
    if (paperFrame === next) return;
    resetPointer();
    entrance?.cancel();
    paperFrame = next;
    sheet = next?.querySelector<HTMLElement>('.blog-shelf-sheet');
  };
  function show(index: number) {
    if (selected === index || !data[index]) return;
    const changing = selected >= 0;
    selected = index;
    mountPaper(index);
    const entry = data[index];
    for (const visual of visuals) {
      const active = visual.dataset.shelfVisual === (entry.image || DEFAULT_COVER);
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
    const visible = visibleEntries();
    if (number) number.textContent = `${String(visible.indexOf(entries[index]) + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`;
    copyAnimation?.cancel();
    if (changing && !reduced.matches && !document.hidden) {
      entrance?.cancel();
      if (paperFrame?.getClientRects().length) entrance = sheet?.animate([
        { translate: wide.matches ? '0 5px' : '0 9px', scale: '.987' },
        { translate: '0 0', scale: '1' },
      ], { duration: 550, easing: 'cubic-bezier(.18,.72,.25,1)' });
      if (wide.matches) copyAnimation = shelf!.querySelector('.blog-shelf-preview-copy')?.animate([
        { opacity: .35, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  }
  const filters = [...shelf.querySelectorAll<HTMLButtonElement>('[data-shelf-filter]')];
  for (const button of filters) button.addEventListener('click', () => {
    const category = button.dataset.shelfFilter;
    entries.forEach((entry, index) => { entry.hidden = category !== 'All' && data[index].category !== category; });
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    const visible = visibleEntries();
    entries.forEach(entry => entry.toggleAttribute('data-shelf-lead', entry === visible[0]));
    const count = shelf!.querySelector('[data-shelf-count]');
    if (count) count.textContent = `${visible.length} ${visible.length === 1 ? 'entry' : 'entries'}`;
    if (wide.matches) list?.scrollTo({ top: 0 });
    else window.scrollTo({ top: 0, behavior: 'instant' });
    selected = -1;
    if (visible[0]) show(Number(visible[0].dataset.shelfEntry));
  }, { signal });
  for (const link of entries) {
    const activate = () => show(Number(link.dataset.shelfEntry));
    link.addEventListener('pointerenter', activate, { signal });
    link.addEventListener('focus', activate, { signal });
  }
  if (entries.length) show(0);
  else mountPaper(0);
  columns?.addEventListener('pointerdown', event => {
    const pointer = event as PointerEvent;
    const overPaper = pointer.target instanceof Element && pointer.target.closest('.blog-shelf-image-link, [data-shelf-mobile-paper]');
    if (overPaper && !wide.matches) show(Number(overPaper.closest<HTMLElement>('[data-shelf-entry]')?.dataset.shelfEntry));
    touchOrigin = pointer.pointerType === 'touch' && overPaper ? { x: pointer.clientX, y: pointer.clientY } : undefined;
    touchDragged = false;
  }, { signal, passive: true });
  columns?.addEventListener('pointermove', event => {
    const pointer = event as PointerEvent;
    const touch = pointer.pointerType === 'touch';
    if ((!touch && !fine.matches) || (touch && !touchOrigin) || reduced.matches || !paperFrame) return;
    if (touch && touchOrigin && Math.hypot(pointer.clientX - touchOrigin.x, pointer.clientY - touchOrigin.y) > 8) touchDragged = true;
    const target = wide.matches && !touch && pointer.target instanceof Element ? pointer.target.closest<HTMLElement>('[data-shelf-entry]') : null;
    if (title !== target) { resetTitle(); title = target; }
    pointerX = pointer.clientX; pointerY = pointer.clientY;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      if (!paperFrame || !sheet) return;
      const box = (title || paperFrame).getBoundingClientRect();
      if (!box.width || !box.height) return;
      const x = Math.max(-1, Math.min(1, (pointerX - box.left) / box.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (pointerY - box.top) / box.height * 2 - 1));
      // The print drifts opposite the pointer. Keep it closer to rest while reading titles.
      const strength = title ? .28 : touch ? .65 : 1;
      sheet.style.setProperty('--cover-x', String(x * strength));
      sheet.style.setProperty('--cover-y', String(y * strength));
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
    if (touchDragged && event.target instanceof Element && event.target.closest('.blog-shelf-image-link, [data-shelf-mobile-paper]')) {
      event.preventDefault(); touchDragged = false;
    }
  }, { signal });
  columns?.addEventListener('pointerleave', resetPointer, { signal });
  // Scroll selects the entry occupying the centre of the index, even without hover.
  const selectFromScroll = () => {
    if (scrollFrame) return;
    resetPointer();
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const box = list?.getBoundingClientRect();
      const centre = wide.matches && box ? box.top + box.height * .5 : innerHeight * .55;
      let nearest = -1, distance = Infinity;
      entries.forEach((entry, index) => {
        if (entry.hidden) return;
        const rect = (wide.matches ? entry : mobileFrames[index]).getBoundingClientRect();
        if (!rect.width) return;
        const next = wide.matches ? Math.max(rect.top - centre, centre - rect.bottom, 0) : Math.abs(rect.top + rect.height * .5 - centre);
        if (next < distance) { distance = next; nearest = index; }
      });
      show(nearest);
    });
  };
  list?.addEventListener('scroll', () => { if (wide.matches) selectFromScroll(); }, { signal, passive: true });
  window.addEventListener('scroll', () => { if (!wide.matches) selectFromScroll(); }, { signal, passive: true });
  wide.addEventListener('change', () => { resetPointer(); mountPaper(Math.max(0, selected)); selectFromScroll(); }, { signal });
  shelf.addEventListener('keydown', event => { if (event.key === 'Tab') resetPointer(); }, { signal });
  window.addEventListener('blur', resetPointer, { signal });
  document.addEventListener('astro:before-swap', () => shelfController?.abort(), { signal, once: true });
  reduced.addEventListener('change', () => { copyAnimation?.cancel(); entrance?.cancel(); resetPointer(); }, { signal });
  fine.addEventListener('change', resetPointer, { signal });
  signal.addEventListener('abort', () => { copyAnimation?.cancel(); entrance?.cancel(); resetPointer(); cancelAnimationFrame(scrollFrame); }, { once: true });
}
