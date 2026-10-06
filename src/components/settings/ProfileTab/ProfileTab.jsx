'use client';

import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth.js';
import { useProgress } from '../../../hooks/useProgress.js';
import { useBookmarks } from '../../../hooks/useBookmarks.js';
import { displayCount } from '../../../lib/resourceState.js';
import { usePostCard, POST_CARD_HINT } from '../../../hooks/usePostCard.js';
import styles from './ProfileTab.module.css';

function memberSince(user) {
  const raw = user?.metadata?.creationTime;
  if (!raw) return null;
  return new Date(raw).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function ProfileTab() {
  const { user } = useAuth();
  const { totalSolved, totalAttempted, state: progressState, retry: retryProgress } = useProgress();
  const { bookmarks, state: bookmarksState, retry: retryBookmarks } = useBookmarks();
  // ATLAS-BUG-002: '...' while loading and '-' when a read failed, so a failure is never shown as a real 0
  const failed = progressState === 'failed' || bookmarksState === 'failed';
  const retryAll = () => { if (progressState === 'failed') retryProgress?.(); if (bookmarksState === 'failed') retryBookmarks?.(); };
  const joined = memberSince(user);
  const { download: downloadCard, busy: cardBusy } = usePostCard();

  return (
    <section className={styles.section}>
      <div className={styles.identity}>
        {user?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className={styles.avatar} referrerPolicy="no-referrer" />
        ) : (
          <span className={styles.avatarFallback}>{(user?.displayName || '?')[0].toUpperCase()}</span>
        )}
        <div className={styles.identityText}>
          <span className={styles.name}>{user?.displayName || 'Your profile'}</span>
          <span className={styles.email}>{user?.email}</span>
          {joined && <span className={styles.joined}>On Atlas since {joined}</span>}
        </div>
        {/* right side, level with the three profile lines */}
        <button type="button" className={styles.cardBtn} onClick={downloadCard} disabled={cardBusy} title={POST_CARD_HINT}>
          {cardBusy ? 'Creating...' : 'Post your card'}
        </button>
      </div>

      <div className={styles.statStrip}>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{displayCount(progressState, totalSolved)}</span>
          <span className={styles.statLabel}>solved</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{displayCount(progressState, totalAttempted)}</span>
          <span className={styles.statLabel}>attempted</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{displayCount(bookmarksState, bookmarks.length)}</span>
          <span className={styles.statLabel}>bookmarked</span>
        </div>
      </div>

      {failed && (
        <p role="alert" className={styles.joined}>
          Couldn&apos;t load some of your data. <button type="button" onClick={retryAll} style={{ all: 'unset', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </p>
      )}

      <Link href="/dashboard" className={styles.dashboardLink}>
        View full dashboard &rarr;
      </Link>
    </section>
  );
}
