import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className={styles.code}>404</span>
        <h1 className={styles.title}>Page not found.</h1>
        <p className={styles.sub}>This route doesn't exist. Wrong problem set?</p>
        <Link to="/problems" className={styles.homeBtn}>Back to Problems →</Link>
      </motion.div>
    </div>
  );
}
