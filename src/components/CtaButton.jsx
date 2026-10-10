'use client';

import Link from 'next/link';
import { useAuthStore } from '../store/auth.store.js';
import { getCtaHref } from '../lib/ctaHref.js';

// a real Next Link (middle-click, new tab, crawlable)
export default function CtaButton({ to, className, children, requiresAuth = false, ...rest }) {
  const isAuthed = useAuthStore((s) => !!s.user);
  const authReadyRaw = useAuthStore((s) => s.authReady);
  const authReady = authReadyRaw === undefined ? true : authReadyRaw;

  const href = getCtaHref({ to, requiresAuth, isAuthed, authReady });

  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}
