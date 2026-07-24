/**
 * Ported verbatim from backend/services/notes.service.js's TOPICS_INDEX.
 * This is static structural data (topic name/slug/level), not pipeline
 * output — it belongs in the frontend as a constant, same reasoning as
 * constants/roadmap.js.
 *
 * "available" (whether a given slug has an actual note file) is NOT baked
 * in here — that's determined at build time by scanning public/data/notes/
 * with import.meta.glob (see services/content/dataClient.js).
 */
export const NOTES_TOPICS_INDEX = [
  { slug: 'time-space-complexity',          topic: 'Time & Space Complexity',         level: 0 },
  { slug: 'basic-math',                     topic: 'Basic Math for CP',               level: 0 },
  { slug: 'loops-patterns',                 topic: 'Loops & Patterns',                level: 0 },

  { slug: '1d-arrays',                      topic: '1D Arrays',                       level: 1 },
  { slug: '2d-arrays-matrix',               topic: '2D Arrays / Matrix',              level: 1 },
  { slug: 'string-manipulation',            topic: 'String Manipulation',             level: 1 },
  { slug: 'sliding-window',                 topic: 'Sliding Window',                  level: 1 },
  { slug: 'two-pointers',                   topic: 'Two Pointers',                    level: 1 },

  { slug: 'linked-lists',                   topic: 'Linked Lists',                    level: 2 },
  { slug: 'stacks',                         topic: 'Stacks',                          level: 2 },
  { slug: 'queues',                         topic: 'Queues',                          level: 2 },
  { slug: 'hashing',                        topic: 'Hashing',                         level: 2 },
  { slug: 'fast-slow-pointers',             topic: 'Fast & Slow Pointers',            level: 2 },
  { slug: 'kadane-algorithm',               topic: "Kadane's Algorithm",              level: 2 },

  { slug: 'recursion-basics',               topic: 'Recursion Basics',                level: 3 },
  { slug: 'backtracking',                   topic: 'Backtracking',                    level: 3 },
  { slug: 'sorting-algorithms',             topic: 'Sorting Algorithms',              level: 3 },
  { slug: 'binary-search',                  topic: 'Binary Search',                   level: 3 },
  { slug: 'merge-intervals',                topic: 'Merge Intervals',                 level: 3 },
  { slug: 'greedy-algorithms',              topic: 'Greedy Algorithms',               level: 3 },

  { slug: 'binary-trees',                   topic: 'Binary Trees',                    level: 4 },
  { slug: 'bst',                            topic: 'BST',                             level: 4 },
  { slug: 'heaps-priority-queue',           topic: 'Heaps / Priority Queue',          level: 4 },
  { slug: 'tries',                          topic: 'Tries',                           level: 4 },

  { slug: 'bfs-dfs',                        topic: 'BFS / DFS',                       level: 5 },
  { slug: 'topological-sort',               topic: 'Topological Sort',                level: 5 },
  { slug: 'shortest-paths',                 topic: 'Shortest Paths',                  level: 5 },
  { slug: 'mst',                            topic: 'MST',                             level: 5 },
  { slug: 'union-find-dsu',                 topic: 'Union Find / DSU',                level: 5 },
  { slug: 'binary-search-on-answer',        topic: 'Binary Search on Answer',         level: 5 },

  { slug: '1d-dp',                          topic: '1D Dynamic Programming',          level: 6 },
  { slug: '2d-dp',                          topic: '2D Dynamic Programming',          level: 6 },
  { slug: 'dp-on-trees',                    topic: 'DP on Trees',                     level: 6 },
  { slug: 'dp-on-graphs',                   topic: 'DP on Graphs',                    level: 6 },
  { slug: 'bitmask-dp',                     topic: 'Bitmask DP',                      level: 6 },
  { slug: 'interval-dp',                    topic: 'Interval DP',                     level: 6 },
  { slug: 'longest-increasing-subsequence', topic: 'Longest Increasing Subsequence',  level: 6 },

  { slug: 'segment-trees',                  topic: 'Segment Trees',                   level: 7 },
  { slug: 'fenwick-tree-bit',               topic: 'Fenwick Tree / BIT',              level: 7 },
  { slug: 'advanced-graph',                 topic: 'Advanced Graph',                  level: 7 },
  { slug: 'mos-algorithm',                  topic: "Mo's Algorithm",                  level: 7 },
  { slug: 'eulerian-path',                  topic: 'Eulerian Path',                   level: 7 },
  { slug: 'lca-binary-lifting',             topic: 'LCA & Binary Lifting',            level: 7 },
  { slug: 'sparse-table',                   topic: 'Sparse Table',                    level: 7 },

  { slug: 'bit-manipulation',               topic: 'Bit Manipulation',                level: 8 },
  { slug: 'prefix-sum',                     topic: 'Prefix Sum',                      level: 8 },
  { slug: 'monotonic-stack',                topic: 'Monotonic Stack',                 level: 8 },
  { slug: 'monotonic-queue',                topic: 'Monotonic Queue',                 level: 8 },
  { slug: 'divide-conquer',                 topic: 'Divide and Conquer',              level: 8 },
  { slug: 'number-theory',                  topic: 'Number Theory',                   level: 8 },
  { slug: 'geometry',                       topic: 'Geometry Basics',                 level: 8 },
  { slug: 'combinatorics',                  topic: 'Combinatorics',                   level: 8 },
  { slug: 'matrix',                         topic: 'Matrix Operations',               level: 8 },
  { slug: 'simulation',                     topic: 'Simulation',                      level: 8 },
  { slug: 'math-cp',                        topic: 'Math for CP',                     level: 8 },
  { slug: 'string-pattern-matching',        topic: 'String Pattern Matching',         level: 8 },
];
