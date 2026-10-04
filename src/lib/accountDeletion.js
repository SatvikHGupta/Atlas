// Account deletion as an explicit, idempotent, resumable sequence. Author: Satvik Hemant Gupta
//
// ATLAS-BUG-013. Two systems have to be emptied (Firestore docs, then the Firebase Auth identity) and they cannot be one
// transaction. The ORDER is fixed by the security rules (Firestore deletes need a signed-in user, so Auth goes last), which
// means the only partial state is "data gone, Auth identity still there". That state used to be reported as a plain error
// and the next sign-in would quietly re-create an empty profile for a half-deleted account.
//
// Now: a deletion marker is written BEFORE any data is removed and cleared only after Auth is really gone. While it
// exists the account is "deletion pending": sign-in must not recreate profile data, the UI offers "Finish deleting", and
// re-running this function is safe at any point (every step is idempotent, a Firestore delete of a missing doc is a no-op).
// "ok: true" is returned ONLY when the Auth identity is gone. Never throws.
//
// Pure orchestration: every side effect is injected, so failure injection is a unit test, not a manual experiment.

const PREFIX = 'atlas_deletion_pending_v1_';

function storage() {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}
export const deletionMarker = {
  has(uid) { try { return !!storage()?.getItem(PREFIX + uid); } catch { return false; } },
  set(uid) { try { storage()?.setItem(PREFIX + uid, new Date().toISOString()); } catch { /* storage unavailable */ } },
  clear(uid) { try { storage()?.removeItem(PREFIX + uid); } catch { /* storage unavailable */ } },
};

const GONE_CODES = new Set(['auth/user-not-found', 'auth/user-token-expired', 'auth/no-current-user']);

/**
 * @param {object} d injected dependencies
 * @param {string} d.uid
 * @param {() => boolean} d.isRecentSignIn
 * @param {() => Promise<{ok:boolean,error?:any}>} d.reauth
 * @param {(uid:string) => Promise<void>} d.deleteData        deletes the Firestore docs (idempotent)
 * @param {() => Promise<void>} d.deleteAuth                   deletes the Auth identity
 * @param {(uid:string) => void} d.afterDataDeleted           drop local copies of the deleted data
 * @param {(uid:string) => Promise<void>|void} d.afterAuthDeleted   sign-out cleanup, caches (best effort)
 * @param {{has:Function,set:Function,clear:Function}} [d.marker]
 * @returns {Promise<{ok:true, resumed:boolean} | {ok:false, stage:'reauth'|'data'|'auth', dataRemoved:boolean, resumable:boolean, error:any}>}
 */
export async function runAccountDeletion(d) {
  const marker = d.marker || deletionMarker;
  const resumed = marker.has(d.uid);
  let dataRemoved = false;

  try {
    // 1. fresh sign-in BEFORE anything is deleted, so a stale session can never leave us half way
    if (!d.isRecentSignIn()) {
      const re = await d.reauth();
      if (!re.ok) return { ok: false, stage: 'reauth', dataRemoved: resumed, resumable: resumed, error: re.error };
    }

    // 2. mark first, then delete data. Re-running this on a resumed deletion is safe (idempotent delete)
    marker.set(d.uid);
    try {
      await d.deleteData(d.uid);
    } catch (error) {
      if (!resumed) marker.clear(d.uid); // atomic batch failed = nothing was removed, do not leave a false "pending" flag
      return { ok: false, stage: 'data', dataRemoved: resumed, resumable: resumed, error };
    }
    dataRemoved = true;
    d.afterDataDeleted?.(d.uid);

    // 3. Auth identity, with ONE re-auth retry if Firebase says the session is too old
    let result = await attemptAuthDelete(d.deleteAuth);
    if (!result.ok && result.error?.code === 'auth/requires-recent-login') {
      const re = await d.reauth();
      result = re.ok ? await attemptAuthDelete(d.deleteAuth) : { ok: false, error: re.error };
    }
    if (!result.ok) return { ok: false, stage: 'auth', dataRemoved: true, resumable: true, error: result.error };

    // 4. fully gone. Cleanup is best effort and can never turn a successful deletion into a reported failure
    marker.clear(d.uid);
    try { await d.afterAuthDeleted?.(d.uid); } catch (e) { console.warn('[deleteAccount] post-delete cleanup failed', e); }
    return { ok: true, resumed };
  } catch (error) {
    // unexpected throw: report honestly where we were. dataRemoved means the Auth step is what is still pending
    return { ok: false, stage: dataRemoved ? 'auth' : 'data', dataRemoved, resumable: dataRemoved || resumed, error };
  }
}

async function attemptAuthDelete(deleteAuth) {
  try {
    await deleteAuth();
    return { ok: true };
  } catch (error) {
    // the identity is already gone (deleted on another device / earlier attempt): that is the goal state
    if (GONE_CODES.has(error?.code)) return { ok: true };
    return { ok: false, error };
  }
}
