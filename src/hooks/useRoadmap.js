import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { roadmapService } from '../services/roadmap.service.js';
import { enrichRoadmap } from '../lib/roadmap.js';
import { getProblems as fetchAllProblems } from '../services/content/dataClient.js';
import { useProgress } from './useProgress.js';

// Roadmap structure (with per-topic problem counts) is content-layer data -
// fetch-once, cached, same pattern as problems/notes. This replaces the old
// 8-parallel-useQueries level-fetch pattern: roadmapService.getRoadmap()
// and getLevelProblems() both now resolve from the single in-memory
// problems.json array with zero network calls after the initial load
// (docs/02-FOLDER-STRUCTURE.md, docs/05-BUSINESS-LOGIC-MAPPING.md).
export const useRoadmap = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['roadmap'],
    queryFn: roadmapService.getRoadmap,
    staleTime: 60 * 60 * 1000,
  });

  const { progressMap } = useProgress();
  const levels = data?.data || [];

  // Enrichment needs the full problems array (to compute per-topic solved
  // counts). It's fetched once and cached alongside every other page that
  // needs it - by the time roadmap data has loaded, it's typically already
  // in memory from Problems/CP page visits, so this resolves near-instantly.
  const { data: allProblems } = useQuery({
    queryKey: ['all-problems-for-roadmap-enrichment'],
    queryFn: fetchAllProblems,
    staleTime: 60 * 60 * 1000,
    enabled: levels.length > 0,
  });

  const enrichedData = useMemo(() => {
    if (!levels.length || !allProblems) return levels;
    return enrichRoadmap(levels, allProblems, progressMap);
  }, [levels, allProblems, progressMap]);

  return {
    data: data ? { ...data, data: enrichedData } : data,
    isLoading: isLoading || (levels.length > 0 && !allProblems),
  };
};

export const useRoadmapLevel = (level) =>
  useQuery({
    queryKey: ['roadmap-level', level],
    queryFn: () => roadmapService.getLevelProblems(level),
    enabled: level !== undefined && level !== null,
    staleTime: 60 * 60 * 1000,
  });
