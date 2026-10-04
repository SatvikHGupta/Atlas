'use client';

/* Client-side Firestore access for user data (progress/bookmarks/profile). Schema unchanged from the old app: users/{uid}      { display_name, photo_url, created_at, last_seen_at } progress/{uid}   { items: { [safeKey]: { status, updated_at, first_solved_at, solve_count, canonical_id } } } bookmarks/{uid}  { items: { [safeKey]: { bookmarked_at, canonical_id } } } BUG FIX: canonical_id is used as a Firestore field-path segment (`items.${canonicalId}`) in updateDoc() calls. Firestore field paths split on `.`, so any id containing a dot silently writes/deletes the wrong nested key instead of erroring - a real, if rare, data-corruption risk (worth a one-time grep of the dataset for any canonical_id with a `.` in it). Fixed by key-encoding: dots (and any other Firestore path-special character) are escaped before use as a map key, and the real canonical_id is stored inside the entry value so nothing is lost. `escapeFieldKey`/`unescapeFieldKey` are the only new functions here - everything else is a straight port. */

/* COST FIX (read-quota pass): this used to run watchProgress/watchBookmarks/watchUser as onSnapshot listeners. Since progress/bookmarks are single map-documents per user (not per-problem docs), the listener itself was never the "N cards = N reads" bug - but every one of the user's OWN writes (mark solved, toggle bookmark) re-triggers that same listener with a fresh snapshot, and Firestore bills that echo as another document read. For an active user that roughly doubles read volume for no benefit (we already know the new value, we just wrote it). Replaced with one-time getDoc() on session start + optimistic local state (see auth.store.js) - the write still costs 1 write, but no longer echoes back as a read. watchUser is gone as a listener too: the profile doc is still written (see syncUserProfile below) but the 12h throttle check that used to require reading it back is now done from localStorage instead, so users/{uid} is write-only from the client - never read. */

// NOTE (BUG-060/189/067): entries are now written slim (no inner canonical_id, no null fields), updated_at/first_solved_at are server timestamps that the read path turns back into ISO strings, and 'skipped' is no longer a valid status. Old-shape docs still read fine. Single-doc size is guarded client-side; sharding is deferred, see docs/adr/0001-firestore-sharding.md.

