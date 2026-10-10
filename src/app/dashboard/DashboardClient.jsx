'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth.js';
import { useProgress } from '../../hooks/useProgress.js';
import { useBookmarks } from '../../hooks/useBookmarks.js';
import { useDsaIndex, useCpIndex } from '../../hooks/useProblems.js';
import { useRoadmap } from '../../hooks/useRoadmap.js';
import { usePostCard, POST_CARD_HINT } from '../../hooks/usePostCard.js';
import { getStats, buildHeatmapWeeks, calcWeeklySolves } from '../../lib/stats.js';
import { needsCpIndex } from '../../lib/resolveIds.js';
import { visibleRoadmap } from '../../lib/roadmap.js';
import { relativeTime } from '../../lib/format.utils.js';
import { getDifficultyColor } from '../../lib/difficulty.utils.js';
import {
  headerLine, recentDaysStrip, weekComparison, describeWeekDelta, weeklySeries, cumulativeSeries, dsaSolvesByDate,
  difficultyRows, topicRows, chartTopics, canShowRadar, strongestTopics, needsAttentionTopics, roadmapView,
  lastSolvedAt, recentSolves, cpBandRows, percentOfCatalogue,
} from '../../lib/dashboardData.js';
import { NOTES_TOPICS_INDEX } from '../../constants/notes.js';
import {
  weeklyBarsConfig, sparklineConfig, weekDaysConfig, difficultyDoughnutConfig, topicBarConfig, topicRadarConfig, cpBandsConfig,
} from '../../components/dashboard/charts/chartConfigs.js';
import ChartCanvas from '../../components/dashboard/charts/ChartCanvas.jsx';
import Heatmap from '../../components/dashboard/Heatmap.jsx';
import RoadmapPanel from '../../components/dashboard/RoadmapPanel.jsx';
import CpUpsolve from '../../components/dashboard/CpUpsolve/CpUpsolve.jsx';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import { Loader } from '../../components/ui/Loader/Loader.jsx';
import styles from './Dashboard.module.css';

const HEATMAP_WEEKS = 53;
const WEEKS_SHOWN = 12;
const TOPIC_NAME_BY_SLUG = Object.fromEntries(NOTES_TOPICS_INDEX.map((t) => [t.slug, t.topic]));
const DIFF_TONE = { Easy: 'var(--diff-easy)', Medium: 'var(--diff-medium)', Hard: 'var(--diff-hard)', Expert: 'var(--diff-expert)' };

