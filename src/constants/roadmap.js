/* Roadmap levels - a curated SUBSET of NOTES_TOPICS_INDEX (52 of 64 topics), ordered by learning
   dependency and selected using real companiesSeenIn data from raw-data/company-problems/patterns/.
   Excluded on purpose (niche/CP-only/orthogonal tracks, not part of the core interview sequence):
   sqrt-decomposition, mos-algorithm, eulerian-path, lca-binary-lifting, mst, sparse-table,
   game-theory, bipartite-matching-max-flow, math-cp, misc-advanced-techniques,
   search-and-number-theory-extras, javascript-for-dsa - all still fully documented in /notes,
   just not gated behind the roadmap's unlock chain. topicSlugs match NOTES_TOPICS_INDEX slugs
   directly (not display-name strings) - see lib/roadmap.js for the matching logic. */
export const UNLOCK_THRESHOLD = 5;

export const ROADMAP_LEVELS = [
  {
    level: 0,
    title: "Foundations",
    description: "By completing this level, you'll be able to reason about time and space complexity confidently and use the basic math (palindromes, reversing, primes, GCD) that shows up in almost every problem.",
    // "loops-patterns" was removed from the roadmap: its only problems were Pattern Printing 1 and 2, which have no question link
    // anywhere (see src/constants/retiredProblems.js). Its NOTE still exists (constants/notes.js); only the roadmap topic is gone.
    // Do not re-add it unless problems are tagged for it, the build's auto-fill would otherwise pull unrelated problems from later levels.
    topicSlugs: ["time-space-complexity", "basic-math"],
  },
  {
    level: 1,
    title: "Arrays & Strings",
    description: "By completing this level, you'll be comfortable manipulating arrays, strings, and 2D grids, and using prefix sums to answer range queries efficiently.",
    topicSlugs: ["1d-arrays", "string-manipulation", "2d-arrays-matrix", "prefix-sum"],
  },
  {
    level: 2,
    title: "Array Patterns",
    description: "By completing this level, you'll recognize when to reach for two pointers, a sliding window, or Kadane's algorithm to solve array problems in linear time.",
    topicSlugs: ["two-pointers", "sliding-window", "kadane-algorithm", "matrix"],
  },
  {
    level: 3,
    title: "Hashing, Bits & Simulation",
    description: "By completing this level, you'll use hash maps and bitwise tricks to eliminate brute-force nested loops, and know how to approach step-by-step simulation problems.",
    topicSlugs: ["hashing", "bit-manipulation", "simulation"],
  },
  {
    level: 4,
    title: "Stacks & Queues",
    description: "By completing this level, you'll understand how stacks and queues - plain and monotonic - solve matching, ordering, and next-greater-element style problems.",
    topicSlugs: ["stacks", "queues", "monotonic-stack", "monotonic-queue"],
  },
  {
    level: 5,
    title: "Linked Lists & Recursion",
    description: "By completing this level, you'll manipulate linked list pointers confidently and think recursively about problems that break down into smaller subproblems.",
    topicSlugs: ["linked-lists", "fast-slow-pointers", "recursion-basics"],
  },
  {
    level: 6,
    title: "Searching & Sorting",
    description: "By completing this level, you'll apply binary search well beyond plain array lookup, and understand how the standard sorting algorithms actually work under the hood.",
    topicSlugs: ["binary-search", "binary-search-on-answer", "sorting-algorithms", "divide-conquer"],
  },
  {
    level: 7,
    title: "Greedy & Backtracking",
    description: "By completing this level, you'll recognize when a locally optimal greedy choice is provably correct, and how to explore and prune a decision tree with backtracking.",
    topicSlugs: ["greedy-algorithms", "merge-intervals", "backtracking"],
  },
  {
    level: 8,
    title: "Trees & Heaps",
    description: "By completing this level, you'll traverse and reason about binary trees, BSTs, heaps, and tries - the data structures behind most 'design a system' interview questions.",
    topicSlugs: ["binary-trees", "bst", "heaps-priority-queue", "tries"],
  },
  {
    level: 9,
    title: "Graphs I",
    description: "By completing this level, you'll traverse graphs with BFS and DFS, order dependencies with topological sort, and find shortest paths and connected components confidently.",
    topicSlugs: ["bfs-dfs", "topological-sort", "union-find-dsu", "shortest-paths"],
  },
  {
    level: 10,
    title: "Dynamic Programming I",
    description: "By completing this level, you'll define DP state correctly and solve the standard 1D and 2D dynamic programming problem shapes without guessing the recurrence.",
    topicSlugs: ["1d-dp", "2d-dp", "longest-increasing-subsequence"],
  },
  {
    level: 11,
    title: "Dynamic Programming II",
    description: "By completing this level, you'll extend dynamic programming to intervals, bitmasks, trees, and DAGs - the shapes that trip up most candidates in final-round interviews.",
    topicSlugs: ["interval-dp", "bitmask-dp", "dp-on-trees", "dp-on-graphs"],
  },
  {
    level: 12,
    title: "Advanced Structures & Graphs II",
    description: "By completing this level, you'll use segment trees, Fenwick trees, and advanced graph algorithms to answer range and connectivity queries efficiently at scale.",
    topicSlugs: ["segment-trees", "fenwick-tree-bit", "advanced-graph", "string-pattern-matching"],
  },
  {
    level: 13,
    title: "Design, Math & String Mastery",
    description: "By completing this level, you'll combine everything you've learned to design real systems, reason about combinatorics and geometry, and work confidently with advanced string algorithms.",
    topicSlugs: ["design-problems", "combinatorics", "geometry", "number-theory", "string-algorithms-part-2"],
  },
];
