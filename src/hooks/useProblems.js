import { useQuery } from '@tanstack/react-query';
import { problemService } from '../services/problem.service.js';
import { useFilterStore } from '../store/filter.store.js';

export const useProblems = (overrides = {}) => {
  const topic         = useFilterStore((s) => s.filters.topic);
  const pattern       = useFilterStore((s) => s.filters.pattern);
  const difficulty    = useFilterStore((s) => s.filters.difficulty);
  const roadmap_level = useFilterStore((s) => s.filters.roadmap_level);
  const search        = useFilterStore((s) => s.filters.search);
  const sort          = useFilterStore((s) => s.filters.sort);
  const page          = useFilterStore((s) => s.filters.page);
  const limit         = useFilterStore((s) => s.filters.limit);

  const params = {};
  if (topic)                params.topic = topic;
  if (pattern)              params.pattern = pattern;
  if (difficulty !== '')    params.difficulty = difficulty;
  if (roadmap_level !== '') params.roadmap_level = roadmap_level;
  if (search?.length >= 2)  params.search = search;
  if (sort)                 params.sort = sort;
  params.page  = overrides.page  ?? page;
  params.limit = overrides.limit ?? limit;

  return useQuery({
    queryKey: ['problems', topic, pattern, difficulty, roadmap_level, search, sort, params.page, params.limit],
    queryFn:  () => problemService.getProblems(params),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
};

export const useProblem = (slug) =>
  useQuery({
    queryKey: ['problem', slug],
    queryFn:  () => problemService.getProblemBySlug(slug),
    enabled:  !!slug,
    staleTime: 10 * 60 * 1000,
  });

// useSearch removed - SearchBar uses filter store directly, this was never called
