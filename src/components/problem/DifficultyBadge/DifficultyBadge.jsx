import { getDifficultyColor, getDifficultyBg, getDifficultyLabel } from '../../../utils/difficulty.utils.js';
import styles from './DifficultyBadge.module.css';

export default function DifficultyBadge({ score, showScore = false }) {
  const color = getDifficultyColor(score);
  const bg    = getDifficultyBg(score);
  const label = getDifficultyLabel(score);

  return (
    <span className={styles.badge} style={{ color, backgroundColor: bg }}>
      {showScore ? `${score}/10` : label}
    </span>
  );
}
