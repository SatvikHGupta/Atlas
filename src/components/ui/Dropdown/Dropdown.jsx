'use client';

// Themed dropdown used instead of a native <select> on phones, where the native
// popup ignores the app theme and renders oversized.
import { useEffect, useId, useRef, useState } from 'react';
import styles from './Dropdown.module.css';

export default function Dropdown({ value, onChange, options, ariaLabel, className = '', align = 'left' }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const current = options.find((o) => o.value === value) || options[0];

  // close on outside tap / Escape while open
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); rootRef.current?.querySelector('button')?.focus(); }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // arrow keys move through options when the list is open
  const onListKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...rootRef.current.querySelectorAll('[role="option"]')];
    const i = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
    items[next]?.focus();
  };

  // open upwards when the list would run off the bottom of the screen (bottom nav counts as screen)
  const toggle = () => {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const needed = options.length * 40 + 16;
      const below = window.innerHeight - rect.bottom - 70;
      setUp(below < needed && rect.top > needed);
    }
    setOpen((o) => !o);
  };

  const pick = (v) => { setOpen(false); if (v !== value) onChange(v); };

  return (
    <div className={`${styles.root} ${className}`} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={toggle}
      >
        <span className={styles.value}>{current?.label}</span>
        <svg className={styles.chevron} data-open={open} viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul className={styles.list} id={listId} role="listbox" aria-label={ariaLabel} onKeyDown={onListKey} data-up={up} data-align={align}>
          {options.map((o) => (
            <li key={o.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={styles.option}
                data-selected={o.value === value}
                autoFocus={o.value === value}
                onClick={() => pick(o.value)}
              >
                {o.label}
                {o.value === value && (
                  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                    <path d="M2.5 6.5 5 9l4.5-5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
