'use client';

import { useEffect, useRef, useState } from 'react';
import { RATING_BANDS, matchesRatingBand, getCfUrl } from '../../../lib/codeforces.utils.js';
import { useUIStore } from '../../../store/ui.store.js';
import { pickRandom } from '../../../lib/random.js';
import styles from './RandomProblemButton.module.css';

/* Two ways to trigger this, both locked down after discussion:
   - Plain click: random problem from whatever's CURRENTLY VISIBLE on the page - topic + rating-band
     chip + status + search, all of it. No filters active -> draws from the full ~10k list.
   - The small arrow opens a dropdown of rating bands. Picking one there draws random from (topic +
     status + search, if any are active) AND that chosen band specifically - but it does NOT touch or
     override the page's actual rating-band chip. This is a one-off scoping for this one draw only,
     not a second filter state to keep in sync with the visible chips - picking "1600-1899" here and
     then looking at the chip row above, the chip row is untouched. That's the whole point: one
     filtering surface (the chips), one convenience override (this dropdown) that never contradicts it. */
export default function RandomProblemButton({ visibleProblems, filteredWithoutRating }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const openRandomFrom = (pool) => {
    if (pool.length === 0) {
      addToast('No problems match to pick from', 'error');
      return;
    }
    const pick = pickRandom(pool);
    const url = getCfUrl(pick);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleMainClick = () => openRandomFrom(visibleProblems);

  const handleBandPick = (bandKey) => {
    setOpen(false);
    openRandomFrom(filteredWithoutRating.filter((p) => matchesRatingBand(p._cfRating, bandKey)));
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button className={styles.main} onClick={handleMainClick} title="Open a random problem from what's currently shown">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
          <circle cx="4.5" cy="4.5" r="1.3" /><circle cx="11.5" cy="4.5" r="1.3" />
          <circle cx="8" cy="8" r="1.3" /><circle cx="4.5" cy="11.5" r="1.3" /><circle cx="11.5" cy="11.5" r="1.3" />
        </svg>
        Random
      </button>
      <button className={styles.caret} onClick={() => setOpen((o) => !o)} aria-label="Pick a rating band for a random problem" aria-expanded={open}>
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          <p className={styles.dropdownHint}>Random from a specific band (ignores the rating chip above, keeps topic/status)</p>
          {RATING_BANDS.map((band) => (
            <button key={band.key} className={styles.bandItem} role="menuitem" onClick={() => handleBandPick(band.key)}>
              <span className={styles.bandDot} style={{ background: band.color }} />
              {band.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
