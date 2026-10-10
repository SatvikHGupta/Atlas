'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth.js';
import { safeInternalPath } from '../../lib/safeRedirect.js';
import { authErrorMessage } from '../../lib/authErrors.js';
import { isInAppBrowser } from '../../lib/pwa.js';
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

// heading follows the page the visitor came from; a generic one otherwise
function headingFor(from) {
  if (from.startsWith('/dashboard')) return ['See your', 'dashboard.'];
  if (from.startsWith('/bookmarks')) return ['Open your', 'bookmarks.'];
  if (from.startsWith('/history')) return ['See your', 'history.'];
  return ['Keep your', 'place.'];
}

// fixed pattern so server and browser render the same cells
const CELLS = Array.from({ length: 130 }, (_, i) => ((i * 7) % 11 === 0 ? 'hi' : (i * 5) % 13 === 0 ? 'mid' : 'lo'));
const SLOW_MS = 8000;

export default function LoginClient() {
  const { isAuthenticated, loading, authError, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = safeInternalPath(searchParams.get('from'));
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setInApp(isInAppBrowser()); }, []);

  // after a few seconds of "Opening Google..." offer a way out
  useEffect(() => {
    if (!busy) { setSlow(false); return undefined; }
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [busy]);

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace(from);
  }, [loading, isAuthenticated, from, router]);

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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const shownMessage = message || (authError ? authErrorMessage(authError.code) : null);
  const [lineA, lineB] = headingFor(from);

  if (!loading && isAuthenticated) return null;

  return (
    <div className={styles.page}>
      <div className={styles.left} aria-hidden="true">
        <div>
          <div className={styles.leftTitle}>Back to<br />the map.</div>
          <div className={styles.heat}>
            {CELLS.map((c, i) => <i key={i} data-level={c} />)}
          </div>
          <p className={styles.leftLine}>0 day streak // 0 solved // your move</p>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.card}>
          <p className={styles.kicker}>// <span className={styles.kickerMobile}>Back to the map</span><span className={styles.kickerDesk}>Sign in</span></p>
          <h1 className={styles.cardTitle}>{lineA}<br />{lineB}</h1>
          <p className={styles.cardSub}>Solved, attempted and bookmarked problems follow you to any device. Free, no card.</p>

          {inApp && (
            <div className={styles.notice} role="note">
              <p>Google sign-in is blocked inside this app&apos;s browser. Open this page in Chrome or Safari.</p>
              <button type="button" className={styles.noticeBtn} onClick={copyLink}>{copied ? 'Link copied' : 'Copy link'}</button>
            </div>
          )}

          <button className={styles.googleBtn} onClick={handleSignIn} disabled={loading || busy} aria-busy={busy}>
            <GoogleIcon />
            <span>{busy ? 'Opening Google...' : 'Continue with Google'}</span>
          </button>

          {slow && (
            <p className={styles.slow} role="status">
              Taking long? <button type="button" className={styles.linkBtn} onClick={() => { setBusy(false); handleSignIn(); }}>Try again</button>
            </p>
          )}
          {shownMessage && <p className={styles.signInError} role="alert">{shownMessage}</p>}

          <Link href="/problems" className={styles.skip}>Not now, keep browsing &rarr;</Link>

          <p className={styles.legal}>
            By continuing you agree to the <Link href="/terms">terms</Link> and <Link href="/privacy">privacy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
