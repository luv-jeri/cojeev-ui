export const LAUNCH_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/** One shared publication timestamp; visits, reloads and rebuilds never start it. */
export function countdown(startedAt, now = Date.now()) {
  const start = typeof startedAt === "string" ? Date.parse(startedAt) : NaN;
  const scheduled = Number.isFinite(start);
  const remaining = scheduled
    ? Math.max(0, Math.min(LAUNCH_DURATION_MS, start + LAUNCH_DURATION_MS - now))
    : LAUNCH_DURATION_MS;
  const seconds = Math.ceil(remaining / 1000);
  return {
    state: !scheduled ? "preview" : remaining === 0 ? "elapsed" : "counting",
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
  };
}
