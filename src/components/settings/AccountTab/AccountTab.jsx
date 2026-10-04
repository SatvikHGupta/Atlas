'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth.js';
import { useUIStore } from '../../../store/ui.store.js';
import { deletionMarker } from '../../../lib/accountDeletion.js';
import { useAccount } from '../../../hooks/useAccount.js';
import styles from './AccountTab.module.css';

function ConfirmAction({ label, confirmWord, description, busy, onConfirm, variant = 'danger' }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const canConfirm = typed.trim().toUpperCase() === confirmWord;

  if (!open) {
    return (
      <button type="button" className={`${styles.dangerBtn} ${styles[variant]}`} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  return (
    <div className={styles.confirmBox}>
      <p>{description}</p>
      <p className={styles.confirmHint}>Type <b>{confirmWord}</b> to confirm.</p>
      <div className={styles.confirmRow}>
        <input
          className={styles.confirmInput}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={confirmWord}
          autoFocus
        />
        <button
          type="button"
          className={`${styles.dangerBtn} ${styles[variant]}`}
          disabled={!canConfirm || busy}
          onClick={onConfirm}
        >
          {busy ? 'Working…' : `Yes, ${label.toLowerCase()}`}
        </button>
        <button type="button" className={styles.cancelBtn} onClick={() => { setOpen(false); setTyped(''); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AccountTab() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const { resetAllProgress, deleteAccount } = useAccount();
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // ATLAS-BUG-013: a previous deletion removed the data but not the sign-in account. Offer to finish it.
  const [pendingDeletion, setPendingDeletion] = useState(() => !!user?.uid && deletionMarker.has(user.uid));

  async function handleResetProgress() {
    setResetting(true);
    try {
      const result = await resetAllProgress();
      if (result.ok) addToast('All progress reset', 'success');
      else if (result.reason === 'degraded') addToast('Service temporarily limited - resets at midnight PT', 'error');
      else addToast('Could not reset progress - try again', 'error');
    } finally {
      setResetting(false);
    }
  }

  // BUG-074: "deleted" is only shown after Firestore data AND the sign-in account are really gone
  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.ok) {
        setPendingDeletion(false);
        addToast('Account and all your data deleted', 'info');
        router.replace('/');
      } else if (result.stage === 'auth' && result.dataRemoved) {
        setPendingDeletion(true);
        addToast('Your data was removed, but the sign-in account is still there. Use "Finish deleting" to complete it.', 'error');
      } else if (result.stage === 'reauth') {
        addToast('Sign in again to confirm - nothing was deleted', 'error');
      } else {
        addToast('Could not delete your account - nothing was deleted, try again', 'error');
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.block}>
        <h2>Signed in with Google</h2>
        <p>{user?.email}</p>
        <button type="button" className={styles.signOutBtn} onClick={signOut}>Sign out</button>
      </div>

      <div className={styles.dangerZone}>
        <h2>Danger zone</h2>

        {pendingDeletion && (
          <div className={styles.dangerRow} role="alert">
            <div>
              <span className={styles.dangerTitle}>Account deletion didn&apos;t finish</span>
              <span className={styles.dangerDesc}>Your Atlas data is already removed, but your sign-in account still exists. Finish deleting it to complete the process.</span>
            </div>
            <button type="button" className={styles.signOutBtn} onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? 'Finishing...' : 'Finish deleting'}
            </button>
          </div>
        )}

        <div className={styles.dangerRow}>
          <div>
            <span className={styles.dangerTitle}>Reset all progress</span>
            <span className={styles.dangerDesc}>Clears every solved/attempted mark. Bookmarks are not affected. Cannot be undone.</span>
          </div>
          <ConfirmAction
            label="Reset progress"
            confirmWord="RESET"
            description="This clears solved/attempted status for every problem. Your account and bookmarks stay."
            busy={resetting}
            onConfirm={handleResetProgress}
          />
        </div>

        <div className={styles.dangerRow}>
          <div>
            <span className={styles.dangerTitle}>Delete account</span>
            <span className={styles.dangerDesc}>Permanently deletes your Atlas sign-in and removes your progress, bookmarks and profile data. If you signed in recently this works immediately; otherwise you&apos;ll be asked to sign in again first.</span>
          </div>
          <ConfirmAction
            label="Delete account"
            confirmWord="DELETE"
            description="This permanently deletes your account and removes your progress, bookmarks and profile data. This cannot be undone."
            busy={deleting}
            onConfirm={handleDeleteAccount}
          />
        </div>
      </div>
    </section>
  );
}
