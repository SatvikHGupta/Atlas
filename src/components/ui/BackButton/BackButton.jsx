'use client';

// Shared Back button (legal pages, about, contact, bookmarks, history). Author: Satvik Hemant Gupta
import { useRouter } from 'next/navigation';
import { shouldUseHistoryBack } from '../../../lib/backNav.js';
import styles from './BackButton.module.css';

export default function BackButton({ fallback = '/' }) {
  const router = useRouter();
  const goBack = () => {
    const safe = shouldUseHistoryBack({
      historyLength: window.history.length,
      referrer: document.referrer,
      origin: window.location.origin,
    });
    if (safe) router.back();
    else router.push(fallback);
  };
  return (
    <button type="button" className={styles.back} onClick={goBack}>
      &larr; Back
    </button>
  );
}
