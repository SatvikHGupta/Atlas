'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, onAuthStateChanged, deleteUser,
  reauthenticateWithPopup,
} from 'firebase/auth';
import {
  initializeFirestore, getFirestore, persistentLocalCache,
  persistentMultipleTabManager, memoryLocalCache, terminate, clearIndexedDbPersistence,
} from 'firebase/firestore';
import { shouldFallbackToRedirect, toAuthError } from '../lib/authErrors.js';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/* BUG FIX: this used to call initializeApp()/getAuth()/initializeFirestore() at module scope, which runs the instant anything imports this file - including during `next build`'s server-side render pass of every static page (client components still execute their module top level once on the server, for the initial HTML). The root layout renders <Navbar>, which pulls this in through useAuth() -> auth.store.js, so an eager Firebase init here throws `auth/invalid-api-key` and fails the ENTIRE static build (all ~3,300 pages) the moment .env.local isn't loaded in that server process - not just pages that actually need auth. Fixed by deferring every bit of initialization into functions that only run client-side (guarded by `typeof window !== 'undefined'`) and only when actually called - which in practice means "when a component that needs auth mounts in the browser", never during prerendering. */
let app = null;
let authInstance = null;
let firestoreInstance = null;
let providerInstance = null;
let configWarned = false;

function warnIfConfigMissing() {
  if (configWarned) return;
  const missingKeys = Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k);
  if (missingKeys.length > 0) {
    console.error(
      '[Atlas] Firebase config missing. Create .env.local with your Firebase credentials ' +
      '(see .env.example). Missing:', missingKeys.join(', ')
    );
  }
  configWarned = true;
}

// SEC-04: App Check makes Firestore/Auth reject calls that do not come from this site, which is the main brake on
// someone scripting the public API key. Opt-in: set NEXT_PUBLIC_RECAPTCHA_SITE_KEY (reCAPTCHA v3) and then turn on
// enforcement for Firestore in the Firebase console once the metrics look healthy. No key = behaves as before.
function startAppCheck(firebaseApp) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey || typeof window === 'undefined') return;
  try {
    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('[firebase] App Check could not start:', err?.message);
  }
}

function getApp_() {
  if (app) return app;
  warnIfConfigMissing();
  const fresh = getApps().length === 0;
  app = fresh ? initializeApp(firebaseConfig) : getApp();
  if (fresh) startAppCheck(app);
  return app;
}

export function getFirebaseAuth() {
  if (typeof window === 'undefined') return null;
  if (!authInstance) authInstance = getAuth(getApp_());
  return authInstance;
}

export function getFirebaseFirestore() {
  if (typeof window === 'undefined') return null;
  if (!firestoreInstance) firestoreInstance = createFirestore();
  return firestoreInstance;
}

// BUG-175: persistent cache needs IndexedDB, which private mode or a blocked
// storage setting can refuse. Fall back to the in-memory cache, and as a last
// resort to an already-initialised instance (HMR), so Firestore always works.
function createFirestore() {
  const firebaseApp = getApp_();
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (err) {
    console.warn('[firebase] persistent cache unavailable, using memory cache:', err?.message);
    try {
      return initializeFirestore(firebaseApp, { localCache: memoryLocalCache() });
    } catch {
      return getFirestore(firebaseApp);
    }
  }
}

// SEC-11: Firestore keeps the signed-in user's docs in IndexedDB. On sign-out or account deletion that copy must go,
// otherwise the next person on a shared device can read it. terminate() is required before the cache can be cleared;
// the next getFirebaseFirestore() call builds a fresh instance. Never throws (another open tab can block the clear).
export async function clearFirestoreLocalData() {
  const db = firestoreInstance;
  if (!db) return;
  firestoreInstance = null;
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch (err) {
    console.warn('[firebase] could not clear the local Firestore cache:', err?.message);
  }
}

function getGoogleProvider() {
  if (!providerInstance) providerInstance = new GoogleAuthProvider();
  return providerInstance;
}

function isLikelyPopupUnfriendly() {
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|LinkedInApp/i.test(ua);
}

// BUG-079/080: never throws. Returns { ok, user?, redirected?, error? } so the
// login page can show a real message. Redirect is only a fallback for
// popup-blocked / unsupported environments, never for a user-closed popup.
export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) return { ok: false, error: { code: 'auth/unavailable', message: 'Auth is not available here.' } };
  const provider = getGoogleProvider();

  try {
    if (isLikelyPopupUnfriendly()) {
      await signInWithRedirect(auth, provider);
      return { ok: true, redirected: true };
    }
    const cred = await signInWithPopup(auth, provider);
    return { ok: true, user: cred.user };
  } catch (err) {
    if (!shouldFallbackToRedirect(err?.code)) return { ok: false, error: toAuthError(err) };
    try {
      await signInWithRedirect(auth, provider);
      return { ok: true, redirected: true };
    } catch (redirectErr) {
      return { ok: false, error: toAuthError(redirectErr) };
    }
  }
}

// Fresh Google popup for the signed-in user, needed before account deletion
// when the session is too old (auth/requires-recent-login). Never throws.
export async function reauthWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) return { ok: false, error: { code: 'auth/no-current-user', message: 'Not signed in.' } };
  try {
    await reauthenticateWithPopup(auth.currentUser, getGoogleProvider());
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toAuthError(err) };
  }
}

export const consumeRedirectResult = () => getRedirectResult(getFirebaseAuth());
export const signOutUser = () => signOut(getFirebaseAuth());

// Firebase requires a "recent" sign-in for this - throws auth/requires-recent-login if the user's session is old, which the settings page UI must catch and prompt a fresh sign-in for before retrying. Does not delete the user's Firestore documents (progress/bookmarks/users/{uid}) - that's a separate step (deleteAllUserData in firestore.js) and useAccount.deleteAccount runs it BEFORE this, since the security rules need a signed-in user (BUG-073).
export const deleteAccountUser = () => {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error('No signed-in user to delete.');
  return deleteUser(auth.currentUser);
};
export function watchAuthState(callback) {
  const auth = getFirebaseAuth();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}
