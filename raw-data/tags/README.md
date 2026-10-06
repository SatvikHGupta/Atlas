# raw-data/tags/ - problem tags overlay

* `tags.ndjson`        one row per DSA problem, joined to the dataset by `canonical_id`. Fields: docs in the tags handoff (tags, lc_tags, atlas_topics, atlas_patterns, source, status, reviewed).
* `tag-taxonomy.json`  canonical tag names, aliases, kind (lc-topic | atlas-technique | atlas-section), usage counts.

**STATUS: INTERIM.** These two files are the unreviewed reference dry-run from the tags handoff (LeetCode topics merged from liquidslr
@ 03850eb + Atlas' old tags, 44 problems still untagged). The other Claude account replaces both files with the finished versions
(same schema, same canonical_ids). Nothing else needs to change: `scripts/build-companies.mjs` reads them by canonical_id and only
uses tags whose taxonomy `kind` is `lc-topic` for company profiles and pattern pages.
