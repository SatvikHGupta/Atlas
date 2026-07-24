import { motion } from 'motion/react';
import styles from './PageWrapper.module.css';

const variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export default function PageWrapper({ children, className = '' }) {
  return (
    <motion.main
      className={`${styles.page} ${className}`}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.main>
  );
}
