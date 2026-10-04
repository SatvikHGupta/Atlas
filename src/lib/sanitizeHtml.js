/*
  Small allowlist HTML sanitizer that runs the same on the server and in the browser (no DOM needed).
  Why: the old explanation renderer only sanitized in the browser, so the statically rendered HTML carried raw
  marked() output (SEC-06). Everything not on the allowlist is shown as literal text (so prose like `vector<int>`
  stays readable) and every attribute is dropped unless it is explicitly allowed below.
*/

import { toSafeLink } from './urlPolicy.js';

const MARKDOWN_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'li',
  'ol', 'p', 'pre', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul',
]);
// Shiki output: <pre class style><code><span class><span style="color:#..">
const CODE_TAGS = new Set(['pre', 'code', 'span', 'br']);
const VOID_TAGS = new Set(['br', 'hr']);

const SAFE_CLASS = /^[\w\s-]{1,200}$/;
const SAFE_LANG_CLASS = /^language-[a-z0-9+#-]{1,30}$/i;
const SAFE_STYLE = /^[\w\s#:;,.%()-]{1,500}$/;

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", colon: ':', tab: '\t', newline: '\n', sol: '/', lpar: '(', rpar: ')' };

function decodeEntities(text) {
  return text.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));?/gi, (m, hex, dec, name) => {
    if (hex || dec) {
      const code = hex ? parseInt(hex, 16) : parseInt(dec, 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }
    const named = NAMED[name.toLowerCase()];
    return named === undefined ? m : named;
  });
}

const escapeAttr = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeText = (v) => v.replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Returns the cleaned value for an allowed attribute, or null to drop it.
function cleanAttribute(tag, name, rawValue, preset) {
  const value = decodeEntities(rawValue);
  if (preset === 'markdown') {
    if (tag === 'a' && name === 'href') {
      // ATLAS-BUG-005 / 015: same policy as Markdown links and redirects. The old regex let "/\\evil.com" through because
      // it only looked for "//", while browsers read a backslash as a slash.
      return toSafeLink(value);
    }
    if (tag === 'code' && name === 'class') return SAFE_LANG_CLASS.test(value) ? value : null;
    if (tag === 'ol' && name === 'start') return /^\d{1,6}$/.test(value) ? value : null; // numbered lists that start at 3, 4...
    if ((tag === 'td' || tag === 'th') && name === 'align') return /^(left|right|center)$/.test(value) ? value : null;
    return null;
  }
  // 'code' preset
  if (name === 'class') return SAFE_CLASS.test(value) ? value : null;
  // Shiki marks the <pre> focusable so keyboard users can scroll long lines; only the value 0 is allowed
  if (name === 'tabindex' && tag === 'pre') return value === '0' ? value : null;
  if (name === 'style' && (tag === 'pre' || tag === 'span')) {
    return SAFE_STYLE.test(value) && !/url\s*\(|expression|javascript|@import|\\/i.test(value) ? value : null;
  }
  return null;
}

const TAG_RE = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/**
 * @param {string} html untrusted HTML (e.g. marked output or highlighter output)
 * @param {'markdown'|'code'} [preset]
 * @returns {string} HTML that only contains allowlisted tags and attributes
 */
export function sanitizeHtml(html, preset = 'markdown') {
  if (!html) return '';
  const allowed = preset === 'code' ? CODE_TAGS : MARKDOWN_TAGS;
  let out = '';
  let last = 0;
  let match;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(String(html))) !== null) {
    out += escapeText(String(html).slice(last, match.index));
    last = match.index + match[0].length;
    if (match[0].startsWith('<!--')) continue; // comments are dropped
    const tag = match[1].toLowerCase();
    if (!allowed.has(tag)) { out += escapeText(match[0]); continue; } // unknown tag -> visible text
    if (match[0].startsWith('</')) { if (!VOID_TAGS.has(tag)) out += `</${tag}>`; continue; }

    let attrs = '';
    ATTR_RE.lastIndex = 0;
    let attr;
    while ((attr = ATTR_RE.exec(match[2])) !== null) {
      const name = attr[1].toLowerCase();
      const cleaned = cleanAttribute(tag, name, attr[2] ?? attr[3] ?? attr[4] ?? '', preset);
      if (cleaned !== null) attrs += ` ${name}="${escapeAttr(cleaned)}"`;
    }
    if (tag === 'a' && attrs.includes(' href=')) attrs += ' rel="noopener noreferrer"';
    out += `<${tag}${attrs}>`;
  }
  return out + escapeText(String(html).slice(last));
}
