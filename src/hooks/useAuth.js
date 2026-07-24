import { useAuthStore } from '../store/auth.store.js';

export const useAuth = () => {
  const { user, loading, signInWithGoogle, signOut } = useAuthStore();
  return { user, loading, isAuthenticated: !!user, signInWithGoogle, signOut };
};
