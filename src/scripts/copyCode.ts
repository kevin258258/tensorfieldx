/**
 * Adds a "Copy" button to every <pre> code block (once per block).
 */
export function initCopyCode() {
  document.querySelectorAll('pre').forEach((pre) => {
    if (pre.parentElement?.classList.contains('group/code')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'relative group/code overflow-x-auto';
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const btn = document.createElement('button');
    btn.className =
      'copy-btn absolute top-2 right-2 p-2 md:p-1.5 rounded bg-primary/5 border border-edge text-muted hover:text-accent hover:border-accent/30 opacity-100 md:opacity-0 md:group-hover/code:opacity-100 transition-all text-xs font-mono';
    btn.textContent = 'Copy';
    btn.onclick = async () => {
      const code = pre.querySelector('code')?.textContent || pre.textContent || '';
      await navigator.clipboard.writeText(code);
      btn.textContent = 'Copied!';
      btn.classList.add('text-accent');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('text-accent');
      }, 2000);
    };
    wrapper.appendChild(btn);
  });
}
