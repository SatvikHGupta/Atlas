'use client';

import { useRef } from 'react';
import styles from './SwatchGroup.module.css';

// One group of small selectable cards
export default function SwatchGroup({ label, items, value, onChange }) {
  const ref = useRef(null);
  const radios = items.filter((item) => !item.heading);
  const selectedIndex = Math.max(0, radios.findIndex((item) => item.id === value));

  function onKeyDown(event) {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const step = keys[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (selectedIndex + step + radios.length) % radios.length;
    onChange(radios[next].id);
    ref.current?.querySelectorAll('[role="radio"]')[next]?.focus();
  }

  return (
    <div className={styles.grid} role="radiogroup" aria-label={label} ref={ref} onKeyDown={onKeyDown}>
      {items.map((item) => {
        if (item.heading) return <div key={`h-${item.heading}`} role="presentation" className={styles.heading}>{item.heading}</div>;
        const active = item.id === value;
        const index = radios.indexOf(item);
        return (
          <button
            key={item.id ?? 'none'}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={index === selectedIndex ? 0 : -1}
            className={`${styles.card} ${active ? styles.active : ''}`}
            onClick={() => onChange(item.id)}
          >
            <span
              className={`${styles.swatch} ${item.hex === null ? styles.none : ''}`}
              style={item.hex ? { background: item.hex } : undefined}
              aria-hidden="true"
            />
            <span className={styles.text}>
              <span className={styles.name}>{item.name}</span>
              <span className={styles.hex}>{item.hex ?? 'no colour'}</span>
            </span>
            {active && (
              <svg className={styles.check} viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
