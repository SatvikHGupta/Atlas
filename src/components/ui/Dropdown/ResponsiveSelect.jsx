'use client';

// Native <select> on desktop, themed Dropdown on phones (<= 768px).
// Both are rendered and CSS picks one, so there is no hydration mismatch or flash.
import Dropdown from './Dropdown.jsx';
import styles from './ResponsiveSelect.module.css';

export default function ResponsiveSelect({ value, onChange, options, ariaLabel, id, nativeClassName = '', phoneClassName = '', align = 'left' }) {
  return (
    <>
      <select
        id={id}
        className={`${styles.desktopOnly} ${nativeClassName}`}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className={styles.phoneOnly}>
        <Dropdown className={phoneClassName} ariaLabel={ariaLabel} value={value} onChange={onChange} options={options} align={align} />
      </div>
    </>
  );
}
