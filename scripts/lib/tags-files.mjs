// Reads raw-data/tags and renders the expected tags.generated.js. Author: Satvik Hemant Gupta
import fs from 'node:fs';
import path from 'node:path';
import {
  parseNdjson,
  countTopicUse,
  renderTagsGenerated,
} from './build-logic.mjs';
import { withoutRetired } from '../../src/constants/retiredProblems.js';

// Expected text of src/constants/tags.generated.js, from tags.ndjson alone.
// Used by `--check` and by validate-content (invariant 11).
export function expectedTagsGenerated(tagsDir) {
  const taxonomy = JSON.parse(
    fs.readFileSync(path.join(tagsDir, 'tag-taxonomy.json'), 'utf8'),
  );
  const tagsFile = path.join(tagsDir, 'tags.ndjson');
  // same retired filter the build applies, otherwise the committed file (built WITHOUT them) never matches this check
  const rows = withoutRetired(parseNdjson(fs.readFileSync(tagsFile, 'utf8'), tagsFile));
  const counts = countTopicUse(rows.map((r) => ({ topics_display: r.tags })));
  return renderTagsGenerated(taxonomy, counts);
}

// Returns null when the committed file matches, else a short reason.
export function checkTagsGenerated(tagsDir, generatedFile) {
  if (!fs.existsSync(generatedFile)) return `${generatedFile} is missing`;
  const expected = expectedTagsGenerated(tagsDir);
  const actual = fs.readFileSync(generatedFile, 'utf8');
  return expected === actual
    ? null
    : `${generatedFile} is out of date, run "npm run build:content" and commit it`;
}
