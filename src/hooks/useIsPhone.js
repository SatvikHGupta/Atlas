'use client';
// True on phone-width screens (the same 768px the CSS uses). Author: Satvik Hemant Gupta
import { useMediaQuery } from './useMediaQuery.js';

export const PHONE_QUERY = '(max-width: 768px)';

export function useIsPhone() {
  return useMediaQuery(PHONE_QUERY);
}
