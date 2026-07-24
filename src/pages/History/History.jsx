import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { motion } from 'motion/react';
import { useProgress } from '../../hooks/useProgress.js';
import { useProblemLookup } from '../../hooks/useProblemLookup.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import DifficultyBadge from '../../components/problem/DifficultyBadge/DifficultyBadge.jsx';
import styles from './History.module.css';

function groupByDate(list) {
  const groups = {};
  const sorted = [...list].sort((a, b) => {
    const ta = a.first_solved_at || a.updated_at || 0;
    const tb = b.first_solved_at || b.updated_at || 0;
    return new Date(tb) - new Date(ta);
  });

  for (const item of sorted) {
    const raw = item.first_solved_at || item.updated_at;
    if (!raw) continue;
    const dateKey = new Date(raw).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(item);
  }

  return Object.entries(groups);
}

export default function History() {
  usePageTitle('Solve History');
  const navigate = useNavigate();
  const { progressList, isLoading } = useProgress();
  const problemMap = useProblemLookup();

  const solvedList = progressList.filter((p) => p.status === 'solved');
  const groups = groupByDate(solvedList);

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className={styles.title}>Solve History</h1>
          <span className={styles.count}>{solvedList.length} solved</span>
        </motion.div>

        {isLoading ? (
          <div className={styles.empty}>Loading...</div>
        ) : groups.length === 0 ? (
          <div className={styles.empty}>
            <p>No solved problems yet.</p>
            <span>Mark problems as solved to see your history here.</span>
          </div>
        ) : (
          <div className={styles.timeline}>
            {groups.map(([date, items], gi) => (
              <motion.div
                key={date}
                className={styles.group}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.04 }}
              >
                <div className={styles.dateBadge}>{date}</div>
                <div className={styles.groupItems}>
                  {items.map((item) => {
                    const enriched   = problemMap[item.canonical_id];
                    const title      = enriched?.title;
                    const slug       = enriched?.slug;
                    const difficulty = enriched?.difficulty ?? null;
                    // prefer map's isCp flag; fall back to canonical_id pattern for unresolved entries
                    const isCp = enriched
                      ? enriched.isCp
                      : (item.canonical_id?.includes('codeforces') || item.canonical_id?.includes('cf_'));

                    const displayTitle = title
                      ? title
                      : isCp
                        ? <span className={styles.unknownTitle}>Codeforces problem</span>
                        : <span className={styles.unknownTitle}>Unknown problem</span>;

                    return (
                      <div
                        key={item.canonical_id}
                        className={styles.row}
                        data-clickable={!!slug}
                        onClick={() => slug && navigate(`/problems/${slug}`)}
                        role={slug ? 'link' : undefined}
                        tabIndex={slug ? 0 : undefined}
                        onKeyDown={(e) => e.key === 'Enter' && slug && navigate(`/problems/${slug}`)}
                      >
                        <DifficultyBadge score={difficulty} />
                        <span className={styles.modeBadge} data-cp={isCp}>
                          {isCp ? 'CP' : 'DSA'}
                        </span>
                        <span className={styles.rowTitle}>{displayTitle}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
