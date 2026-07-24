/**
 * Replaces backend/repositories/{progress,bookmark,user}.repo.js and
 * services/{progress,bookmark,user}.service.js. The browser talks to
 * Firestore directly now - this module is the entire client-side data
 * access layer for user data, protected by firestore.rules (repo root).
 *
 * Schema (consolidated, one doc per user per collection - see
 * docs/04-FIRESTORE-SCHEMA-AND-RULES.md for the full rationale):
 *
 *   users/{uid}      { display_name, photo_url, created_at, last_seen_at }
 *   progress/{uid}   { items: { [canonical_id]: { status, updated_at, first_solved_at, solve_count } } }
 *   bookmarks/{uid}  { items: { [canonical_id]: bookmarked_at } }
 *
 * Cost optimizations implemented here (docs/04, cost table):
 *   #1 no read-before-write - callers pass in the already-in-memory items map
 *   #4 redundant-status writes are skipped entirely
 *   #5 profile "last seen" write throttled to once per ~12h
 *   #7 live onSnapshot listeners replace polling + manual invalidation
 */

import {
  doc, setDoc, updateDoc, onSnapshot, deleteField,
} from 'firebase/firestore';
import { firestore } from './firebase.js';

const VALID_STATUSES = ['solved', 'attempted', 'skipped'];
const LAST_SEEN_THROTTLE_MS = 12 * 60 * 60 * 1000; // 12 hours

// ---- live listeners ---------------------------------------------------------

/**
 * Attaches a live listener to `progress/{uid}`. `onChange` receives the
 * `items` map (or `{}` if the doc doesn't exist yet - a brand new user).
 * Returns the unsubscribe function - caller (auth.store.js) is responsible
 * for calling it on sign-out, otherwise the listener leaks.
 */
export function watchProgress(uid, onChange, onError) {
  return onSnapshot(
    doc(firestore, 'progress', uid),
    (snap) => onChange(snap.exists() ? (snap.data().items || {}) : {}),
    (err) => { console.error('[firestore] progress listener error', err); onError?.(err); }
  );
}

export function watchBookmarks(uid, onChange, onError) {
  return onSnapshot(
    doc(firestore, 'bookmarks', uid),
    (snap) => onChange(snap.exists() ? (snap.data().items || {}) : {}),
    (err) => { console.error('[firestore] bookmarks listener error', err); onError?.(err); }
  );
}

export function watchUser(uid, onChange, onError) {
  return onSnapshot(
    doc(firestore, 'users', uid),
    (snap) => onChange(snap.exists() ? snap.data() : null),
    (err) => { console.error('[firestore] user listener error', err); onError?.(err); }
  );
}

// ---- progress writes ----------------------------------------------------------

/**
 * @param {string} uid
 * @param {string} canonicalId
 * @param {'solved'|'attempted'|'skipped'} status
 * @param {Record<string, {status,updated_at,first_solved_at,solve_count}>} currentItems
 *   the current in-memory progress.items map (from the live listener) -
 *   used to decide first_solved_at/solve_count without a Firestore read.
 * @returns {Promise<{skipped:boolean}>} skipped=true if this was a
 *   redundant no-op write that was intentionally not sent
 */
export async function markProgress(uid, canonicalId, status, currentItems) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`invalid status: ${status}`);
  }

  const prev = currentItems?.[canonicalId] || null;

  // Cost optimization #4: skip redundant writes (also fixes the old
  // backend's solve_count-increments-on-reclick quirk as a side effect.
  if (prev?.status === status) {
    return { skipped: true };
  }

  const now = new Date().toISOString();
  const entry = {
    status,
    updated_at: now,
    first_solved_at: (!prev?.first_solved_at && status === 'solved') ? now : (prev?.first_solved_at || null),
    solve_count: status === 'solved' ? (prev?.solve_count || 0) + 1 : (prev?.solve_count || 0),
  };

  const ref = doc(firestore, 'progress', uid);
  // Field-path update - touches only this one entry in the map, doesn't
  // read-modify-write the whole document, and can't clobber other users'
  // entries (rules already prevent that) or other problems' entries.
  await setDoc(ref, { items: { [canonicalId]: entry } }, { merge: true });

  return { skipped: false, entry };
}

export async function resetProgress(uid, canonicalId) {
  const ref = doc(firestore, 'progress', uid);
  await updateDoc(ref, { [`items.${canonicalId}`]: deleteField() }).catch(async (err) => {
    // updateDoc fails if the document doesn't exist yet (brand new user
    // resetting something that was never set) - treat as a no-op success.
    if (err?.code === 'not-found') return;
    throw err;
  });
}

// ---- bookmark writes ----------------------------------------------------------

export async function setBookmark(uid, canonicalId, bookmarked) {
  const ref = doc(firestore, 'bookmarks', uid);

  if (bookmarked) {
    await setDoc(ref, { items: { [canonicalId]: new Date().toISOString() } }, { merge: true });
  } else {
    await updateDoc(ref, { [`items.${canonicalId}`]: deleteField() }).catch(async (err) => {
      if (err?.code === 'not-found') return;
      throw err;
    });
  }
}

// ---- user profile ----------------------------------------------------------

/**
 * Ports backend userRepo.upsert's "syncUser" behavior, with an added
 * throttle (cost optimization #5): skip the write entirely if last_seen_at
 * is under ~12h old, instead of writing on every fresh sign-in unconditionally.
 *
 * @param {object|null} currentUserDoc - the already-in-memory users/{uid}
 *   doc (from the live listener), or null if this is a brand new user.
 */
export async function syncUserProfile(uid, displayName, photoURL, currentUserDoc) {
  const now = new Date();

  if (currentUserDoc?.last_seen_at) {
    const lastSeen = new Date(currentUserDoc.last_seen_at);
    if (now - lastSeen < LAST_SEEN_THROTTLE_MS) {
      return { skipped: true };
    }
  }

  const ref = doc(firestore, 'users', uid);
  const payload = {
    display_name: displayName || null,
    photo_url: photoURL || null,
    last_seen_at: now.toISOString(),
  };
  if (!currentUserDoc) payload.created_at = now.toISOString();

  await setDoc(ref, payload, { merge: true });
  return { skipped: false };
}
