/** Keep the block frame separate from inline code, and preserve copied whitespace. */
export function initCopyCode() {
  const english = document.documentElement.lang.startsWith('en');
  document.querySelectorAll<HTMLPreElement>('pre').forEach((pre) => {
    if (pre.parentElement?.classList.contains('group/code')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block group/code';
    const toolbar = document.createElement('div');
    toolbar.className = 'code-toolbar';
    const label = document.createElement('span');
    label.textContent = pre.dataset.lang || 'TEXT';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    const idle = english ? 'Copy' : '复制';
    btn.textContent = idle;
    btn.setAttribute('aria-label', english ? 'Copy code' : '复制代码');
    btn.setAttribute('aria-live', 'polite');
    btn.onclick = async () => {
      const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = english ? 'Copied' : '已复制';
      } catch {
        btn.textContent = english ? 'Select to copy' : '请选中复制';
        const range = document.createRange();
        range.selectNodeContents(pre);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      window.setTimeout(() => { if (btn.isConnected) btn.textContent = idle; }, 2000);
    };
    toolbar.append(label, btn);
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.append(toolbar, pre);
    pre.tabIndex = 0;
    pre.setAttribute('aria-label', english ? 'Code block' : '代码块');
  });
}
