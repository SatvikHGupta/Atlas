import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useProblem } from '../../hooks/useProblems.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useProgress } from '../../hooks/useProgress.js';
import { useBookmarks } from '../../hooks/useBookmarks.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import DifficultyBadge from '../../components/problem/DifficultyBadge/DifficultyBadge.jsx';
import ExplanationTabs from '../../components/problem/ExplanationTabs/ExplanationTabs.jsx';
import SolutionViewer from '../../components/problem/SolutionViewer/SolutionViewer.jsx';

import RedirectButton from '../../components/problem/RedirectButton/RedirectButton.jsx';
import { SkeletonDetail } from '../../components/ui/Loader/Loader.jsx';
import styles from './ProblemDetail.module.css';

// Always renders regardless of platform data or solve status
// Falls back to LeetCode search when no direct URL available
function SolveButton({ platforms, title }) {
  const primary = platforms?.find((p) => p.platform === 'leetcode') || platforms?.[0];
  const url = primary?.url
    || `https://leetcode.com/search/?q=${encodeURIComponent(title || '')}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={styles.solveBtn}>
      Solve ↗
    </a>
  );
}

export default function ProblemDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useProblem(slug);
  const { getStatus, markSolved, markAttempted, resetProgress } = useProgress();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  // dynamic title- updates once problem data loads
  const problem = data?.data;
  usePageTitle(problem?.title || 'Problem');

  if (isLoading) {
    return <PageWrapper><SkeletonDetail /></PageWrapper>;
  }

  
  if (isError || !problem) {
    return (
      <PageWrapper>
        <div className={styles.notFound}>
          <h2>Problem not found</h2>
          <p>This problem may not exist or couldn't be loaded. Try going back to the problems list.</p>
        </div>
      </PageWrapper>
    );
  }

  const status     = getStatus(problem.canonical_id);
  const bookmarked = isBookmarked(problem.canonical_id);

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        {}
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← Back</button>

        {}
        <motion.div className={styles.header} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{problem.title}</h1>
            <button
              className={styles.bookmarkBtn}
              onClick={() => toggleBookmark(problem.canonical_id)}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark problem'}
            >
              {bookmarked ? '★' : '☆'}
            </button>
          </div>

          <div className={styles.metaRow}>
            <DifficultyBadge score={problem.difficulty} showScore />
            {problem.topics?.map((t) => (
              <span key={t} className={styles.topicTag}>{t}</span>
            ))}
            {problem.patterns?.map((p) => (
              <span key={p} className={styles.patternTag}>{p}</span>
            ))}
          </div>

          <div className={styles.actions}>
            <button
              className={styles.solvedBtn}
              data-active={status === 'solved'}
              onClick={() => status === 'solved' ? resetProgress(problem.canonical_id) : markSolved(problem.canonical_id)}
              title={status === 'solved' ? 'Click to unmark' : 'Mark as solved'}
            >
              {status === 'solved' ? '✓ Solved' : '✓ Mark Solved'}
            </button>
            <button
              className={styles.attemptedBtn}
              data-active={status === 'attempted'}
              onClick={() => status === 'attempted' ? resetProgress(problem.canonical_id) : markAttempted(problem.canonical_id)}
              title={status === 'attempted' ? 'Click to unmark' : 'Mark as attempted'}
            >
              ~ Attempted
            </button>
            {/* Solve button- always rendered regardless of platform data or solve status */}
            <SolveButton platforms={problem.source_platforms} title={problem.title} />
          </div>
        </motion.div>

        {}

        {}
        <motion.section
          className={styles.section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className={styles.sectionTitle}>Explanation</h2>
          <ExplanationTabs
            shortText={problem.explanation_short}
            longText={problem.explanation_long}
          />
        </motion.section>

        {}
        <motion.section
          className={styles.section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className={styles.sectionTitle}>Solutions</h2>
          <SolutionViewer
            solutions={{
              javascript: {
                algoCode:          problem.solution_algo,
                algoComplexity:    problem.solution_algo_complexity,
                optimalCode:       problem.solution_optimal,
                optimalComplexity: problem.solution_optimal_complexity,
              },
              cpp: {
                algoCode:    problem.solution_algo_cpp,
                optimalCode: problem.solution_optimal_cpp,
              },
              java: {
                algoCode:    problem.solution_algo_java,
                optimalCode: problem.solution_optimal_java,
              },
              python: {
                algoCode:    problem.solution_algo_python,
                optimalCode: problem.solution_optimal_python,
              },
            }}
          />
        </motion.section>
      </div>
    </PageWrapper>
  );
}
