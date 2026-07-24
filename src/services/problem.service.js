/**
 * Same exported shape as before (getProblems, getProblemBySlug,
 * searchProblems), same `{ data: <payload> }` resolved-value contract that
 * every consuming hook/page already expects (mirrors the old axios
 * response-interceptor's `res.data` unwrap of the backend's `{success,
 * data}` envelope - see docs/02-FOLDER-STRUCTURE.md and
 * docs/05-BUSINESS-LOGIC-MAPPING.md).
 *
 * Internals now call lib/problems.filter.js over the in-memory array from
 * services/content/dataClient.js instead of hitting a REST API.
 */

import { getProblems as fetchAllProblems, getProblemDetail } from './content/dataClient.js';
import { findMany, search as searchProblems } from '../lib/problems.filter.js';

const wrap = (data) => ({ data });

export const problemService = {
  async getProblems(params = {}) {
    const { page, limit, sort, mode, ...filterParams } = params;
    const allProblems = await fetchAllProblems();

    const filters = { ...filterParams, mode };
    const pagination = {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      sort: sort || 'frequency',
    };

    const result = findMany(allProblems, filters, pagination);
    return wrap(result);
  },

  async getProblemBySlug(slug) {
    const allProblems = await fetchAllProblems();
    const problem = allProblems.find((p) => p.slug === slug);
    if (!problem) return wrap(null);

    const detail = await getProblemDetail(problem.canonical_id);
    return wrap(detail);
  },

  async searchProblems(q) {
    const allProblems = await fetchAllProblems();
    return wrap(searchProblems(allProblems, q, 20));
  },
};
