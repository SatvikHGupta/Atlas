'use client';

import Link from 'next/link';
import { useAuthStore } from '../store/auth.store.js';
import { getCtaHref } from '../lib/ctaHref.js';

/* BUG-083/084/085: a real Next Link (middle-click, new tab, crawlable).
   Public destinations link straight through for everyone. Only when
   requiresAuth is true and the user is signed-out does the href become
   /login?from=<to>, so the return path survives the login flow. While auth
   is unresolved (authReady === false, contract C4) render the direct `to`
   rather than guessing. */
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
