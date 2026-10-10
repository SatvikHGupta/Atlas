'use client';

import { nameHue } from '../../lib/nameHue.js';
import { useEffect, useMemo, useState } from 'react';
import { logoCandidates } from '../../lib/companyLogos.js';
import { readCachedLogo, writeCachedLogo, loadLogoDataUrl } from '../../lib/logoCache.js';
import styles from './CompanyBadge.module.css';

function initials(name) {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/\s+/);
  return (words[0]?.[0] || '?').toUpperCase();
}

export { nameHue };

// Local file first
export default function CompanyBadge({ name, domain, logo, size = 40 }) {
  const px = size * 2;
  const remote = useMemo(() => logoCandidates(domain, px), [domain, px]);
  const candidates = useMemo(() => [...(logo ? [logo] : []), ...remote], [logo, remote]);
  const key = domain ? `${domain}@${px}` : null;

  const [phase, setPhase] = useState(logo || !remote.length ? 'img' : 'checking');
  const [savedUrl, setSavedUrl] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (phase !== 'checking' || !key) return undefined;
    let cancelled = false;
    (async () => {
      const hit = readCachedLogo(key);
      if (hit) { setSavedUrl(hit); setPhase('ready'); return; }
      for (const url of remote) {
        const data = await loadLogoDataUrl(url);
        if (cancelled) return;
        if (data) { writeCachedLogo(key, data); setSavedUrl(data); setPhase('ready'); return; }
      }
      if (!cancelled) setPhase('img');
    })();
    return () => { cancelled = true; };
  }, [phase, key, remote]);

  const hue = nameHue(name);
  const url = phase === 'ready' ? savedUrl : phase === 'img' ? candidates[attempt] : null;
  const showLogo = Boolean(url);
  const isLocal = Boolean(logo) && phase === 'img' && attempt === 0;

  return (
    <span
      className={styles.badge}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        ...(showLogo
          ? { background: '#fff', borderColor: `hsl(${hue} 70% var(--hue-l) / 0.3)` }
          : { color: `hsl(${hue} 85% var(--hue-text-l))`, background: `hsl(${hue} 70% var(--hue-l) / 0.14)`, borderColor: `hsl(${hue} 70% var(--hue-l) / 0.3)` }),
      }}
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={size} height={size} className={isLocal ? styles.logoLocal : styles.logo} referrerPolicy="no-referrer" loading="lazy" decoding="async" onError={() => setAttempt((a) => a + 1)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
