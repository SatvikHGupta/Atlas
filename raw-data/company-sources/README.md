# Companies pipeline

Generates everything under `raw-data/company-problems/` (companies, patterns, index, asked-at, build-report). Deterministic:
same inputs -> byte-identical output. **Never hand-edit the generated files**; edit the inputs below and rebuild.

```
snehasishroy/leetcode-companywise-interview-questions (git clone, pinned by commit)
        │  node scripts/extract-company-pools.mjs <clone-dir>          STAGE 0  (needs the clone; output is committed)
        ▼
raw-data/company-sources/pools.json      full pool per company (+ repo-wide "breadth")
raw-data/company-sources/registry.json   which companies, display name, folders, tier, region     (edit by hand)
raw-data/company-sources/curated/<id>.json   roles, roleGuidance, dated Code360/GFG problems      (edit by hand)
raw-data/tags/tags.ndjson + tag-taxonomy.json     tags per problem (overlay, joined on canonical_id)
raw-data/oc-split/02-code-bearing-index.json      Atlas problems
        │  node scripts/build-companies.mjs                            STAGE 1  (no network, ~2 s)
        ▼
raw-data/company-problems/*   ->   npm run build:content   ->   public/data/company-problems/*
```

## Rules baked into stage 1
* **Pool** = every row of the company's `all.csv` that links to an Atlas problem (by LeetCode slug). Profiles, recency counts and
  pattern pages use the whole pool; the page lists the **top 30**.
* **Top 30 ordering (deterministic)**: all-time frequency ↓, recency window (30d < 3m < 6m < older), frequency inside that window ↓,
  breadth (companies listing the problem, repo-wide) ↓, LeetCode id ↑. Boundary ties left after key 4 are in `build-report.json`.
* **De-dupe**: a problem appears once per company; alias folders (`zeta-suite`→`zeta`, `kla-tencor`→`kla`, `machinezone`→`machine-zone`)
  are merged in stage 0. Curated extras are merged with the top list on `atlasProblemId`.
* **patternProfile.share** = frequency-weighted % of the company's tagged pool problems that carry the tag (a problem can carry many
  tags, so shares do not sum to 100). `count` = number of problems. `lift` = share ÷ the macro-average share across all companies
  (>1 means the company leans on it more than the typical company). `distinctive` needs ≥3 problems and ≥3 % share.
* **Tags**: only taxonomy `kind: lc-topic` tags are used (Atlas-only labels are excluded until the owner decides them).
* **Tier**: registry value if set (the original 29 keep theirs; EPAM and Deloitte are Tier 3 = IT services); otherwise Tier 1 if the
  linkable pool ≥ 100 problems, else Tier 2. **Region** (`India`/`Global`) is a hand classification in `registry.json`.
* **Links** are pinned to the CSV repo's data commit (see `pools.json` → `meta.dataCommit`), never `master`.
* `asked-at.json` (problem -> companies) comes from the whole pools; `build-content.mjs` uses it for the "Asked at" chips.

## Refreshing the data
```bash
git clone https://github.com/snehasishroy/leetcode-companywise-interview-questions.git ../cwiq
node scripts/extract-company-pools.mjs ../cwiq
node scripts/build-companies.mjs
npm run build:content
```
Review `raw-data/company-problems/build-report.json` (warnings, boundary ties) after every run.

## Adding a company
Add an entry to `registry.json` (`id` = folder name in the CSV repo, `folders` = that folder plus any alias folders, `region`, optional `tier`),
rerun stages 0 and 1. Its roles stay `pending` until `curated/<id>.json` exists.

## Roles (curated, not generated)
`curated/<id>.json`: `{ id, name, tier, roles: [..], rolesStatus: "template"|"pending"|"researched", roleGuidance: { "<role>": { dsaDepth, rounds[], focusPatterns[], extraTopics[] } }, extraProblems: [..] }`.
The original 29 carry `rolesStatus: "template"` (one shared block per role name - replace with researched content).
`focusPatterns` must be canonical LeetCode topic names (they link to `/patterns/<slug>`); `Graph` is not one (63 template references are dead links).
