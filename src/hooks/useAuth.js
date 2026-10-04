'use client';

import { useAuthStore } from '../store/auth.store.js';

// selectors, so this hook no longer re-renders on every progress/bookmark change
export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const authReady = useAuthStore((s) => s.authReady !== false);
  const authError = useAuthStore((s) => s.authError);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signOut = useAuthStore((s) => s.signOut);
  return { user, loading, authReady, authError, isAuthenticated: !!user, signInWithGoogle, signOut };
};
