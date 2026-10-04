'use client';

// Account-level actions: reset all progress and delete account. The one
// place components go through for these, so they never touch services.
// Author: Satvik Hemant Gupta

import { useAuthStore } from '../store/auth.store.js';
import {
  resetAllProgress as resetAllProgressDoc, deleteAllUserData,
  flushAllBookmarksNow, isQuotaExhausted, progressQueue,
} from '../services/firestore.js';
import { deleteAccountUser, reauthWithGoogle, clearFirestoreLocalData } from '../services/firebase.js';
import { shouldApply } from '../lib/sessionGuard.js';
import { isRecentSignIn } from '../lib/recentLogin.js';
import { runAccountDeletion } from '../lib/accountDeletion.js';

const store = () => useAuthStore.getState();

// BUG-051/052/053/065/181/182: goes through the progress write queue, respects
// the degraded guard, and on success clears the store AND the cache. On
// failure nothing local changes. Never throws; returns { ok, reason? }.
async function resetAllProgress() {
  const s = store();
  const uid = s.user?.uid;
  if (!uid) return { ok: false, reason: 'signed-out' };
  if (s.accountBusy) return { ok: false, reason: 'busy' };
  if (s.progressDegraded) return { ok: false, reason: 'degraded' };
  const ctx = { uid, session: s.authSession };

  try {
    const outcome = await progressQueue.enqueue(uid, async () => {
      if (!shouldApply(store(), ctx)) return { dropped: true };
      await resetAllProgressDoc(uid);
      return {};
    });
    if (outcome.dropped || !shouldApply(store(), ctx)) {
      return { ok: false, reason: 'session-changed' };
    }
    store().clearProgress(uid);
    store().setDegraded('progress', false);
    return { ok: true };
  } catch (err) {
    console.error('[useAccount] resetAllProgress failed', err);
    if (isQuotaExhausted(err) && shouldApply(store(), ctx)) {
      store().setDegraded('progress', true);
      return { ok: false, reason: 'degraded', error: err };
    }
    return { ok: false, reason: 'error', error: err };
  }
}

// ATLAS-BUG-013: the sequence itself lives in lib/accountDeletion.js (idempotent, resumable, failure-injection tested).
// Order matters and is unchanged: land pending bookmark writes -> fresh sign-in -> Firestore docs -> Auth identity -> local cleanup.
// "ok: true" only when the Auth identity is really gone. Never throws. Returns { ok: true } or
// { ok: false, stage: 'reauth'|'data'|'auth', dataRemoved, resumable, error }.
async function deleteAccount() {
  const s = store();
  const uid = s.user?.uid;
  const refuse = (why) => ({ ok: false, stage: 'data', dataRemoved: false, resumable: false, error: new Error(why) });
  if (!uid) return refuse('signed-out');
  if (s.accountBusy) return refuse('busy');

  s.setAccountBusy(true);
  try {
    await flushAllBookmarksNow();
    return await progressQueue.enqueue(uid, () => runAccountDeletion({
      uid,
      isRecentSignIn: () => isRecentSignIn(store().user?.metadata?.lastSignInTime),
      reauth: reauthWithGoogle,
      deleteData: deleteAllUserData,
      deleteAuth: deleteAccountUser,
      // the data is gone for good, so the UI must not keep showing it
      afterDataDeleted: (id) => store().clearAllLocalUserData(id),
      afterAuthDeleted: async (id) => {
        store().signOutLocal(id);
        await clearFirestoreLocalData(); // SEC-11
      },
    }));
  } catch (error) {
    console.error('[useAccount] deleteAccount failed', error);
    return { ok: false, stage: 'data', dataRemoved: false, resumable: false, error };
  } finally {
    store().setAccountBusy(false);
  }
}

export function useAccount() {
  return { resetAllProgress, deleteAccount };
}
