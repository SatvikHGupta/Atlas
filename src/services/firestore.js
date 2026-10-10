'use client';

// Client-side Firestore access for user data (progress/bookmarks/profile)

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
const PROFILE_SYNC_KEY_PREFIX = 'atlas_profile_synced_v1_';

// true only when the daily Firestore free-tier cap
export function isQuotaExhausted(err) {
  return err?.code === 'resource-exhausted';
}

// Firestore field paths are dot-delimited and also treat backtick/backslash
function escapeFieldKey(key) {
  return String(key).replace(/\./g, '\u2024');
}
function unescapeFieldKey(key) {
  return String(key).replace(/\u2024/g, '.');
}

// shared unpack: {items: {safeKey: entry}} doc -> {canonical_id: entry} map
function unpackItemsDoc(snap, kind) {
  const raw = snap.exists() ? (snap.data({ serverTimestamps: 'estimate' }).items || {}) : {};
  const moves = planIdMoves(raw, TWIN_TO_CANONICAL);
  return { items: expandItemsMap(applyIdMoves(raw, moves), kind, unescapeFieldKey), moves, raw };
}

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

// one-time read, called once per session
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

export const progressQueue = createWriteQueue();

// the rules cannot check individual entries
function assertValidProgressWrite(canonicalId, write) {
  const check = validateProgressEntry(canonicalId, write);
  if (!check.ok) throw new Error(`invalid progress entry: ${check.reason}`);
}

// `localPrev` is the freshest local entry
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

  const plan = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const serverEntry = snap.exists()
      ? snap.data({ serverTimestamps: 'estimate' }).items?.[key]
      : undefined;
    const next = planAttempt(canonicalId, serverEntry, serverTimestamp(), nowIso);
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

// Settings page "danger zone" action
export async function resetAllProgress(uid) {
  const ref = doc(getFirebaseFirestore(), 'progress', uid);
  await setDoc(ref, { items: {} }, { merge: false });
}

// removes every Atlas doc for this user in ONE atomic batch
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
  }
}

export const bookmarkQueue = createBookmarkQueue({
  loadBaseline: (uid) => fetchBookmarks(uid),
  write: async (uid, changes) => {
    const ref = doc(getFirebaseFirestore(), 'bookmarks', uid);
    const items = {};
    for (const [canonicalId, entry] of changes) {
      if (entry !== null) {
        const check = validateBookmarkEntry(canonicalId, slimEntry(entry));
        if (!check.ok) throw new Error(`invalid bookmark entry: ${check.reason}`);
      }
      items[escapeFieldKey(canonicalId)] = entry === null ? deleteField() : slimEntry(entry);
    }
    await setDoc(ref, { items }, { merge: true });
  },
});

// entry: the new bookmark record to write, or null to mean "unbookmark this id"
export function queueBookmarkWrite(uid, canonicalId, entry) {
  bookmarkQueue.enqueue(uid, canonicalId, entry);
}

// best-effort: called on tab-hide/close so a pending batch doesn't sit
export function flushAllBookmarksNow() {
  return bookmarkQueue.flushAll();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAllBookmarksNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAllBookmarksNow();
  });
}

// write-only: reads users/{uid} never
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
  void displayName; void photoURL;
  const payload = { last_seen_at: serverTimestamp() };
  const createdIso = createdAt ? new Date(createdAt) : null;
  if (createdIso && !Number.isNaN(createdIso.getTime())) payload.created_at = createdIso.toISOString();

  await setDoc(ref, payload, { merge: true });

  try {
    localStorage.setItem(storageKey, JSON.stringify({ lastSyncedAt: now.toISOString() }));
  } catch {
  }

  return { skipped: false };
}
