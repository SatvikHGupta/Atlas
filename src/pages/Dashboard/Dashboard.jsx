import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { motion } from 'motion/react';
import { useProgress, useProgressStats } from '../../hooks/useProgress.js';
import { useBookmarks } from '../../hooks/useBookmarks.js';
import { useAuth } from '../../hooks/useAuth.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import StatsSummary from '../../components/charts/StatsSummary/StatsSummary.jsx';
import TopicDonut from '../../components/charts/TopicDonut/TopicDonut.jsx';
import DifficultyBar from '../../components/charts/DifficultyBar/DifficultyBar.jsx';
import ActivityHeatmap from '../../components/charts/ActivityHeatmap/ActivityHeatmap.jsx';
import ProgressRing from '../../components/charts/ProgressRing/ProgressRing.jsx';
import WeeklySolves from '../../components/charts/WeeklySolves/WeeklySolves.jsx';
import styles from './Dashboard.module.css';

const SOLVE_GOAL = 500;

export default function Dashboard() {
  usePageTitle('Dashboard');
  const navigate = useNavigate();
  const { user } = useAuth();

  // display_name and photo_url are already on the Firebase Auth user object-
  // no extra API call or Firestore read needed for the greeting
  const firstName = user?.displayName?.split(' ')[0] || null;

  const { progressList, totalSolved, totalAttempted } = useProgress();
  const { data: statsData } = useProgressStats();
  const { bookmarks }       = useBookmarks();

  const stats = statsData?.data;

  
  const topicData = (stats?.top_topics || []).map((t) => ({ name: t.name, value: t.count }));

  const counterStats = [
    { label: 'Solved',     value: totalSolved,     color: 'var(--solved)'    },
    { label: 'Attempted',  value: totalAttempted,   color: 'var(--attempted)' },
    { label: 'Bookmarked', value: bookmarks.length, color: 'var(--accent)'   },
    { label: 'Streak',     value: stats?.current_streak || 0, color: 'var(--diff-easy)' },
  ];


  return (
    <PageWrapper>
      <div className={styles.wrapper}>

        <motion.div
          className={styles.greeting}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1>{firstName ? `Hey, ${firstName}.` : 'Your Dashboard'}</h1>
          <p>Here's where your CP journey stands today.</p>
        </motion.div>

        {}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatsSummary stats={counterStats} />
        </motion.div>

        {}
        {stats && (
          <motion.div
            className={styles.streakRow}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <div className={styles.streakItem}>
              <span className={styles.streakVal}>{stats.current_streak}</span>
              <span className={styles.streakLabel}>day streak</span>
            </div>
            <div className={styles.streakDivider} />
            <div className={styles.streakItem}>
              <span className={styles.streakVal}>{stats.longest_streak}</span>
              <span className={styles.streakLabel}>best streak</span>
            </div>
            <div className={styles.streakDivider} />
            <div className={styles.streakItem}>
              <span className={styles.streakVal}>{totalAttempted}</span>
              <span className={styles.streakLabel}>attempted</span>
            </div>
          </motion.div>
        )}

        {}
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Solve Activity</h2>
              <p className={styles.cardSub}>Last 6 months</p>
            </div>
            <button className={styles.historyBtn} onClick={() => navigate('/history')}>
              View History →
            </button>
          </div>
          <ActivityHeatmap progressList={progressList} />
        </motion.div>

        {}
        {stats?.weekly_solves && (
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
          >
            <h2 className={styles.cardTitle}>Weekly Solves</h2>
            <p className={styles.cardSub}>Last 12 weeks</p>
            <WeeklySolves data={stats.weekly_solves} />
          </motion.div>
        )}

        {}
        <div className={styles.chartsRow}>
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className={styles.cardTitle}>By Topic</h2>
            <p className={styles.cardSub}>Solved problems per DSA topic</p>
            <TopicDonut data={topicData} totalSolved={totalSolved} />
          </motion.div>

          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className={styles.cardTitle}>By Difficulty</h2>
            <p className={styles.cardSub}>Solved count per difficulty tier</p>
            {}
            <DifficultyBar byDifficulty={stats?.by_difficulty || null} />
          </motion.div>
        </div>

        {}
        <motion.div
          className={styles.goalCard}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className={styles.goalText}>
            <h2 className={styles.cardTitle}>Overall Goal</h2>
            <p className={styles.cardSub}>
              {totalSolved} of {SOLVE_GOAL} problems solved
            </p>
            <p className={styles.goalMotivation}>
              {totalSolved === 0
                ? 'Start with Atlas Level 0 - Foundations.'
                : totalSolved < 50
                ? 'Good start. Keep the streak going.'
                : totalSolved < 200
                ? 'Solid progress. Graphs are waiting.'
                : totalSolved < SOLVE_GOAL
                ? `${SOLVE_GOAL - totalSolved} to goal. You\'ve got this.`
                : 'Goal reached. Set a higher one.'}
            </p>
          </div>
          <ProgressRing value={totalSolved} total={SOLVE_GOAL} size={120} label={`/ ${SOLVE_GOAL}`} />
        </motion.div>

      </div>
    </PageWrapper>
  );
}
