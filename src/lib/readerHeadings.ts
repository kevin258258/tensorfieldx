import katex from 'katex';

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

/** Astro's heading text includes both KaTeX's accessible and visual representations. */
export function readerHeadings(body: string, headings: { depth: number; slug: string; text: string }[]) {
  const prose = body.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '');
  const raw = [...prose.matchAll(/^#{1,3}\s+(.+)$/gm)].map(match => match[1]);
  return headings.filter(heading => heading.depth <= 3).map((heading, index) => {
    const source = raw[index] || heading.text;
    const parts = source.split(/(\$[^$]+\$)/g);
    const html = parts.map(part => part.startsWith('$') && part.endsWith('$')
      ? katex.renderToString(part.slice(1, -1), { throwOnError: false, output: 'html' })
      : escapeHtml(part.replace(/`([^`]+)`/g, '$1'))).join('');
    return { ...heading, html };
  });
}
