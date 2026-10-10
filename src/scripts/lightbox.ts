/**
 * Click-to-zoom for article images, built on a native <dialog>.
 * The dialog is created once per page and re-created after client-side
 * navigations (Astro swaps body content, so a stale node would be gone).
 */
let trigger: HTMLImageElement | undefined;

export function initLightbox() {
  let dialog = document.getElementById('lightbox') as HTMLDialogElement | null;
  if (!dialog) {
    trigger = undefined;
    dialog = document.createElement('dialog');
    dialog.id = 'lightbox';
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Image preview');

    const img = document.createElement('img');
    img.alt = '';
    const close = document.createElement('button');
    close.className = 'lightbox-close';
    close.type = 'button';
    close.textContent = 'ESC / CLOSE';

    dialog.append(img, close);
    document.body.appendChild(dialog);

    const createdDialog = dialog;
    const dismiss = () => createdDialog.close();
    // clicking the backdrop (the dialog element itself) or the image closes
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target === img || e.target === close) dismiss();
    });
  }

  const dlg = dialog;
  const preview = dlg.querySelector('img')!;
  const english = document.documentElement.lang.startsWith('en');
  dlg.onclose = () => trigger?.focus({ preventScroll: true });
  document.querySelectorAll<HTMLImageElement>('.prose img').forEach((el) => {
    if (el.dataset.lightboxBound) return;
    el.dataset.lightboxBound = '1';
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${english ? 'View image' : '查看图片'}${el.alt ? `: ${el.alt}` : ''}`);
    el.setAttribute('aria-haspopup', 'dialog');
    const open = () => {
      if (dlg.open) return;
      trigger = el;
      preview.src = el.currentSrc || el.src;
      preview.alt = el.alt;
      dlg.showModal();
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      open();
    });
  });
}