import {
  doc, getDoc, setDoc, updateDoc, deleteField, runTransaction, writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase.js';
import { createWriteQueue } from './writeQueue.js';
import { createBookmarkQueue } from './bookmarkQueue.js';
import {
  isValidStatus, slimEntry, expandItemsMap, planSolve, planAttempt, planIdMoves, applyIdMoves,
  validateBookmarkEntry, validateProgressEntry,
} from '../lib/progressEntry.js';
import idAliasMap from '../../data/id-alias-map.json';

const TWIN_TO_CANONICAL = idAliasMap.twin_to_canonical || {};

const LAST_SEEN_THROTTLE_MS = 12 * 60 * 60 * 1000;
const PROFILE_SYNC_KEY_PREFIX = 'atlas_profile_synced_v1_'; // localStorage, per-uid: last successful syncUserProfile timestamp (write throttle only, see syncUserProfile)

// QUOTA GUARD: true only when the daily Firestore free-tier cap (50k reads / 20k writes, resets midnight
// Pacific) has actually been hit - the SDK surfaces this as a 'resource-exhausted' error code on every call
// until the reset. Callers use this to flip a per-resource "degraded" flag (see auth.store.js) so write-triggering
// buttons disable themselves instead of firing calls that are guaranteed to fail.
export function isQuotaExhausted(err) {
  return err?.code === 'resource-exhausted';
}

// Firestore field paths are dot-delimited and also treat backtick/backslash specially in the dotted-path string form used by updateDoc's bracket syntax. Escaping just the characters that matter for path-splitting is enough since canonical_ids are UUIDs in this dataset (see [[oc-pipeline]]) and won't contain these in practice - this is a defensive fix, not a currently-triggered bug.
function escapeFieldKey(key) {
  return String(key).replace(/\./g, '\u2024'); // one-dot leader, visually similar, never appears in real ids
}
function unescapeFieldKey(key) {
  return String(key).replace(/\u2024/g, '.');
}

// shared unpack: {items: {safeKey: entry}} doc -> {canonical_id: entry} map. Timestamps become ISO strings and entries with an unknown status are dropped (see expandItemsMap).
function unpackItemsDoc(snap, kind) {
  // 'estimate' so a write still pending in the local cache reads back as a date, not null
  const raw = snap.exists() ? (snap.data({ serverTimestamps: 'estimate' }).items || {}) : {};
  // BUG-11: entries saved under a merged twin id show up under the canonical id straight away
  const moves = planIdMoves(raw, TWIN_TO_CANONICAL);
  return { items: expandItemsMap(applyIdMoves(raw, moves), kind, unescapeFieldKey), moves, raw };
}

// Best-effort, once per affected user: persist the move (canonical key written, old key removed) so the server copy
// agrees with what the app shows. A failure is harmless, the same move is simply planned again on the next load.
async function persistIdMoves(collectionName, uid, moves, raw) {
  if (!moves.length) return;
  try {
    const patch = {};
    for (const [oldId, newId] of moves) {
      patch[`items.${escapeFieldKey(newId)}`] = raw[oldId];
      patch[`items.${escapeFieldKey(oldId)}`] = deleteField();
    }
    await updateDoc(doc(getFirebaseFirestore(), collectionName, uid), patch);
  } catch (err) {
    console.warn(`[firestore] twin-id migration for ${collectionName} postponed:`, err?.code || err?.message);
  }
}

// one-time read, called once per session (see auth.store.js) instead of an always-on listener
export async function fetchProgress(uid) {
  const snap = await getDoc(doc(getFirebaseFirestore(), 'progress', uid));
  const { items, moves, raw } = unpackItemsDoc(snap, 'progress');
  void persistIdMoves('progress', uid, moves, raw);
  return items;
}

export async function fetchBookmarks(uid) {
  const snap = await getDoc(doc(getFirebaseFirestore(), 'bookmarks', uid));
  const { items, moves, raw } = unpackItemsDoc(snap, 'bookmarks');
  void persistIdMoves('bookmarks', uid, moves, raw);
  return items;
}

// BUG-049/050: ONE queue for every progress mutation, keyed by uid. Tasks for a user run strictly in click order.
export const progressQueue = createWriteQueue();

// ATLAS-BUG-012: the rules cannot check individual entries, so nothing malformed is ever allowed to leave the client.
// `write` is the merge payload: a 'attempted' merge has no solve_count, which validateProgressEntry allows.
function assertValidProgressWrite(canonicalId, write) {
  const check = validateProgressEntry(canonicalId, write);
  if (!check.ok) throw new Error(`invalid progress entry: ${check.reason}`);
}

// `localPrev` is the freshest local entry, read by the caller INSIDE its queued task (never a closure from click time).
export async function markProgress(uid, canonicalId, status, localPrev) {
  if (!isValidStatus(status)) {
    throw new Error(`invalid status: ${status}`);
  }
  if (localPrev?.status === status) {
    return { skipped: true };
  }

  const db = getFirebaseFirestore();
  const ref = doc(db, 'progress', uid);
  const key = escapeFieldKey(canonicalId);
  const nowIso = new Date().toISOString();

  if (status === 'solved') {
    // BUG-053/054: the counter comes from the SERVER copy inside a transaction (1 read + 1 write), so a stale cache on another device or a reset elsewhere cannot regress it.
    const plan = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const serverEntry = snap.exists()
        ? snap.data({ serverTimestamps: 'estimate' }).items?.[key]
        : undefined;
      const next = planSolve(canonicalId, serverEntry, serverTimestamp(), nowIso);
      if (next.changed) {
        assertValidProgressWrite(canonicalId, next.write);
        tx.set(ref, { items: { [key]: next.write } }, { merge: true });
      }
      return next;
    });
    if (!plan.changed) return { skipped: true, entry: plan.local };
    return { skipped: false, entry: plan.local };
  }

  // ATLAS-BUG-001: "attempted" is ALSO decided on the server copy inside a transaction. If the server says solved,
  // nothing is written and the caller gets { blocked: true } plus the real (solved) entry to sync the UI back to.
  const plan = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const serverEntry = snap.exists()
      ? snap.data({ serverTimestamps: 'estimate' }).items?.[key]
      : undefined;
    const next = planAttempt(canonicalId, serverEntry, serverTimestamp(), nowIso);
    // merge only the fields that change, so the server keeps its own first_solved_at / solve_count
    if (next.changed) {
      assertValidProgressWrite(canonicalId, next.write);
      tx.set(ref, { items: { [key]: next.write } }, { merge: true });
    }
    return next;
  });
  return { skipped: !plan.changed, blocked: !!plan.blocked, entry: plan.local };
}

export async function resetProgress(uid, canonicalId) {
  const ref = doc(getFirebaseFirestore(), 'progress', uid);
  const key = escapeFieldKey(canonicalId);
  await updateDoc(ref, { [`items.${key}`]: deleteField() }).catch(async (err) => {
    if (err?.code === 'not-found') return;
    throw err;
  });
}

