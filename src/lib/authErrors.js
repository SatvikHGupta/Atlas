// Maps Firebase sign-in error codes to friendly messages and fallbacks. Author: Satvik Hemant Gupta

const REDIRECT_FALLBACK_CODES = [
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
];

export function shouldFallbackToRedirect(code) {
  return REDIRECT_FALLBACK_CODES.includes(code);
}

// null means "say nothing" (the user closed the popup on purpose)
export function authErrorMessage(code) {
  switch (code) {
    case 'auth/popup-closed-by-user':
      return null;
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Allow popups for '
        + 'this site and try again.';
    case 'auth/network-request-failed':
      return 'Network problem while signing in. Check your connection '
        + 'and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorised for Google sign-in yet. '
        + 'Please contact the site owner.';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in window was already open. Please try again.';
    default:
      return 'Sign-in failed. Please try again.';
  }
}

export function toAuthError(err) {
  return { code: err?.code || 'unknown', message: err?.message || '' };
}
