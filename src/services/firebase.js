'use client';

import { isStandalone, isInAppBrowser } from '../lib/pwa.js';
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

// App Check makes Firestore/Auth reject calls that do not come from this site
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

// persistent cache needs IndexedDB
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

// Firestore keeps the signed-in user's docs in IndexedDB
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

// Popups do not work in an installed Home Screen app (window.open returns null) or in in-app browsers
function isLikelyPopupUnfriendly() {
  return isStandalone() || isInAppBrowser();
}

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

// Fresh Google popup for the signed-in user
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

// Firebase requires a "recent"
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