const Icon = ({ children }) => (
  <svg className={styles.pillIcon} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

function Card({ title, subtitle, actions, className = '', children }) {
  return (
    <section className={`${styles.card} ${className}`}>
      {(title || actions) && (
        <header className={styles.cardHead}>
          <div>
            {title && <h2 className={styles.cardTitle}>{title}</h2>}
            {subtitle && <p className={styles.cardSub}>{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

function Kpi({ label, value, unit, sub, subTone, children }) {
  return (
    <div className={`${styles.card} ${styles.kpi}`}>
      <span className={styles.kpiLabel}>{label}</span>
      <div className={styles.kpiValueRow}>
        <span className={styles.kpiValue}>{value}</span>
        {unit && <span className={styles.kpiUnit}>{unit}</span>}
      </div>
      {sub && <span className={styles.kpiSub} data-tone={subTone}>{sub}</span>}
      {children}
    </div>
  );
}

const TopicList = ({ title, rows, render }) => (rows.length === 0 ? null : (
  <div className={styles.insight}>
    <h3 className={styles.insightTitle}>{title}</h3>
    <ul className={styles.chipRow}>{rows.map((r) => <li key={r.name} className={styles.insightChip}>{render(r)}</li>)}</ul>
  </div>
));

export default function DashboardClient() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { progressList, isLoading: progressLoading, loadError, retry } = useProgress();
  const { bookmarks, isLoading: bookmarksLoading, loadError: bookmarksError, retry: retryBookmarks } = useBookmarks();
  const { data: allProblems, isLoading: indexLoading, isError: indexError, refetch: refetchIndex } = useDsaIndex();
  const { data: roadmapLevels, isLoading: roadmapLoading } = useRoadmap();
  const router = useRouter();
  const { download: downloadCard, busy: cardBusy } = usePostCard();
  const [topicView, setTopicView] = useState('bars');

  const cpNeeded = useMemo(() => needsCpIndex(progressList.map((p) => p.canonical_id), allProblems), [progressList, allProblems]);
  const { data: cpProblems, isLoading: cpLoading } = useCpIndex({ enabled: cpNeeded });
  const cpPending = cpNeeded && cpLoading;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login?from=/dashboard');
  }, [authLoading, isAuthenticated, router]);

  const stats = useMemo(() => (allProblems ? getStats(progressList, allProblems, cpNeeded ? cpProblems : []) : null), [progressList, allProblems, cpProblems, cpNeeded]);
  const data = useMemo(() => {
    if (!stats || !allProblems) return null;
    const sbd = stats.activity.solves_by_date;
    const dsaWeekly = calcWeeklySolves(dsaSolvesByDate(progressList, allProblems), WEEKS_SHOWN);
    const topics = topicRows(allProblems, progressList);
    const week = weekComparison(sbd);
    const weekly = weeklySeries(sbd, WEEKS_SHOWN);
    const cumulative = cumulativeSeries(dsaWeekly, stats.dsa.solved);
    return {
      dsaTotal: allProblems.filter((p) => p.should_generate !== false).length,
      week,
      weekly,
      cumulative,
      sparkData: { values: cumulative },
      weekData: { days: week.days },
      strip: recentDaysStrip(sbd),
      heatWeeks: buildHeatmapWeeks(sbd, HEATMAP_WEEKS),
      difficulty: difficultyRows(allProblems, progressList),
      topics: chartTopics(topics, 8),
      strongest: strongestTopics(topics),
      attention: needsAttentionTopics(topics),
      recent: recentSolves(progressList, allProblems, 5),
      lastSolved: lastSolvedAt(progressList),
    };
  }, [stats, allProblems, progressList]);
  const roadmap = useMemo(() => roadmapView(visibleRoadmap(roadmapLevels || []), TOPIC_NAME_BY_SLUG), [roadmapLevels]);
  const cpBands = useMemo(() => cpBandRows(progressList, cpNeeded ? cpProblems : undefined), [progressList, cpProblems, cpNeeded]);
  const diffData = useMemo(() => (data ? { rows: data.difficulty } : null), [data]);
  const topicData = useMemo(() => (data ? { rows: data.topics } : null), [data]);
  const cpData = useMemo(() => ({ rows: cpBands }), [cpBands]);

  const hasError = !!indexError || !!loadError || !!bookmarksError;
  const handleRetry = () => {
    if (indexError) refetchIndex();
    if (loadError) retry?.();
    if (bookmarksError) retryBookmarks?.();
  };
  const isLoading = authLoading || progressLoading || bookmarksLoading || indexLoading || roadmapLoading || (!data && !hasError);

  if (!authLoading && !isAuthenticated) return null;
  if (hasError) {
    return (
      <PageWrapper>
        <div className={styles.errorBox} role="alert">
          <p>Couldn&apos;t load your dashboard.</p>
          <button type="button" className={styles.retryBtn} onClick={handleRetry}>Retry</button>
        </div>
      </PageWrapper>
    );
  }
  if (isLoading) return <PageWrapper><div className={styles.loading}><Loader size={32} /></div></PageWrapper>;

  const { dsa, cp, activity } = stats;
  const firstName = user?.displayName?.split(' ')[0] || null;
  const isNew = dsa.solved === 0 && activity.attempted === 0 && !cpPending && cp.solved === 0;
  const todayCount = data.week.days.find((d) => d.isToday)?.count || 0;
  const showCp = cpPending || cp.solved > 0;
  const radarOk = canShowRadar(data.topics);
  const view = radarOk ? topicView : 'bars';

  const weeklyTable = { caption: 'Solves per week, last 12 weeks', headers: ['Week of', 'Solves'], rows: data.weekly.labels.map((l, i) => [l, data.weekly.counts[i]]) };
  const diffTable = { caption: 'Solved by difficulty', headers: ['Difficulty', 'Solved', 'Total'], rows: data.difficulty.map((r) => [r.name, r.solved, r.total]) };
  const topicTable = { caption: 'Practice by topic', headers: ['Topic', 'Solved', 'Tried', 'Topic size'], rows: data.topics.map((r) => [r.name, r.solved, r.attempted, r.total]) };
  const weekTable = { caption: 'Solves this week', headers: ['Day', 'Solves'], rows: data.week.days.map((d) => [d.date, d.count]) };
  const cumTable = { caption: 'Total DSA problems solved, last 12 weeks', headers: ['Week of', 'Total solved'], rows: data.weekly.labels.map((l, i) => [l, data.cumulative[i]]) };
  const cpTable = { caption: 'Solved CP problems by rating band', headers: ['Band', 'Solved'], rows: cpBands.map((b) => [b.label, b.count]) };

  return (
    <PageWrapper>
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.greeting}>{firstName ? `Hey, ${firstName}` : 'Your dashboard'}</h1>
            <p className={styles.greetingSub}>
              {headerLine({ isNew, currentStreak: activity.current_streak, solvedToday: todayCount > 0, todayCount })}
            </p>
          </div>
          <nav className={styles.headerActions} aria-label="Your lists">
            <button type="button" className={styles.pillBtn} onClick={downloadCard} disabled={cardBusy} title={POST_CARD_HINT}>
              <Icon><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></Icon>
              <span className={styles.pillText}>
                <span className={styles.labelFull}>{cardBusy ? 'Creating...' : 'Post your card'}</span>
                <span className={styles.labelShort}>{cardBusy ? '...' : 'Card'}</span>
              </span>
            </button>
            <Link href="/bookmarks" className={styles.pillBtn}>
              <Icon><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" /></Icon>
              <span className={styles.pillText}><span>Bookmarks</span></span>
              <span className={styles.pillCount}>{bookmarks.length}</span>
            </Link>
            <Link href="/history" className={styles.pillBtn}>
              <Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
              <span className={styles.pillText}>
                <span>History</span>
                {data.lastSolved && <span className={`${styles.pillSub} ${styles.hideOnPhone}`}>Last solved {relativeTime(data.lastSolved)}</span>}
              </span>
            </Link>
          </nav>
        </header>

        <div className={styles.grid}>
          <div className={styles.span3}>
            <Kpi label="DSA solved" value={dsa.solved} sub={`of ${data.dsaTotal} problems (${percentOfCatalogue(dsa.solved, data.dsaTotal)})${!cpPending && cp.solved > 0 ? `, plus ${cp.solved} CP` : ''}`}>
              {!isNew && (
                <div className={styles.kpiChart}>
                  <ChartCanvas builder={sparklineConfig} data={data.sparkData} label="Total DSA problems solved over the last 12 weeks" height={44} table={cumTable} />
                </div>
              )}
            </Kpi>
          </div>
          <div className={styles.span3}>
            <Kpi label="Day streak" value={activity.current_streak} unit={activity.current_streak === 1 ? 'day' : 'days'} sub={`best ${activity.longest_streak} ${activity.longest_streak === 1 ? 'day' : 'days'}`}>
              <ol className={styles.dayStrip} aria-label="Last 7 days">
                {data.strip.map((d) => (
                  <li key={d.date} className={styles.dayDot} data-solved={d.solved || undefined} data-today={d.isToday || undefined} title={`${d.date}${d.solved ? ': solved' : ''}`}>
                    <span className={styles.srOnly}>{d.date} {d.solved ? 'solved' : 'no solve'}</span>
                  </li>
                ))}
              </ol>
            </Kpi>
          </div>
          <div className={styles.span3}>
            <Kpi label="This week" value={data.week.thisWeek} unit={data.week.thisWeek === 1 ? 'solve' : 'solves'} sub={describeWeekDelta(data.week)} subTone={data.week.delta > 0 ? 'up' : undefined}>
              <div className={styles.kpiChart}>
                <ChartCanvas builder={weekDaysConfig} data={data.weekData} label="Solves per day this week" height={44} table={weekTable} />
              </div>
            </Kpi>
          </div>
          <div className={styles.span3}>
            <Kpi label="Attempted" value={activity.attempted} sub={activity.attempted === 0 ? 'nothing half-finished' : 'started, not solved yet'} />
          </div>

          {isNew ? (
            <>
              <Card className={styles.span12} title="Nothing solved yet - that is the starting line" subtitle="Your streak, calendar and topic charts fill in as you mark problems solved.">
                <div className={styles.welcomeActions}>
                  <Link href="/roadmap" className={styles.primaryBtn}>Start the roadmap</Link>
                  <Link href="/problems" className={styles.secondaryBtn}>Browse all problems</Link>
                </div>
              </Card>
              <Card className={styles.span12} title="Roadmap" subtitle="A guided path from the basics to advanced topics.">
                <RoadmapPanel view={roadmap} />
              </Card>
            </>
          ) : (
            <>
              <Card className={styles.span12} title="Activity" subtitle="Every solve counts here and in the streaks, DSA and CP together.">
                <Heatmap weeks={data.heatWeeks} />
              </Card>

              <Card className={styles.span7} title="Weekly pace" subtitle="Solves per week, last 12 weeks">
                <ChartCanvas builder={weeklyBarsConfig} data={data.weekly} label="Solves per week for the last 12 weeks" height={230} table={weeklyTable} />
              </Card>

              <Card className={styles.span5} title="Difficulty" subtitle="What you solved, against what exists">
                <div className={styles.diffLayout}>
                  <div className={styles.diffChart}>
                    <ChartCanvas builder={difficultyDoughnutConfig} data={diffData} label="DSA problems solved by difficulty" height={170} table={diffTable} />
                  </div>
                  <ul className={styles.diffLegend}>
                    {data.difficulty.map((r) => (
                      <li key={r.name} className={styles.diffRow} style={{ '--tone': DIFF_TONE[r.name] }}>
                        <span className={styles.diffDot} />
                        <span className={styles.diffName}>{r.name}</span>
                        <span className={styles.diffCount}>{r.solved}<span className={styles.diffOf}> / {r.total}</span></span>
                        <div className={styles.bar} role="presentation"><div className={styles.barFill} data-tone="custom" style={{ '--pct': `${r.total ? Math.max(r.solved ? 3 : 0, Math.round((r.solved / r.total) * 100)) : 0}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card
                className={styles.span7}
                title="Topics"
                subtitle={view === 'bars' ? 'Where your practice goes: solved and tried' : 'The shape of your practice across topics'}
                actions={(
                  <div className={styles.rangeGroup} role="group" aria-label="Topic chart type">
                    <button type="button" className={styles.rangeBtn} aria-pressed={view === 'bars'} onClick={() => setTopicView('bars')}>Bars</button>
                    <button type="button" className={styles.rangeBtn} aria-pressed={view === 'radar'} disabled={!radarOk} title={radarOk ? undefined : 'Needs at least 3 topics'} onClick={() => setTopicView('radar')}>Radar</button>
                  </div>
                )}
              >
                {data.topics.length === 0 ? (
                  <p className={styles.empty}>Topic charts appear once you have solved or attempted a problem.</p>
                ) : (
                  <>
                    <ChartCanvas
                      key={view}
                      builder={view === 'bars' ? topicBarConfig : topicRadarConfig}
                      data={topicData}
                      label={view === 'bars' ? 'Solved and attempted problems per topic' : 'Radar of solved problems per topic'}
                      height={view === 'bars' ? Math.max(210, data.topics.length * 38 + 64) : 290}
                      table={topicTable}
                    />
                    {(data.strongest.length > 0 || data.attention.length > 0) && (
                      <div className={styles.insights}>
                        <TopicList title="Strongest" rows={data.strongest} render={(r) => <>{r.name} <b>{r.solved}</b> of {r.total}</>} />
                        <TopicList title="Needs attention" rows={data.attention} render={(r) => <>{r.name} <b>{r.attempted}</b> tried, {r.solved} solved</>} />
                      </div>
                    )}
                  </>
                )}
              </Card>

              <Card className={styles.span5} title="Roadmap" subtitle="Your guided path">
                <RoadmapPanel view={roadmap} />
              </Card>

              <Card
                className={showCp ? styles.span7 : styles.span12}
                title="Recent solves"
                actions={<Link href="/history" className={styles.textLink}>View all in History</Link>}
              >
                {data.recent.length === 0 ? (
                  <p className={styles.empty}>Your latest DSA solves will show up here.</p>
                ) : (
                  <ul className={styles.recentList}>
                    {data.recent.map((p) => (
                      <li key={p.canonical_id}>
                        <Link href={`/problems/${p.slug}`} className={styles.recentRow}>
                          <span className={styles.recentTitle}>{p.title}</span>
                          {p.difficulty_label && <span className={styles.recentTag} style={{ color: getDifficultyColor(p.difficulty) }}>{p.difficulty_label}</span>}
                          <span className={styles.recentWhen}>{relativeTime(p.at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {showCp && (
                <Card className={styles.span5} title="Competitive programming" subtitle={cpPending ? 'Loading your CP data...' : `${cp.solved} solved, ${cp.attempted} attempted`}>
                  {cpPending ? <p className={styles.empty}>Fetching the Codeforces index...</p> : (
                    <>
                      <ChartCanvas builder={cpBandsConfig} data={cpData} label="Solved Codeforces problems by rating band" height={190} table={cpTable} />
                      <CpUpsolve progressList={progressList} />
                    </>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
