'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store.js';
import { MotionConfig } from 'motion/react';
import { useHydrateFilters, useSignedOutStatusGuard } from '../../hooks/useFilters.js';

export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
  }));

  useHydrateFilters();
  useSignedOutStatusGuard(); // BUG-102/103

  useEffect(() => {
    const unsub = useAuthStore.getState().init();
    return unsub;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* BUG-162: honour prefers-reduced-motion for all Motion animations */}
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </QueryClientProvider>
  );
}
