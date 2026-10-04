import { getRatingTier } from '../../../lib/codeforces.utils.js';
import styles from './RatingPill.module.css';

export default function RatingPill({ rating }) {
  if (rating == null) {
    return <span className={styles.pill} data-unrated="true">Unrated</span>;
  }
  const tier = getRatingTier(rating);
  return (
    <span
      className={styles.pill}
      style={{ color: tier.color, borderColor: tier.color, backgroundColor: `${tier.color}1a` }}
      title={tier.name}
    >
      {rating}
    </span>
  );
}
