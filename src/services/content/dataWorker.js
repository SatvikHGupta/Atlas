/**
 * Dedicated Worker: fetches a static NDJSON file and parses it off the main
 * thread. Loaded via `new Worker(new URL('./dataWorker.js', import.meta.url),
 * { type: 'module' })` from dataClient.js.
 *
 * Why this exists: problems.json (~44.5MB) / oc.json (~66.7MB) are large
 * enough that parsing them on the main thread produces a visible freeze,
 * worse on mobile CPUs (docs/07-MOBILE-CONSIDERATIONS.md). Moving the fetch
 * itself into the worker too (not just the parse) means the response body
 * read also happens off the main thread.
 *
 * NDJSON parsing is defensive line-by-line, mirroring the backend's original
 * `problem.repo.js` behavior: a single malformed line is skipped and logged,
 * it does not abort the whole file's parse.
 */

self.onmessage = async (event) => {
  const { requestId, url, kind } = event.data;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    const records = parseNdjson(text, kind);

    self.postMessage({ requestId, kind, ok: true, records, count: records.length });
  } catch (err) {
    self.postMessage({
      requestId,
      kind,
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
};

function parseNdjson(text, kind) {
  const lines = text.split('\n');
  const out = [];
  let skipped = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    try {
      out.push(JSON.parse(line));
    } catch {
      skipped++;
      // Intentionally not logging every bad line to the worker console in
      // production noise - just the summary below.
    }
  }

  if (skipped > 0) {
    console.warn(`[dataWorker] ${kind}: skipped ${skipped} malformed line(s) out of ${lines.length}`);
  }

  return out;
}
