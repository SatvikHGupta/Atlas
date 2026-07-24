// Ported verbatim from backend/models/roadmap.model.js (ROADMAP_STRUCTURE +
// UNLOCK_THRESHOLD) - this was always static structural data, not pipeline
// output, so it belongs here as a frontend constant. See
// docs/05-BUSINESS-LOGIC-MAPPING.md.
export const UNLOCK_THRESHOLD = 5;

export const ROADMAP_LEVELS = [
  { level: 0, title: 'Foundations',          description: 'Complexity analysis, basic math, and pattern problems to get comfortable.', topics: ['Time & Space Complexity', 'Basic Math for CP', 'Loops & Patterns'] },
  { level: 1, title: 'Arrays & Strings',     description: 'The building blocks of every coding interview.',                            topics: ['1D Arrays', '2D Arrays / Matrix', 'String Manipulation', 'Sliding Window', 'Two Pointer'] },
  { level: 2, title: 'Core Data Structures', description: 'Linked lists, stacks, queues, and hashing - the classics.',                 topics: ['Linked Lists', 'Stacks', 'Queues', 'Hashing'] },
  { level: 3, title: 'Recursion & Sorting',  description: 'Thinking recursively and binary search patterns.',                          topics: ['Recursion Basics', 'Backtracking', 'Sorting Algorithms', 'Binary Search'] },
  { level: 4, title: 'Trees',                description: 'Binary trees, BSTs, heaps, and tries.',                                     topics: ['Binary Trees', 'BST', 'Heaps / Priority Queue', 'Tries'] },
  { level: 5, title: 'Graphs',                description: 'BFS, DFS, shortest paths, and union-find.',                                topics: ['BFS / DFS', 'Topological Sort', 'Shortest Paths', 'MST', 'Union Find / DSU'] },
  { level: 6, title: 'Dynamic Programming',  description: 'The hardest and most rewarding topic in DSA.',                              topics: ['1D DP', '2D DP', 'DP on Trees', 'DP on Graphs', 'Bitmask DP'] },
  { level: 7, title: 'Advanced',              description: 'Competitive programming territory.',                                       topics: ['Segment Trees', 'Fenwick Tree / BIT', 'Advanced Graph', "Mo's Algorithm"] },
];
