// Account deletion as an explicit, idempotent, resumable sequence. Author: Satvik Hemant Gupta

const PREFIX = 'atlas_deletion_pending_v1_';

function storage() {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}
export const deletionMarker = {
  has(uid) { try { return !!storage()?.getItem(PREFIX + uid); } catch { return false; } },
  set(uid) { try { storage()?.setItem(PREFIX + uid, new Date().toISOString()); } catch { } },
  clear(uid) { try { storage()?.removeItem(PREFIX + uid); } catch { } },
};

const GONE_CODES = new Set(['auth/user-not-found', 'auth/user-token-expired', 'auth/no-current-user']);

export async function runAccountDeletion(d) {
  const marker = d.marker || deletionMarker;
  const resumed = marker.has(d.uid);
  let dataRemoved = false;

  try {
    if (!d.isRecentSignIn()) {
      const re = await d.reauth();
      if (!re.ok) return { ok: false, stage: 'reauth', dataRemoved: resumed, resumable: resumed, error: re.error };
    }

    marker.set(d.uid);
    try {
      await d.deleteData(d.uid);
    } catch (error) {
      if (!resumed) marker.clear(d.uid);
      return { ok: false, stage: 'data', dataRemoved: resumed, resumable: resumed, error };
    }
    dataRemoved = true;
    d.afterDataDeleted?.(d.uid);

    let result = await attemptAuthDelete(d.deleteAuth);
    if (!result.ok && result.error?.code === 'auth/requires-recent-login') {
      const re = await d.reauth();
      result = re.ok ? await attemptAuthDelete(d.deleteAuth) : { ok: false, error: re.error };
    }
    if (!result.ok) return { ok: false, stage: 'auth', dataRemoved: true, resumable: true, error: result.error };

    marker.clear(d.uid);
    try { await d.afterAuthDeleted?.(d.uid); } catch (e) { console.warn('[deleteAccount] post-delete cleanup failed', e); }
    return { ok: true, resumed };
  } catch (error) {
    return { ok: false, stage: dataRemoved ? 'auth' : 'data', dataRemoved, resumable: dataRemoved || resumed, error };
  }
}

async function attemptAuthDelete(deleteAuth) {
  try {
    await deleteAuth();
    return { ok: true };
  } catch (error) {
    if (GONE_CODES.has(error?.code)) return { ok: true };
    return { ok: false, error };
  }
}
