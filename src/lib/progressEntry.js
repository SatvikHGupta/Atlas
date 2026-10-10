// Slim/expand helpers, size estimates and solve planning for progress and bookmark entries. Author: Satvik Hemant Gupta

export const VALID_STATUSES = ['solved', 'attempted'];

export const WARN_BYTES = 700 * 1024;
export const LIMIT_BYTES = 900 * 1024;
const DOC_OVERHEAD_BYTES = 64;

const MAX_SOLVE_COUNT = 1_000_000;
const MAX_ID_LENGTH = 200;
const PROGRESS_FIELDS = new Set(['status', 'updated_at', 'first_solved_at', 'solve_count', 'canonical_id']);
const BOOKMARK_FIELDS = new Set(['bookmarked_at', 'canonical_id']);

export function isValidStatus(status) {
  return VALID_STATUSES.includes(status);
}

let encoder = null;
function byteLength(str) {
  if (typeof TextEncoder === 'undefined') return str.length;
  if (!encoder) encoder = new TextEncoder();
  return encoder.encode(str).length;
}

// Firestore Timestamp (or Date, or {seconds}) -> ISO string
export function toIso(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  try {
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value.seconds === 'number') {
      const ms = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
      return new Date(ms).toISOString();
    }
  } catch {
    return null;
  }
  return null;
}

// Storage shape: no redundant inner canonical_id, no null fields
export function slimEntry(entry) {
  const out = {};
  for (const [key, value] of Object.entries(entry || {})) {
    if (key === 'canonical_id' || value == null) continue;
    out[key] = value;
  }
  return out;
}

// In-memory shape the rest of the app expects
export function expandEntry(id, raw, kind = 'progress') {
  if (!raw || typeof raw !== 'object') return null;
  if (kind === 'progress') {
    if (!isValidStatus(raw.status)) return null;
    return {
      canonical_id: id,
      status: raw.status,
      updated_at: toIso(raw.updated_at),
      first_solved_at: toIso(raw.first_solved_at),
      solve_count: Math.min(MAX_SOLVE_COUNT, Math.max(0, Math.floor(Number(raw.solve_count)) || 0)),
    };
  }
  return { canonical_id: id, bookmarked_at: toIso(raw.bookmarked_at) };
}

// {key: rawEntry} -> {canonical_id: entry}
export function expandItemsMap(raw, kind = 'progress', keyToId = (k) => k) {
  const items = {};
  for (const [key, value] of Object.entries(raw || {})) {
    const id = value?.canonical_id || keyToId(key);
    const entry = expandEntry(id, value, kind);
    if (entry) items[id] = entry;
  }
  return items;
}

export function slimItemsMap(items) {
  const out = {};
  for (const [id, entry] of Object.entries(items || {})) out[id] = slimEntry(entry);
  return out;
}

export function estimateEntryBytes(id, entry) {
  return byteLength(String(id)) + byteLength(JSON.stringify(slimEntry(entry))) + 4;
}

export function estimateItemsBytes(items) {
  let total = DOC_OVERHEAD_BYTES;
  for (const [id, entry] of Object.entries(items || {})) {
    total += estimateEntryBytes(id, entry);
  }
  return total;
}

// 'ok' | 'warn' | 'full'
export function capacityLevel(usedBytes) {
  if (usedBytes >= LIMIT_BYTES) return 'full';
  if (usedBytes >= WARN_BYTES) return 'warn';
  return 'ok';
}

// solve_count and first_solved_at come from the SERVER copy read inside
export function planSolve(canonicalId, serverEntry, sentinel, nowIso) {
  if (serverEntry?.status === 'solved') {
    return { changed: false, local: expandEntry(canonicalId, serverEntry) };
  }
  const solveCount = (Number(serverEntry?.solve_count) || 0) + 1;
  const firstSolved = serverEntry?.first_solved_at || sentinel;
  return {
    changed: true,
    write: {
      status: 'solved',
      updated_at: sentinel,
      first_solved_at: firstSolved,
      solve_count: solveCount,
    },
    local: {
      canonical_id: canonicalId,
      status: 'solved',
      updated_at: nowIso,
      first_solved_at: toIso(serverEntry?.first_solved_at) || nowIso,
      solve_count: solveCount,
    },
  };
}

