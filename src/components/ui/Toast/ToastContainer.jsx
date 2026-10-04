'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useUIStore } from '../../../store/ui.store.js';
import styles from './ToastContainer.module.css';

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  // BUG-012: always-mounted named live region; errors escalate to role=alert.
  // Focus is never moved.
  return (
    <div
      className={styles.container}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={styles.toast}
            data-type={toast.type}
            role={toast.type === 'error' ? 'alert' : undefined}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
