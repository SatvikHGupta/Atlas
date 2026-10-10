// ONE URL normalisation + classification primitive. Author: Satvik Hemant Gupta

const MAX_LENGTH = 2048;
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

const STRIP_INNER = /[\t\n\r]/g;
const STRIP_EDGES = /^[\u0000-\u0020]+|[\u0000-\u0020]+$/g;
const COMPACT = /[\u0000-\u0020\u007f-\u009f]/g;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

export function normalizeUrl(raw) {
  return String(raw).replace(STRIP_EDGES, '').replace(STRIP_INNER, '').replace(/\\/g, '/');
}

function classifyOne(normalized) {
  const compact = normalized.replace(COMPACT, '');
  if (!compact) return 'unsafe';
  if (compact[0] === '#') return 'anchor';
  if (compact.startsWith('//')) return 'unsafe';
  if (compact[0] === '/') {
    const firstSegment = compact.slice(1).split(/[/?#]/)[0];
    return firstSegment.includes(':') ? 'unsafe' : 'internal';
  }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  if (scheme) {
    const s = `${scheme[1].toLowerCase()}:`;
    if (!SAFE_SCHEMES.has(s)) return 'unsafe';
    return s === 'mailto:' ? 'mailto' : 'external';
  }
  return 'relative';
}

const RANK = { unsafe: 4, external: 3, mailto: 3, relative: 2, internal: 1, anchor: 0 };

// value is the browser-normalised string that was actually validated
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
        if (RANK[decodedKind] > RANK[kind] && (decodedKind === 'unsafe' || kind === 'internal' || kind === 'relative')) kind = decodedKind;
      }
    } catch {
      decodeFailed = true;
    }
  }
  return { kind, value: kind === 'unsafe' ? null : normalized, decodeFailed };
}

// Same-site paths only ("/problems?tab=cp")
export function toInternalPath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_LENGTH) return null;
  if (value[0] !== '/' || value.includes('\\') || CONTROL.test(value)) return null;
  const c = classifyUrl(value);
  if (c.kind !== 'internal' || c.decodeFailed) return null;
  return value;
}

// Link allowed in rendered content
export function toSafeLink(href) {
  const c = classifyUrl(href);
  return c.kind === 'unsafe' ? null : c.value;
}

// Absolute http(s) only (outbound links built from data)
export function toExternalUrl(href) {
  const c = classifyUrl(href);
  return c.kind === 'external' ? c.value : null;
}
