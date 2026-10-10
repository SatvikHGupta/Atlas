// Display metadata for the DSA problems' source_platforms field
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

// The platform badge shown on a problem card
export function getPrimaryPlatform(problem) {
  const primary = pickSolvePlatform(problem.source_platforms);
  if (!primary) return null;
  return { key: primary.platform, ...getPlatformMeta(primary.platform) };
}

// The one platform entry the Solve button links
export function pickSolvePlatform(platforms) {
  if (!platforms?.length) return null;
  return platforms.find((p) => p.platform === 'leetcode' && p.url)
    || platforms.find((p) => p.url)
    || platforms.find((p) => p.platform === 'leetcode')
    || platforms[0];
}
