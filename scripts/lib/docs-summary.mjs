// The documentation runner already records `layout.error` and `preview.detail` in
// results.json, but its per-entry console line printed only their statuses. Reading a
// failure therefore meant downloading a 256 MB evidence artifact. These helpers put the
// recorded reason on the same line, for failures only, so a passing run stays as compact
// as before.

/** Console lines are read in job logs, so a single entry must not flood them. */
export const docsDetailLimit = 400;
const elision = " …elided… ";

/**
 * Keep a bounded excerpt of a failure message. The head carries the assertion, and the
 * tail carries the stage it reached — for a Playwright call log that last line is the
 * whole diagnosis — so an over-long message loses its middle rather than its end. The
 * middle is also where a resolved element's markup sits, which does not belong in a log.
 * The result never exceeds `limit`; results.json keeps the untruncated text.
 */
export function boundDetail(message, limit = docsDetailLimit) {
  const text = String(message ?? "").trim();
  if (text.length <= limit) return text;
  const keep = limit - elision.length;
  const head = Math.ceil(keep / 2);
  return text.slice(0, head) + elision + text.slice(text.length - (keep - head));
}

/**
 * The per-entry console summary. `id`, `layouts`, `preview`, `behavior` and `detail` keep
 * their existing names and meanings; `layoutFailures` and `previewDetail` are added only
 * when something actually failed.
 */
export function docsEntrySummary(record, limit = docsDetailLimit) {
  const summary = {
    id: record.id,
    layouts: record.layouts.map((l) => `${l.width}/${l.theme}:${l.status}`),
    preview: record.preview.status,
    behavior: record.behavior.status,
    detail: record.behavior.detail,
  };
  const layoutFailures = Object.fromEntries(
    record.layouts
      .filter((l) => l.error)
      .map((l) => [`${l.width}/${l.theme}`, boundDetail(l.error, limit)]),
  );
  if (Object.keys(layoutFailures).length) summary.layoutFailures = layoutFailures;
  if (record.preview.status !== "pass")
    summary.previewDetail = boundDetail(record.preview.detail, limit);
  return summary;
}
