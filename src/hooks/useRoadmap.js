'use client';

import { useMemo } from 'react';
import { useDsaIndex } from './useProblems.js';
import { useProgress } from './useProgress.js';
import { buildRoadmapWithCounts, enrichRoadmap } from '../lib/roadmap.js';
import { getByRoadmapLevel } from '../lib/problems.filter.js';
import { ROADMAP_LEVELS } from '../constants/roadmap.js';

// the roadmap is only "ready" when the index is loaded
export const useRoadmap = () => {
  const { data: allProblems, isLoading: indexLoading, isError: indexError, refetch: refetchIndex } = useDsaIndex();
  const { progressMap, isLoading: progressLoading, loadError, retry } = useProgress();

  const isReady = !!allProblems && !progressLoading && !loadError;
  const isError = !!indexError || !!loadError;

  const enrichedData = useMemo(() => {
    if (!isReady) return [];
    const withCounts = buildRoadmapWithCounts(ROADMAP_LEVELS, allProblems);
    return enrichRoadmap(withCounts, allProblems, progressMap);
  }, [isReady, allProblems, progressMap]);

  const refetch = () => {
    if (indexError) refetchIndex();
    if (loadError) retry?.();
  };

  return { data: enrichedData, isLoading: indexLoading || progressLoading, isReady, isError, refetch };
};

export const useRoadmapLevel = (level) => {
  const { data: allProblems, isLoading, isError, refetch } = useDsaIndex();

  const problems = useMemo(() => {
    if (!allProblems || level === undefined || level === null) return [];
    const validTopics = ROADMAP_LEVELS[level]?.topicSlugs
      ? new Set(ROADMAP_LEVELS[level].topicSlugs)
      : undefined;
    return getByRoadmapLevel(allProblems, level, validTopics);
  }, [allProblems, level]);

  return { data: problems, isLoading, isError, refetch };
};
