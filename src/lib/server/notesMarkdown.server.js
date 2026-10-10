// Sanitised Markdown renderer for notes (marked + Shiki). Author: Satvik Hemant Gupta
import { Marked } from 'marked';
import { highlightCode } from './highlight.server.js';
import { toSafeLink } from '../urlPolicy.js';

// Escape text for HTML element content and attribute values
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// / only http, https, mailto, #anchors and same-site/relative URLs pass
export function safeUrl(href) {
  return toSafeLink(href);
}

// Render note Markdown to safe HTML
export async function renderNoteMarkdown(markdown, highlight = highlightCode) {
  const fences = [];
  const marked = new Marked({
    gfm: true,
    breaks: true,
    renderer: {
      html(token) {
        return escapeHtml(token.text ?? token.raw ?? '');
      },
      code(token) {
        const lang =
          String(token.lang || '')
            .trim()
            .split(/\s+/)[0] || 'text';
        fences.push({ code: token.text, lang });
        return `<div data-atlas-fence="${fences.length - 1}"></div>\n`;
      },
      link(token) {
        const inner = this.parser.parseInline(token.tokens);
        const url = safeUrl(token.href);
        if (!url) return inner;
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
        return `<a href="${escapeHtml(url)}"${title}>${inner}</a>`;
      },
      image(token) {
        const url = safeUrl(token.href);
        const alt = escapeHtml(token.text);
        if (!url) return alt;
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
        return `<img src="${escapeHtml(url)}" alt="${alt}"${title}>`;
      },
    },
  });

  let html = marked.parse(String(markdown ?? ''));
  for (let i = 0; i < fences.length; i++) {
    const block = await highlight(fences[i].code, fences[i].lang);
    html = html.replace(`<div data-atlas-fence="${i}"></div>`, () => block);
  }
  return html;
}
