'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth.js';
import { safeInternalPath } from '../../lib/safeRedirect.js';
import { authErrorMessage } from '../../lib/authErrors.js';
import styles from './Login.module.css';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M47.532 24.552c0-1.636-.132-3.204-.38-4.704H24.48v8.898h12.958c-.56 3.01-2.25 5.56-4.792 7.274v6.044h7.758c4.54-4.18 7.128-10.336 7.128-17.512z" fill="#4285F4"/>
      <path d="M24.48 48c6.506 0 11.956-2.156 15.944-5.836l-7.758-6.044c-2.156 1.446-4.912 2.298-8.186 2.298-6.296 0-11.63-4.252-13.534-9.968H2.956v6.236C6.926 42.696 15.074 48 24.48 48z" fill="#34A853"/>
      <path d="M10.946 28.45A14.4 14.4 0 0 1 10.2 24c0-1.556.268-3.068.746-4.45v-6.236H2.956A23.96 23.96 0 0 0 .48 24c0 3.876.932 7.54 2.476 10.686l8.002-6.236h-.012z" fill="#FBBC05"/>
      <path d="M24.48 9.58c3.548 0 6.734 1.22 9.244 3.62l6.932-6.932C36.436 2.388 30.986 0 24.48 0 15.074 0 6.926 5.304 2.956 13.314l8.002 6.236C12.85 13.832 18.184 9.58 24.48 9.58z" fill="#EA4335"/>
    </svg>
  );
}

const PATHS = [
  { step: '01', label: 'Pick a problem' },
  { step: '02', label: 'Read the breakdown' },
  { step: '03', label: 'Check the solution' },
  { step: '04', label: 'Mark it solved' },
];

// en-US on purpose: the server and the browser must format the same way or hydration mismatches
const fmt = (n) => Number(n).toLocaleString('en-US');

export default function LoginClient({ dsaCount, cpCount, notesCount }) {
  const { isAuthenticated, loading, authError, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // BUG-078: ?from= is user-controlled, only same-site paths get through
  const from = safeInternalPath(searchParams.get('from'));
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  // BUG-079: a failed sign-in shows a real message. A popup the user closed
  // themselves shows nothing and does NOT redirect (BUG-080).
  async function handleSignIn() {
    setMessage(null);
    setBusy(true);
    const result = await signInWithGoogle();
    if (!result.ok) {
      setMessage(authErrorMessage(result.error?.code));
      setBusy(false);
    } else if (!result.redirected) {
      setBusy(false);
    }
  }
  const shownMessage = message || (authError ? authErrorMessage(authError.code) : null);

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace(from);
  }, [loading, isAuthenticated, from, router]);

  if (!loading && isAuthenticated) return null;

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.left}
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      >
        <div className={styles.brand}>
          <span className={styles.brandIcon}>◈</span>
          <span className={styles.brandName}>Atlas</span>
        </div>

        <div className={styles.leftContent}>
          <div className={styles.leftTop}>
            <h1 className={styles.leftTitle}>
              Your route through the problems, saved to you.
            </h1>
            <p className={styles.leftSub}>
              {fmt(dsaCount + cpCount)} problems from LeetCode, Codeforces, and CSES, plus {fmt(notesCount)} study
              notes, each one explained instead of just answered. Sign in once and what you&apos;ve
              solved, attempted, and bookmarked follows you to any device.
            </p>
          </div>

          <div className={styles.flowList}>
            {PATHS.map((p, i) => (
              <motion.div
                key={p.step}
                className={styles.flowItem}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08, duration: 0.38 }}
              >
                <span className={styles.flowStep}>{p.step}</span>
                <span className={styles.flowConnector} />
                <span className={styles.flowLabel}>{p.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className={styles.glow} aria-hidden="true" />
      </motion.div>

      <div className={styles.right}>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className={styles.mobileBrand}>
            <span className={styles.brandIcon}>◈</span>
            <span className={styles.brandName}>Atlas</span>
          </div>

          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Sign in to continue</h2>
            <p className={styles.cardSub}>Progress is tied to your account and synced across devices.</p>
          </div>

          <button
            className={`${styles.googleBtn} ${busy ? styles.googleBtnBusy : ''}`}
            onClick={handleSignIn}
            disabled={loading || busy}
          >
            <span className={styles.googleIconWrap}><GoogleIcon /></span>
            <span>{busy ? 'Opening Google...' : 'Continue with Google'}</span>
          </button>

          {shownMessage && <p className={styles.signInError} role="alert">{shownMessage}</p>}

          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>free, no card needed</span>
            <span className={styles.dividerLine} />
          </div>

          <ul className={styles.perks}>
            <li>Track solved, attempted, and bookmarked problems</li>
            <li>Unlock Atlas Roadmap levels as you progress</li>
            <li>Dashboard with streaks, charts, and topic stats</li>
          </ul>

          <p className={styles.legal}>
            By signing in you agree to the <Link href="/terms">terms</Link> and use this platform responsibly. See the <Link href="/privacy">privacy page</Link>.
            <br />
            <span className={styles.legalAi}>Note: solutions are AI-generated and may contain errors- verify before relying on them.</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
