/**
 * Click-to-zoom for article images, built on a native <dialog>.
 * The dialog is created once per page and re-created after client-side
 * navigations (Astro swaps body content, so a stale node would be gone).
 */
export function initLightbox() {
  let dialog = document.getElementById('lightbox') as HTMLDialogElement | null;
  if (!dialog) {
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

    const dismiss = () => dialog.close();
    // clicking the backdrop (the dialog element itself) or the image closes
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target === img || e.target === close) dismiss();
    });
  }

  const dlg = dialog;
  const preview = dlg.querySelector('img')!;
  document.querySelectorAll<HTMLImageElement>('.prose img').forEach((el) => {
    if (el.dataset.lightboxBound) return;
    el.dataset.lightboxBound = '1';
    el.addEventListener('click', () => {
      preview.src = el.currentSrc || el.src;
      preview.alt = el.alt;
      dlg.showModal();
    });
  });
}
