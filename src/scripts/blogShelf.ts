import type { ArchiveEntry } from '../lib/archive';

let shelfController: AbortController | undefined;

export function initBlogShelf() {
  shelfController?.abort();
  const shelf = document.querySelector<HTMLElement>('[data-blog-shelf]');
  if (!shelf) return;
  shelfController = new AbortController();
  const { signal } = shelfController;
  const data: ArchiveEntry[] = JSON.parse(shelf.dataset.entries || '[]');
  const entries = [...shelf.querySelectorAll<HTMLAnchorElement>('[data-blog-entry]')];
  const visuals = [...shelf.querySelectorAll<HTMLElement>('[data-blog-visual]')];
  const filters = [...shelf.querySelectorAll<HTMLButtonElement>('[data-blog-filter]')];
  let selected = -1;
  function show(index: number) {
    if (selected === index || !data[index]) return;
    selected = index;
    const entry = data[index];
    for (const visual of visuals) {
      const active = Number(visual.dataset.blogVisual) === index;
      visual.classList.toggle('is-active', active);
      visual.setAttribute('aria-hidden', String(!active));
    }
    entries.forEach(link => { link.dataset.previewActive = String(Number(link.dataset.blogEntry) === index); });
    const description = shelf!.querySelector('[data-blog-preview-description]');
    if (description) description.textContent = entry.description;
    const tags = shelf!.querySelector('[data-blog-preview-tags]');
    tags?.replaceChildren(...entry.tags.map(tag => {
      const li = document.createElement('li');
      li.textContent = tag;
      return li;
    }));
    shelf!.querySelectorAll<HTMLAnchorElement>('[data-blog-preview-link]').forEach(link => {
      link.href = entry.href;
      link.setAttribute('aria-label', `Read: ${entry.title}`);
    });
    const visible = entries.filter(link => !link.hidden);
    const number = shelf!.querySelector('[data-blog-preview-index]');
    if (number) number.textContent = `${String(visible.findIndex(link => Number(link.dataset.blogEntry) === index) + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`;
  }
  for (const link of entries) {
    const activate = () => show(Number(link.dataset.blogEntry));
    link.addEventListener('pointerenter', activate, { signal });
    link.addEventListener('focus', activate, { signal });
  }
  for (const button of filters) {
    button.addEventListener('click', () => {
      const topic = button.dataset.blogFilter;
      entries.forEach(link => { link.hidden = topic !== 'All' && link.dataset.topic !== topic; });
      filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      const visible = entries.filter(link => !link.hidden);
      const count = shelf.querySelector('[data-blog-count]');
      if (count) count.textContent = `${visible.length} ${visible.length === 1 ? 'entry' : 'entries'}`;
      selected = -1;
      if (visible[0]) show(Number(visible[0].dataset.blogEntry));
    }, { signal });
  }
  if (entries.length) show(0);
}
