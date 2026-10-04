// ONE URL normalisation + classification primitive. Every URL entry point (post-login redirect, Markdown links, the HTML
// sanitizer) is a thin wrapper over classifyUrl(), so they cannot disagree about edge cases. Author: Satvik Hemant Gupta
//
// ATLAS-BUG-005 / 015. Browsers do more than "read the string": for http(s) pages they drop tab/CR/LF anywhere, trim
// leading/trailing control chars and spaces, and treat "\" as "/". So "/\evil.com" is the SAME as "//evil.com" (an external
// host) even though it looks like a harmless path to a regex. The policy therefore classifies the BROWSER-NORMALISED form,
// and also the once-percent-decoded form (so "/%5Cevil.com" and "/%2F%2Fevil.com" cannot sneak through a later decode).

const MAX_LENGTH = 2048;
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

// What a browser silently removes from a URL string before parsing it.
const STRIP_INNER = /[\t\n\r]/g;
const STRIP_EDGES = /^[\u0000-\u0020]+|[\u0000-\u0020]+$/g;
// Anything in C0/C1 control range or space: used for the CONSERVATIVE copy that is only inspected, never returned.
const COMPACT = /[\u0000-\u0020\u007f-\u009f]/g;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

/** Browser-equivalent form of a URL string: edges trimmed, tab/CR/LF removed, backslashes turned into slashes. */
export function normalizeUrl(raw) {
  return String(raw).replace(STRIP_EDGES, '').replace(STRIP_INNER, '').replace(/\\/g, '/');
}

function classifyOne(normalized) {
  const compact = normalized.replace(COMPACT, ''); // conservative copy: "java script:" and "java\u0000script:" collapse
  if (!compact) return 'unsafe';
  if (compact[0] === '#') return 'anchor';
  if (compact.startsWith('//')) return 'unsafe'; // protocol-relative = another host (also what "/\" and "\/" become)
  if (compact[0] === '/') {
    // "/javascript:x" is only a path, but a colon in the first segment is never a real Atlas route: treat as a scheme try
    const firstSegment = compact.slice(1).split(/[/?#]/)[0];
    return firstSegment.includes(':') ? 'unsafe' : 'internal';
  }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  if (scheme) {
    const s = `${scheme[1].toLowerCase()}:`;
    if (!SAFE_SCHEMES.has(s)) return 'unsafe';
    return s === 'mailto:' ? 'mailto' : 'external';
  }
  return 'relative'; // "./x", "../x", "page", "?q=1"
}

const RANK = { unsafe: 4, external: 3, mailto: 3, relative: 2, internal: 1, anchor: 0 };

/**
 * @param {unknown} raw
 * @returns {{ kind: 'anchor'|'internal'|'relative'|'external'|'mailto'|'unsafe', value: string|null, decodeFailed: boolean }}
 *   value is the browser-normalised string that was actually validated (null when unsafe). The WORST verdict across the
 *   raw and once-decoded forms wins, so a link is only as safe as its most dangerous interpretation.
 */
export function classifyUrl(raw) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_LENGTH) {
    return { kind: 'unsafe', value: null, decodeFailed: false };
  }
  const normalized = normalizeUrl(raw);
  let kind = classifyOne(normalized);

  let decodeFailed = false;
  if (kind !== 'unsafe' && normalized.includes('%')) {
    try {
      const decoded = normalizeUrl(decodeURIComponent(normalized));
      if (decoded !== normalized) {
        const decodedKind = classifyOne(decoded);
        // decoding may not turn a same-site/relative link into something worse ("/%5Chost" -> "/\host" -> "//host")
        if (RANK[decodedKind] > RANK[kind] && (decodedKind === 'unsafe' || kind === 'internal' || kind === 'relative')) kind = decodedKind;
      }
    } catch {
      decodeFailed = true;
    }
  }
  return { kind, value: kind === 'unsafe' ? null : normalized, decodeFailed };
}

/** Same-site paths only ("/problems?tab=cp"). Strict: no backslash, no control chars, no malformed escapes. */
export function toInternalPath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_LENGTH) return null;
  if (value[0] !== '/' || value.includes('\\') || CONTROL.test(value)) return null;
  const c = classifyUrl(value);
  if (c.kind !== 'internal' || c.decodeFailed) return null;
  return value;
}

/** Link allowed in rendered content: #anchor, same-site path, relative path, http(s) or mailto. Returns the normalised href or null. */
export function toSafeLink(href) {
  const c = classifyUrl(href);
  return c.kind === 'unsafe' ? null : c.value;
}

/** Absolute http(s) only (outbound links built from data). Returns the normalised URL or null. */
export function toExternalUrl(href) {
  const c = classifyUrl(href);
  return c.kind === 'external' ? c.value : null;
}
