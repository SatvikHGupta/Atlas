import { motion } from 'motion/react';
import styles from './FilterChip.module.css';

export default function FilterChip({ label, active, onClick, count }) {
  return (
    <motion.button
      className={styles.chip}
      data-active={active}
      type="button"
      aria-pressed={!!active}
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {label}
      {typeof count === 'number' && <span className={styles.count}>{count}</span>}
    </motion.button>
  );
}
