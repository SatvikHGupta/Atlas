'use client';

import { useQuery } from '@tanstack/react-query';
import { getDsaIndex, getCpIndex } from '../services/content/dataClient.js';

export const INDEX_STALE_TIME_MS = 60 * 60 * 1000;

// Loads the full slim DSA index once
export const useDsaIndex = () =>
  useQuery({
    queryKey: ['dsa-index'],
    queryFn: getDsaIndex,
    staleTime: INDEX_STALE_TIME_MS,
  });

// The CP index is about 6 MB
export const useCpIndex = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ['cp-index'],
    queryFn: getCpIndex,
    staleTime: INDEX_STALE_TIME_MS,
    enabled,
  });
