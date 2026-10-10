'use client';

import { useAuth } from '../../../hooks/useAuth.js';
import { useProgress } from '../../../hooks/useProgress.js';
import { useBookmarks } from '../../../hooks/useBookmarks.js';
import { useUIStore } from '../../../store/ui.store.js';
import { useAuthStore } from '../../../store/auth.store.js';
import { localDateKey } from '../../../lib/dates.js';
import styles from './DataTab.module.css';

// Builds the export in-memory and triggers a browser download
function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataTab() {
  const { user } = useAuth();
  const { progressList, totalSolved, totalAttempted, loadError: progressError, retry } = useProgress();
  const { bookmarks, loadError: bookmarksError } = useBookmarks();
  const progressReady = useAuthStore((s) => s.progressReady);
  const bookmarksReady = useAuthStore((s) => s.bookmarksReady);
  const addToast = useUIStore((s) => s.addToast);

  const ready = !!user && progressReady && bookmarksReady;
  const failed = progressError || bookmarksError;

  function handleExport() {
    if (!ready) return;
    const payload = {
      schema_version: 1,
      exported_at: new Date().toISOString(),
      account_email: user?.email || null,
      summary: { totalSolved, totalAttempted, bookmarked: bookmarks.length },
      progress: progressList,
      bookmarks,
    };
    downloadJson(`atlas-progress-${localDateKey(new Date())}.json`, payload);
    addToast('Export downloaded', 'success');
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>Export your data</h2>
        <p>Download everything Atlas has tracked for you - solved/attempted problems and bookmarks - as a single JSON file.</p>
      </div>

      <button
        type="button"
        className={`${styles.exportBtn} ${ready ? '' : styles.exportBtnDisabled}`}
        onClick={handleExport}
        disabled={!ready}
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1.5v8.5m0 0L5 7m3 3 3-3M2.5 12v1.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Download my data (.json)
      </button>

      {!ready && (
        <p className={styles.exportWait}>
          {failed
            ? 'Some of your data could not be loaded, so export is off to avoid a partial file. '
            : 'Waiting for your progress and bookmarks to finish loading. '}
          {failed && <button type="button" className={styles.exportRetry} onClick={retry}>Retry</button>}
        </p>
      )}

      <p className={styles.note}>{totalSolved} solved, {totalAttempted} attempted, {bookmarks.length} bookmarked - captured at the moment you download.</p>
    </section>
  );
}
