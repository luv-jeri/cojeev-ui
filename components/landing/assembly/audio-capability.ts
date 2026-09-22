/**
 * Whether this browser can play sound, read as an external store.
 *
 * The page asks a yes/no question about the host — "is there an `AudioContext`?" —
 * not about its own state. It has three answers, and the third is why this is a
 * store rather than a `useState` in an effect:
 *
 * - `null` on the server, where the question cannot be asked at all;
 * - `true` or `false` on the client, where it can.
 *
 * Hydration therefore matches the server's `null` and settles to the real answer
 * on the next render, with no mismatch and no `setState` inside an effect. The
 * value is genuinely constant for the life of the page — a browser does not grow
 * an `AudioContext` — so `subscribe` has nothing to notify about and says so.
 */
function read(): boolean | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
  return typeof Ctor === "function";
}

export const audioCapability = {
  subscribe: () => () => {},
  get: read,
  server: () => null,
} as const;
