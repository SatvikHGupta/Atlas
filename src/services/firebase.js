import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, onAuthStateChanged,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missingKeys.length > 0) {
  console.error(
    '[Atlas] Firebase config missing. Create frontend/.env with your Firebase credentials.\n' +
    'Missing keys:', missingKeys.join(', ') + '\n' +
    'Copy frontend/.env.example to frontend/.env and fill in your Firebase project values.'
  );
}

const app = initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);

// Persistent local cache with multi-tab support (docs/04-FIRESTORE-SCHEMA-
// AND-RULES.md "Multi-tab and reconnect behavior"). Without the multi-tab
// manager, opening the app in two tabs can throw "precondition failed:
// another tab has exclusive access."
export const firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const googleProvider = new GoogleAuthProvider();

// Mobile hardening (docs/07-MOBILE-CONSIDERATIONS.md): signInWithPopup is
// where mobile breaks hardest - in-app browsers (Instagram/TikTok/LinkedIn
// share-link webviews), some Android WebViews, and occasional iOS Safari
// popup flakiness. Detect these and use signInWithRedirect instead.
function isLikelyPopupUnfriendly() {
  const ua = navigator.userAgent || '';
  // Common in-app browser signatures.
  const inAppBrowser = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|LinkedInApp/i.test(ua);
  return inAppBrowser;
}

export async function signInWithGoogle() {
  if (isLikelyPopupUnfriendly()) {
    return signInWithRedirect(firebaseAuth, googleProvider);
  }

  try {
    return await signInWithPopup(firebaseAuth, googleProvider);
  } catch (err) {
    // Popup blocked / closed / failed for any reason - fall back to redirect
    // rather than leaving the user stuck with a dead "sign in" button.
    const popupFailureCodes = [
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
    ];
    if (popupFailureCodes.includes(err?.code)) {
      return signInWithRedirect(firebaseAuth, googleProvider);
    }
    throw err;
  }
}

/** Call once on app init to pick up the result of a signInWithRedirect flow. */
export const consumeRedirectResult = () => getRedirectResult(firebaseAuth);

export const signOutUser = () => signOut(firebaseAuth);
export { onAuthStateChanged };
