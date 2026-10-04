'use client';

import { nameHue } from '../../lib/nameHue.js';
import { useMemo, useState } from 'react';
import { logoCandidates } from '../../lib/companyLogos.js';
import styles from './CompanyBadge.module.css';

function initials(name) {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/\s+/);
  return (words[0]?.[0] || '?').toUpperCase();
}

export { nameHue }; // re-exported so existing imports keep working

// Local file first (`logo`: /logos/<id>.png, a 128px trimmed+padded square generated once by
// scripts/one-time/build-logos.mjs - present for the companies that had artwork in an open-source icon set, null for
// the rest), then the remote chain from logoCandidates(domain) (Logo.dev if a token is configured, then Google's
// favicon service), initials badge once every candidate has failed or nothing was given. `domain` comes from the
// company's own data (registry.json -> index.json / companies/<id>.json), not a name-keyed lookup - see
// lib/companyLogos.js for why. Shared between the companies list cards and the company detail header.
export default function CompanyBadge({ name, domain, logo, size = 40 }) {
  const candidates = useMemo(
    () => [...(logo ? [logo] : []), ...logoCandidates(domain, size * 2)],
    [logo, domain, size],
  );
  const [attempt, setAttempt] = useState(0);
  const hue = nameHue(name);
  const url = candidates[attempt];
  const showLogo = Boolean(url);
  const isLocal = Boolean(logo) && attempt === 0;   // local PNGs are pre-padded, so they fill the tile; remote ones need the inset

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
