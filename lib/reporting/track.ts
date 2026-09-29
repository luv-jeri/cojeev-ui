const FRAGMENT = /^#([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([0-9a-f]{64})$/i;
/** Accepts only `#<uuid>.<64 lowercase hex>`; the id may be any case, the key must be lowercase. */
export function parseTrackFragment(hash: string): { id: string; key: string } | null {
  const match = FRAGMENT.exec(hash);
  return match && /^[0-9a-f]{64}$/.test(match[2]) ? { id: match[1], key: match[2] } : null;
}
