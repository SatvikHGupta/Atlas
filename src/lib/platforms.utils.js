/* Display metadata for the DSA problems' source_platforms field. Only 3 platforms actually appear in
   the DSA dataset right now (leetcode 97.9%, striver-a2z 2.6%, cses 0.9% - measured directly from
   content/problems/index.json), so this is deliberately small rather than covering every platform
   PLATFORMS in constants/topics.js lists app-wide (that list is judges generally, this is specifically
   what shows up for DSA problems today). Falls back to a generic badge for anything else so a future
   platform doesn't need a code change to render, just look slightly plainer until added here. */
const PLATFORM_META = {
  leetcode:    { label: 'LeetCode', color: '#FFA116' },
  'striver-a2z': { label: 'Striver A2Z', color: '#8B5CF6' },
  cses:        { label: 'CSES', color: '#3B82F6' },
  geeksforgeeks: { label: 'GeeksforGeeks', color: '#2F8D46' },
  code360:     { label: 'Code360', color: '#F97316' },
};

export function getPlatformMeta(platformKey) {
  return PLATFORM_META[platformKey] || { label: platformKey, color: '#9CA3AF' };
}

/** The platform badge shown on a problem card - prefers leetcode when present (matching the detail
    page's SolveButton logic exactly), else the first listed platform, so the badge and the actual
    "Solve" link a user clicks through to never disagree about which platform this is. */
export function getPrimaryPlatform(problem) {
  const primary = pickSolvePlatform(problem.source_platforms);
  if (!primary) return null;
  return { key: primary.platform, ...getPlatformMeta(primary.platform) };
}

/** The one platform entry the Solve button links to: LeetCode first, otherwise the first platform that has a real URL.
    A platform without a URL (the Striver A2Z placeholder rows) is skipped, so adding a link-bearing platform next to it
    makes the button work. Falls back to the first listed platform (badge only) when none has a URL. */
export function pickSolvePlatform(platforms) {
  if (!platforms?.length) return null;
  return platforms.find((p) => p.platform === 'leetcode' && p.url)
    || platforms.find((p) => p.url)
    || platforms.find((p) => p.platform === 'leetcode')
    || platforms[0];
}
