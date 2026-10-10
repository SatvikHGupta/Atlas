export const RETIRED_PROBLEMS = [
  { canonical_id: '46374f06-a17f-454d-922d-5ac248a10278', slug: 'pattern-printing-1',                    title: 'Pattern Printing 1',                      reason: 'no-link' },
  { canonical_id: '7a3e89c3-a57c-4662-b47e-450de6308d00', slug: 'pattern-printing-2',                    title: 'Pattern Printing 2',                      reason: 'no-link' },
  { canonical_id: '09d2ff75-81c7-493a-bf52-417b0bd08c8f', slug: 'count-digits',                          title: 'Count Digits',                            reason: 'no-link' },
  { canonical_id: '881f31c4-64a2-4264-8daf-455e99fe5c58', slug: 'count-all-divisors',                    title: 'Count all Divisors',                      reason: 'no-link' },
  { canonical_id: 'd1e25543-2960-40bd-80b1-1b206c882a10', slug: 'linear-search',                         title: 'Linear Search',                           reason: 'no-link' },
  { canonical_id: 'bcd31df6-b518-434c-95b3-674c8b6d1b3d', slug: 'union-of-two-sorted-arrays',            title: 'Union of Two Sorted Arrays',              reason: 'no-link' },
  { canonical_id: '3a6c68b9-bd33-4988-835f-1370f15566f7', slug: 'check-armstrong-number',                title: 'Check Armstrong Number',                  reason: 'premium' },
  { canonical_id: 'aa944b68-da87-478f-bb21-522e1c487bf5', slug: 'longest-subarray-with-sum-k-positives', title: 'Longest Subarray with Sum K (Positives)', reason: 'premium' },
];

export const RETIRED_IDS = new Set(RETIRED_PROBLEMS.map((p) => p.canonical_id));
export const RETIRED_SLUGS = new Set(RETIRED_PROBLEMS.map((p) => p.slug));

export const isRetiredId = (id) => RETIRED_IDS.has(id);

// Drops rows that belong to a retired problem
export const withoutRetired = (rows) => rows.filter((r) => !RETIRED_IDS.has(r?.canonical_id));