// Settings page "danger zone" action - full overwrite (merge: false) to {items: {}}, wiping any solved/attempted/streak data for this user. Callers go through useAccount().resetAllProgress, which queues this and clears the store and cache.
export async function resetAllProgress(uid) {
  const ref = doc(getFirebaseFirestore(), 'progress', uid);
  await setDoc(ref, { items: {} }, { merge: false });
}

// BUG-073: removes every Atlas doc for this user in ONE atomic batch. Must run while still signed in (the security rules need request.auth), i.e. BEFORE the Auth user is deleted.
export async function deleteAllUserData(uid) {
  const db = getFirebaseFirestore();
  const batch = writeBatch(db);
  for (const collectionName of ['users', 'progress', 'bookmarks']) {
    batch.delete(doc(db, collectionName, uid));
  }
  await batch.commit();
  try {
    localStorage.removeItem(PROFILE_SYNC_KEY_PREFIX + uid);
  } catch {
    // storage unavailable, nothing to clean
  }
}

/* WRITE COALESCING for bookmarks: the queue logic (debounce, coalescing, serial flush, net-zero skip, rollback reporting) lives in bookmarkQueue.js so it can be tested without Firebase. This file only supplies the actual write. Progress (solved/attempted) is NOT coalesced, it goes through progressQueue above. */
export const bookmarkQueue = createBookmarkQueue({
  loadBaseline: (uid) => fetchBookmarks(uid), // ATLAS-BUG-004: cache-first sessions fetch the confirmed server copy before the first write
  write: async (uid, changes) => {
    const ref = doc(getFirebaseFirestore(), 'bookmarks', uid);
    const items = {};
    for (const [canonicalId, entry] of changes) {
      if (entry !== null) {
        const check = validateBookmarkEntry(canonicalId, slimEntry(entry)); // ATLAS-BUG-012: never send a malformed entry
        if (!check.ok) throw new Error(`invalid bookmark entry: ${check.reason}`);
      }
      items[escapeFieldKey(canonicalId)] = entry === null ? deleteField() : slimEntry(entry);
    }
    await setDoc(ref, { items }, { merge: true }); // deleteField() sentinels are fine mixed into a merge set, even nested
  },
});

// entry: the new bookmark record to write, or null to mean "unbookmark this id". Results (success, failure + rollback info) are reported to the single handler set registered in useBookmarks.js.
export function queueBookmarkWrite(uid, canonicalId, entry) {
  bookmarkQueue.enqueue(uid, canonicalId, entry);
}

// best-effort: called on tab-hide/close so a pending batch doesn't sit unflushed if the user navigates away.
// Returns a promise so callers that need the write to land before doing something else (sign-out, delete account) can await it.
export function flushAllBookmarksNow() {
  return bookmarkQueue.flushAll();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAllBookmarksNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAllBookmarksNow();
  });
}

// write-only: reads users/{uid} never. BUG-076/077: every field is idempotent, so two devices writing it can never disagree. created_at is Firebase's own account creation time (same on every device) instead of "first time THIS browser synced". The 12h throttle stays device-local on purpose: it only limits write cost, and a repeat write from another device is harmless.
export async function syncUserProfile(uid, displayName, photoURL, createdAt) {
  if (typeof window === 'undefined') return { skipped: true };

  const now = new Date();
  const storageKey = PROFILE_SYNC_KEY_PREFIX + uid;
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  } catch {
    saved = null;
  }

  if (saved?.lastSyncedAt && now - new Date(saved.lastSyncedAt) < LAST_SEEN_THROTTLE_MS) {
    return { skipped: true };
  }

  const ref = doc(getFirebaseFirestore(), 'users', uid);
  // SEC-12 (data minimisation): name and photo stay in Firebase Auth only. Nothing reads them from this doc, so
  // copying them into Firestore just stored personal data for no reason. The signature is kept for callers/tests.
  void displayName; void photoURL;
  const payload = { last_seen_at: serverTimestamp() };
  const createdIso = createdAt ? new Date(createdAt) : null;
  if (createdIso && !Number.isNaN(createdIso.getTime())) payload.created_at = createdIso.toISOString();

  await setDoc(ref, payload, { merge: true });

  try {
    localStorage.setItem(storageKey, JSON.stringify({ lastSyncedAt: now.toISOString() }));
  } catch {
    // localStorage unavailable (private mode etc) - worst case we write again next session, harmless because every field is idempotent
  }

  return { skipped: false };
}