// "attempted" must never overwrite "solved"
export function planAttempt(canonicalId, serverEntry, sentinel, nowIso) {
  if (serverEntry?.status === 'solved') {
    return { changed: false, blocked: true, local: expandEntry(canonicalId, serverEntry) };
  }
  if (serverEntry?.status === 'attempted') {
    return { changed: false, blocked: false, local: expandEntry(canonicalId, serverEntry) };
  }
  return {
    changed: true,
    blocked: false,
    write: { status: 'attempted', updated_at: sentinel },
    local: {
      canonical_id: canonicalId,
      status: 'attempted',
      updated_at: nowIso,
      first_solved_at: toIso(serverEntry?.first_solved_at),
      solve_count: Number(serverEntry?.solve_count) || 0,
    },
  };
}

// Pure transition table used for the cheap local pre-check
export function isAllowedTransition(fromStatus, toStatus) {
  if (!isValidStatus(toStatus)) return false;
  if (fromStatus === 'solved' && toStatus === 'attempted') return false;
  return true;
}

// 42 duplicate problems were merged into one canonical id
export function planIdMoves(rawItems, twinToCanonical) {
  if (!rawItems || !twinToCanonical) return [];
  const moves = [];
  for (const [oldId, newId] of Object.entries(twinToCanonical)) {
    if (rawItems[oldId] != null && rawItems[newId] == null) moves.push([oldId, newId]);
  }
  return moves;
}

export function applyIdMoves(rawItems, moves) {
  if (!moves.length) return rawItems;
  const next = { ...rawItems };
  for (const [oldId, newId] of moves) {
    next[newId] = next[oldId];
    delete next[oldId];
  }
  return next;
}

// Firestore rules cannot loop over map entries
const isStamp = (v) => v == null || typeof v === 'string' || (typeof v === 'object' && v !== null);

export function validateIdKey(id) {
  if (typeof id !== 'string' || id.length === 0) return { ok: false, reason: 'id must be a non-empty string' };
  if (id.length > MAX_ID_LENGTH) return { ok: false, reason: 'id too long' };
  return { ok: true };
}

export function validateProgressEntry(id, value) {
  const k = validateIdKey(id);
  if (!k.ok) return k;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, reason: 'entry must be an object' };
  for (const key of Object.keys(value)) {
    if (!PROGRESS_FIELDS.has(key)) return { ok: false, reason: `unknown field ${key}` };
  }
  if (!isValidStatus(value.status)) return { ok: false, reason: 'invalid status' };
  if (!isStamp(value.updated_at) || !isStamp(value.first_solved_at)) return { ok: false, reason: 'bad timestamp' };
  if (value.solve_count !== undefined) {
    const n = value.solve_count;
    if (!Number.isInteger(n) || n < 0 || n > MAX_SOLVE_COUNT) return { ok: false, reason: 'bad solve_count' };
  }
  if (value.status === 'solved' && !(Number(value.solve_count) >= 1)) return { ok: false, reason: 'solved needs solve_count >= 1' };
  return { ok: true };
}

export function validateBookmarkEntry(id, value) {
  const k = validateIdKey(id);
  if (!k.ok) return k;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, reason: 'entry must be an object' };
  for (const key of Object.keys(value)) {
    if (!BOOKMARK_FIELDS.has(key)) return { ok: false, reason: `unknown field ${key}` };
  }
  if (!isStamp(value.bookmarked_at)) return { ok: false, reason: 'bad timestamp' };
  return { ok: true };
}
